// scripts/inspect-widgets.ts
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
    const form = doc.getForm();
    const fields = form.getFields();

    for (const field of fields) {
      const name = field.getName();
      try {
        const widgets = (field as any).acroField.getWidgets();
        for (let i = 0; i < widgets.length; i++) {
          const w = widgets[i];
          const rect = w.getRectangle();
          // Obtener página a la que pertenece el widget
          const pRef = w.P();
          let pageIndex = -1;
          for (let p = 0; p < doc.getPageCount(); p++) {
            if (doc.getPage(p).ref === pRef) {
              pageIndex = p;
              break;
            }
          }
          console.log(`  Field "${name}" [widget ${i}] on page ${pageIndex}: x=${rect.x.toFixed(1)}, y=${rect.y.toFixed(1)}, w=${rect.width.toFixed(1)}, h=${rect.height.toFixed(1)}`);
        }
      } catch (e: any) {
        console.log(`  Field "${name}": ${e.message}`);
      }
    }
  }
}

main().catch(console.error);
