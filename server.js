const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// 👇 Nuevas herramientas para reportes 👇
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors()); 
app.use(express.json());

// 1. Crear o conectar la Base de Datos
const db = new sqlite3.Database('./datos.db', (err) => {
    if (err) return console.error(err.message);
    console.log('Conectado a la base de datos SQLite.');
});

// 2. Crear la tabla de folios si no existe e insertar datos de prueba
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS constancias (
        folio TEXT PRIMARY KEY,
        usuario TEXT,
        estado TEXT
    )`);

    const stmt = db.prepare(`INSERT OR IGNORE INTO constancias (folio, usuario, estado) VALUES (?, ?, ?)`);
    
    stmt.run("53901519", "SIN ANTECEDENTES De la Rosa Mendez Eric Alejandro", "Vigencia: 07/10/2026");
    stmt.run("53901520", "SIN ANTECEDENTES Hernández Contreras Edith", "Vigencia: 07/10/2026");
    stmt.run("53901524", "SIN ANTECEDENTES Llamas Portillo Miguel Angel", "Vigencia 07/10/2026");
    stmt.run("53901525", "SIN ANTECEDENTES Pérez Hernández Sergio Fabián", "Vigencia 07/10/2026");
    stmt.run("53901531", "SIN ANTECEDENTES Rodríguez Herrera Fátima Daniela Guadalupe", "Vigencia 07/10/2026");
    stmt.run("53901532", "SIN ANTECEDENTES Rodríguez Santiago Alexander", "Vigencia 07/10/2026");
    stmt.run("53901537", "SIN ANTECEDENTES Tovar López Randy Nicolás", "Vigencia 07/10/2026");
    stmt.run("53901564", "SIN ANTECEDENTES Tovar Soto Juan Antonio", "Vigencia 07/10/2026");
    stmt.run("34300031", "SIN ANTECEDENTES Techachal Espinosa Rocío Guadalupe", "Vigencia 07/10/2026");
    stmt.run("33901215", "SIN ANTECEDENTES Sosa Guerrero José Ismael", "Vigencia 07/10/2026");
    stmt.run("53901573", "SIN ANTECEDENTES Loredo Flores Rafael", "Vigencia 07/10/2026");
    stmt.run("53901579", "SIN ANTECEDENTES Escalante Morales Juan Rafael", "Vigencia 07/10/2026");
    stmt.run("34300143", "SIN ANTECEDENTES Sandoval Treviño Leslie Guadalupe", "Vigencia 07/10/2026");
    stmt.run("34300634", "SIN ANTECEDENTES Larrañaga Chequer Patricia", "Vigencia 27/07/2026");
    stmt.run("1014", "Jorge Alberto Morales", "En Revisión");
    stmt.run("1015", "Claudia Verónica Silva", "VÁLIDO");
    stmt.run("1016", "Mauricio Javier Ortega", "VÁLIDO");

    stmt.finalize();
});

app.use(express.static(path.join(__dirname))); 

app.get('/', (req, res) => { 
    res.sendFile(path.join(__dirname, 'index.html')); 
});

// 3. Crear la ruta para verificar los folios
app.get('/api/verificar', (req, res) => {
    const folioBuscado = req.query.folio ? req.query.folio.trim() : '';

    db.get(`SELECT * FROM constancias WHERE folio = ?`, [folioBuscado], (err, row) => {
        if (err) {
            return res.status(500).json({ valido: false, html: "✗ Error en la base de datos." });
        }
        
        if (row) {
            res.json({
                valido: true,
                html: `✓ VÁLIDO<br><b>Usuario:</b> ${row.usuario}<br><b>Estado:</b> ${row.estado}`
            });
        } else {
            res.json({
                valido: false,
                html: "✗ Código incorrecto o no registrado en el sistema."
            });
        }
    });
});

// 👇 NUEVA RUTA: DESCARGAR EXCEL 👇
app.get('/api/reporte/excel', (req, res) => {
    db.all(`SELECT * FROM constancias`, [], async (err, rows) => {
        if (err) return res.status(500).send("Error al obtener datos");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Constancias');

        worksheet.columns = [
            { header: 'Folio', key: 'folio', width: 15 },
            { header: 'Usuario / Nombre', key: 'usuario', width: 50 },
            { header: 'Estado / Vigencia', key: 'estado', width: 30 }
        ];

        worksheet.addRows(rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_constancias.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    });
});

// 👇 NUEVA RUTA: DESCARGAR PDF 👇
app.get('/api/reporte/pdf', (req, res) => {
    db.all(`SELECT * FROM constancias`, [], (err, rows) => {
        if (err) return res.status(500).send("Error al obtener datos");

        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_constancias.pdf');
        doc.pipe(res);

        // Título del PDF
        doc.fontSize(20).text('REPORTE GENERAL DE CONSTANCIAS', { align: 'center' });
        doc.moveDown(2);

        // Listar los registros
        rows.forEach((row) => {
            doc.fontSize(12).font('Helvetica-Bold').text(`Folio: ${row.folio}`);
            doc.font('Helvetica').text(`Usuario: ${row.usuario}`);
            doc.text(`Estado: ${row.estado}`);
            doc.moveDown(1);
            doc.text('-----------------------------------------------------------------------');
            doc.moveDown(1);
        });

        doc.end();
    });
});

// 4. Encender el servidor
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en el puerto ${PUERTO}`);
});

