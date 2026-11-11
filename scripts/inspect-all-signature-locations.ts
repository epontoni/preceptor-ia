// scripts/inspect-all-signature-locations.ts
import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';

async function main() {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');

  // 1. ISA
  const isaBytes = fs.readFileSync(path.join(assetsDir, 'ISA - INFORME DE SALUD ANUAL.pdf'));
  const isaDoc = await PDFDocument.load(isaBytes);
  const isaForm = isaDoc.getForm();
  const isaF1 = isaForm.getTextField('tutorNombreApellido');
  const isaF2 = isaForm.getTextField('tutorDni');

  console.log('--- ISA ---');
  for (let p = 0; p < isaDoc.getPageCount(); p++) {
    const page = isaDoc.getPage(p);
    const annots = page.node.get(PDFName.of('Annots'));
    console.log(`ISA Page ${p}: hasAnnots =`, !!annots);
    if (annots) {
      console.log(`ISA Page ${p} annots count =`, (annots as any).size());
    }
  }

  // 2. Aexternos
  console.log('\n--- Aexternos ---');
  const aextBytes = fs.readFileSync(path.join(assetsDir, 'Aexternos.pdf'));
  const aextDoc = await PDFDocument.load(aextBytes);
  console.log('Aexternos pages:', aextDoc.getPageCount());

  // 3. CUS
  console.log('\n--- CUS ---');
  const cusBytes = fs.readFileSync(path.join(assetsDir, 'CUS - FICHA MÉDICA.pdf'));
  const cusDoc = await PDFDocument.load(cusBytes);
  console.log('CUS pages:', cusDoc.getPageCount());
  for (let p = 0; p < cusDoc.getPageCount(); p++) {
    const page = cusDoc.getPage(p);
    const annots = page.node.get(PDFName.of('Annots'));
    console.log(`CUS Page ${p}: hasAnnots =`, !!annots);
  }
}

main().catch(console.error);
