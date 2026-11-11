// scripts/generate-grids.js
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function findAssetFile(keyword) {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');
  if (!fs.existsSync(assetsDir)) return null;

  const files = fs.readdirSync(assetsDir);
  const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const file of files) {
    const normalizedFile = file.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalizedFile.includes(normalizedKeyword) && file.endsWith('.pdf')) {
      return path.join(assetsDir, file);
    }
  }
  return null;
}

async function createHighPrecisionGrid(templateKeyword, outName) {
  const templatePath = findAssetFile(templateKeyword);
  if (!templatePath || !fs.existsSync(templatePath)) {
    console.log('Template no encontrada para:', templateKeyword);
    return;
  }

  const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let pageIdx = 0; pageIdx < pdfDoc.getPageCount(); pageIdx++) {
    const page = pdfDoc.getPage(pageIdx);
    const { width, height } = page.getSize();

    // -----------------------------------------------------------------------
    // EJE X (VERTICALES)
    // -----------------------------------------------------------------------
    // 1. Líneas intermedias finas cada 10 pt
    for (let x = 0; x <= width; x += 10) {
      const isMajor = x % 50 === 0;
      if (!isMajor) {
        page.drawLine({
          start: { x, y: 0 },
          end: { x, y: height },
          thickness: 0.15,
          color: rgb(0.9, 0.2, 0.2),
          opacity: 0.22,
        });
        page.drawText(String(x), {
          x: x - 4,
          y: height - 16,
          size: 4.5,
          font,
          color: rgb(0.8, 0.2, 0.2),
          opacity: 0.7,
        });
        page.drawText(String(x), {
          x: x - 4,
          y: 6,
          size: 4.5,
          font,
          color: rgb(0.8, 0.2, 0.2),
          opacity: 0.7,
        });
      }
    }

    // 2. Líneas principales cada 50 pt
    for (let x = 0; x <= width; x += 50) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: 0.45,
        color: rgb(0.85, 0, 0),
        opacity: 0.55,
      });
      page.drawText(String(x), {
        x: x - 5,
        y: height - 10,
        size: 7,
        font: fontBold,
        color: rgb(0.85, 0, 0),
      });
      page.drawText(String(x), {
        x: x - 5,
        y: 13,
        size: 7,
        font: fontBold,
        color: rgb(0.85, 0, 0),
      });
    }

    // -----------------------------------------------------------------------
    // EJE Y (HORIZONTALES)
    // -----------------------------------------------------------------------
    // 1. Líneas intermedias finas cada 5 pt
    for (let y = 0; y <= height; y += 5) {
      const isMajor = y % 25 === 0;
      if (!isMajor) {
        const isTen = y % 10 === 0;
        page.drawLine({
          start: { x: 0, y },
          end: { x: width, y },
          thickness: isTen ? 0.2 : 0.1,
          color: rgb(0, 0.35, 0.9),
          opacity: isTen ? 0.25 : 0.15,
        });
        if (isTen) {
          page.drawText(String(y), {
            x: 1,
            y: y - 1.5,
            size: 4.5,
            font,
            color: rgb(0, 0.35, 0.9),
            opacity: 0.75,
          });
          page.drawText(String(y), {
            x: width - 16,
            y: y - 1.5,
            size: 4.5,
            font,
            color: rgb(0, 0.35, 0.9),
            opacity: 0.75,
          });
        }
      }
    }

    // 2. Líneas principales cada 25 pt
    for (let y = 0; y <= height; y += 25) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: 0.45,
        color: rgb(0, 0.3, 0.85),
        opacity: 0.55,
      });
      page.drawText(String(y), {
        x: 1,
        y: y + 1.5,
        size: 6.5,
        font: fontBold,
        color: rgb(0, 0.3, 0.85),
      });
      page.drawText(String(y), {
        x: width - 20,
        y: y + 1.5,
        size: 6.5,
        font: fontBold,
        color: rgb(0, 0.3, 0.85),
      });
    }
  }

  const outDir = path.join(process.cwd(), 'public', 'calibration-grids');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, outName), await pdfDoc.save());
  console.log('✅ Generada cuadrícula:', outName);
}

async function main() {
  console.log('📐 Generando cuadrículas de alta precisión...');
  await createHighPrecisionGrid('finscripcion', 'grid_finscripcion.pdf');
  await createHighPrecisionGrid('ISA - INFORME DE SALUD', 'grid_isa.pdf');
  await createHighPrecisionGrid('CUS - FICHA', 'grid_cus.pdf');
  await createHighPrecisionGrid('publicacion de imagenes', 'grid_aimagen.pdf');
  await createHighPrecisionGrid('Aexternos', 'grid_aexternos.pdf');
  console.log('🎉 Todas las cuadrículas han sido actualizadas en public/calibration-grids/');
}

main();
