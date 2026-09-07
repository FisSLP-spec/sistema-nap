const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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

// 👇 EXCEL MODIFICADO: SOLO UN FOLIO CON IMAGEN 👇
app.get('/api/reporte/excel', (req, res) => {
    const folioBuscado = req.query.folio ? req.query.folio.trim() : '';

    db.get(`SELECT * FROM constancias WHERE folio = ?`, [folioBuscado], async (err, row) => {
        if (err || !row) return res.status(404).send("Folio no encontrado para el reporte");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Constancia');

        // Agregar Imagen si existe en el servidor
        try {
            const imageId = workbook.addImage({
                filename: path.join(__dirname, 'mi_logotipo.png'),
                extension: 'png',
            });
            worksheet.addImage(imageId, 'B2:D4'); // Posición de la imagen
        } catch (e) {
            console.log("No se pudo cargar la imagen en Excel, continuando sin ella.");
        }

        // Espacio para la imagen y el título
        worksheet.getCell('B6').value = 'REPORTE DE CONSTANCIA INDIVIDUAL';
        worksheet.getCell('B6').font = { bold: true, size: 14 };

        // Estructura de la tabla de datos
        worksheet.columns = [
            { header: '', key: 'vacio', width: 5 },
            { header: 'Folio', key: 'folio', width: 15 },
            { header: 'Usuario / Nombre', key: 'usuario', width: 50 },
            { header: 'Estado / Vigencia', key: 'estado', width: 30 }
        ];

        // Añadir la fila con los datos del folio buscado
        worksheet.addRow({ folio: row.folio, usuario: row.usuario, estado: row.estado });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_${row.folio}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    });
});

// 👇 PDF MODIFICADO: SOLO UN FOLIO CON IMAGEN 👇
app.get('/api/reporte/pdf', (req, res) => {
    const folioBuscado = req.query.folio ? req.query.folio.trim() : '';

    db.get(`SELECT * FROM constancias WHERE folio = ?`, [folioBuscado], (err, row) => {
        if (err || !row) return res.status(404).send("Folio no encontrado para el reporte");

        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_${row.folio}.pdf`);
        doc.pipe(res);

        // Agregar Imagen si existe en el servidor
        try {
            doc.image(path.join(__dirname, 'mi_logotipo.png'), {
                fit: [150, 150],
                align: 'center',
                valign: 'center'
            });
            doc.moveDown(4);
        } catch (e) {
            console.log("No se pudo cargar la imagen en PDF, continuando sin ella.");
        }

        // Título e Información Estructurada del Folio
        doc.fontSize(18).font('Helvetica-Bold').text('DETALLE DE CONSTANCIA', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica-Bold').text(`Número de Folio: `, { continued: true }).font('Helvetica').text(row.folio);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`Usuario asignado: `, { continued: true }).font('Helvetica').text(row.usuario);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`Estado actual: `, { continued: true }).font('Helvetica').text(row.estado);
        
        doc.moveDown(2);
        doc.fontSize(10).fillColor('#64748b').text('Este documento es un reporte oficial generado por el sistema.', { align: 'center' });

        doc.end();
    });
});

// 4. Encender el servidor
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en el puerto ${PUERTO}`);
});
