// scripts/inspect-cus-layout.ts
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');
  const cusBytes = fs.readFileSync(path.join(assetsDir, 'CUS - FICHA MÉDICA.pdf'));
  const doc = await PDFDocument.load(cusBytes);
  const p0 = doc.getPage(0);
  const p1 = doc.getPage(1);
  console.log('P0 size:', p0.getWidth(), p0.getHeight());
  console.log('P1 size:', p1.getWidth(), p1.getHeight());

  // Inspeccionar annotations de Page 0 y Page 1
  const form = doc.getForm();
  for (const f of form.getFields()) {
    console.log('Field:', f.getName());
  }
}

main().catch(console.error);
