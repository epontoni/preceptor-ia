// scripts/inspect-templates.ts
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');
  const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.pdf'));

  for (const f of files) {
    const bytes = fs.readFileSync(path.join(assetsDir, f));
    const doc = await PDFDocument.load(bytes);
    console.log(`\n========================================`);
    console.log(`FILE: ${f}`);
    console.log(`Pages: ${doc.getPageCount()}`);
    for (let i = 0; i < doc.getPageCount(); i++) {
      const page = doc.getPage(i);
      console.log(`  Page ${i}: width=${page.getWidth()}, height=${page.getHeight()}`);
    }
    const form = doc.getForm();
    const fields = form.getFields().map((field) => {
      const name = field.getName();
      let widgetsCount = 0;
      try {
        widgetsCount = (field as any).acroField.getWidgets().length;
      } catch {}
      return `${name} (${field.constructor.name}, widgets=${widgetsCount})`;
    });
    console.log(`Fields (${fields.length}):\n `, fields.join('\n  '));
  }
}

main().catch(console.error);
