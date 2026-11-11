// scripts/render-pdf-info.ts
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const assetsDir = path.join(process.cwd(), 'src', 'assets');
  const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.pdf'));

  for (const f of files) {
    const filePath = path.join(assetsDir, f).replace(/\\/g, '/');
    console.log(`\n========================================`);
    console.log(`FILE: ${f}`);

    try {
      // Usar PDF.js embebido de Firefox o un visor HTML simple de PDF.js
      // O abrir con browser page
      await page.goto(`file:///${filePath}`, { waitUntil: 'load', timeout: 10000 });
      await page.waitForTimeout(1000);
      const text = await page.innerText('body').catch(() => '');
      console.log('Extracted visible text lines:');
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const signatureLines = lines.filter((l) =>
        /firma|tutor|padre|madre|responsable|aclaraci[oó]n/i.test(l)
      );
      for (const l of signatureLines) {
        console.log(`  - ${l}`);
      }
    } catch (e: any) {
      console.log('Error opening in page:', e.message);
    }
  }

  await browser.close();
}

main().catch(console.error);
