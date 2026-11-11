// scripts/inspect-cus-and-aexternos.ts
import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFName, PDFDict, PDFStream } from 'pdf-lib';

async function main() {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');

  // CUS
  const cusBytes = fs.readFileSync(path.join(assetsDir, 'CUS - FICHA MÉDICA.pdf'));
  const cusDoc = await PDFDocument.load(cusBytes);
  console.log('CUS page count:', cusDoc.getPageCount());

  // Inspeccionar coordenadas en pdf-coordinates.ts existentes
  const { PDF_COORDINATES } = await import('../src/lib/pdf/pdf-coordinates');
  console.log('PDF_COORDINATES CUS:', PDF_COORDINATES.CUS);
  console.log('PDF_COORDINATES AUTORIZACION_EXTERNOS:', PDF_COORDINATES.AUTORIZACION_EXTERNOS);
}

main().catch(console.error);
