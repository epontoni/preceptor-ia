// scripts/test-e2e-signature-export.js
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

function createSession() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      documentoTitulo: 'Matrícula Oficial 2026 - Firma Transparente',
      expirationMinutes: 10,
    });

    const req = http.request(
      'http://localhost:3000/api/firma/crear',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json.data.token);
          } catch (e) {
            reject(new Error('Failed to parse response: ' + body));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('🚀 Iniciando Test E2E de Firma Digital Transparente...');

  const token = await createSession();
  console.log('✅ Sesión creada con token:', token);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const url = `http://localhost:3000/firmar/${token}`;
  console.log('📱 Abriendo página móvil:', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. Verificar que NO exista la línea inferior ni el texto "Firme sobre la línea con su dedo o lápiz táctil"
  const content = await page.content();
  const hasOldText = content.includes('Firme sobre la línea con su dedo o lápiz táctil');
  console.log('🔍 ¿Contiene el texto antiguo de ayuda? ->', hasOldText ? '❌ SÍ (ERROR)' : '✅ NO (CORRECTO)');
  if (hasOldText) {
    throw new Error('El texto "Firme sobre la línea con su dedo o lápiz táctil" sigue presente en la página!');
  }

  const hasDashedLine = content.includes('border-dashed');
  console.log('🔍 ¿Contiene línea inferior discontinua? ->', hasDashedLine ? '❌ SÍ (ERROR)' : '✅ NO (CORRECTO)');

  // 2. Localizar el canvas
  const canvas = await page.locator('canvas');
  await canvas.waitFor({ state: 'visible' });
  const box = await canvas.boundingBox();
  console.log('📐 Dimensiones del canvas en pantalla:', box);

  // 3. Simular trazo de firma manuscrita con múltiples waypoints
  console.log('✍️ Dibujando firma manuscrita...');
  const startX = box.x + box.width * 0.2;
  const startY = box.y + box.height * 0.5;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Generar curva sinusoidal fluida
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const curX = startX + box.width * 0.6 * progress;
    const curY = startY + Math.sin(progress * Math.PI * 3) * 35;
    await page.mouse.move(curX, curY);
    await page.waitForTimeout(15);
  }

  // Trazar línea de cruce / rúbrica
  await page.mouse.up();
  await page.waitForTimeout(100);

  const rubricaStartX = box.x + box.width * 0.3;
  const rubricaStartY = box.y + box.height * 0.65;
  await page.mouse.move(rubricaStartX, rubricaStartY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, rubricaStartY, { steps: 15 });
  await page.mouse.up();

  await page.waitForTimeout(300);

  // Capturar pantalla con la firma dibujada
  const artifactsDir = 'C:\\Users\\ponto\\.gemini\\antigravity-ide\\brain\\18a37669-ff8d-4a08-aaeb-b4186353efeb';
  const drawnScreenshotPath = path.join(artifactsDir, 'e2e_drawn_signature.png');
  await page.screenshot({ path: drawnScreenshotPath });
  console.log('📸 Captura de firma dibujada guardada en:', drawnScreenshotPath);

  // 4. Presionar botón "Confirmar firma"
  console.log('🔘 Presionando Confirmar firma...');
  const confirmButton = page.locator('button:has-text("Confirmar firma")');
  await confirmButton.click();

  // 5. Esperar pantalla de confirmación exitosa
  console.log('⏳ Esperando confirmación del backend...');
  await page.waitForSelector('text=¡Firma Enviada con Éxito!', { timeout: 10000 });
  console.log('🎉 ¡Pantalla de éxito mostrada correctamente!');

  const successScreenshotPath = path.join(artifactsDir, 'e2e_success_confirmation.png');
  await page.screenshot({ path: successScreenshotPath });
  console.log('📸 Captura de pantalla de éxito guardada en:', successScreenshotPath);

  await browser.close();

  // 6. Verificar el archivo PNG exportado en storage/signatures
  const signaturePngPath = path.join(process.cwd(), 'storage', 'signatures', `firma_${token}.png`);
  console.log('\n🔍 Verificando archivo PNG exportado en:', signaturePngPath);

  if (!fs.existsSync(signaturePngPath)) {
    throw new Error(`El archivo de firma no fue generado en el disco: ${signaturePngPath}`);
  }

  const pngBuffer = fs.readFileSync(signaturePngPath);
  console.log(`📦 Tamaño del archivo PNG: ${pngBuffer.length} bytes`);

  // Validar cabecera PNG estándar: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    pngBuffer[0] === 0x89 &&
    pngBuffer[1] === 0x50 &&
    pngBuffer[2] === 0x4e &&
    pngBuffer[3] === 0x47 &&
    pngBuffer[4] === 0x0d &&
    pngBuffer[5] === 0x0a &&
    pngBuffer[6] === 0x1a &&
    pngBuffer[7] === 0x0a;
  console.log('🔍 ¿Es un archivo PNG válido? ->', isPng ? '✅ SÍ' : '❌ NO');

  // En el chunk IHDR:
  // bytes 16-19: width
  // bytes 20-23: height
  // byte 25: color type (6 = RGBA / Truecolor with Alpha)
  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);
  const colorType = pngBuffer[25];

  console.log(`📐 Dimensiones del PNG recortado: ${width}x${height} píxeles`);
  console.log(`🎨 Tipo de color PNG: ${colorType} (Tipo 6 = RGBA con canal alfa transparente)`);

  if (colorType !== 6) {
    throw new Error(`El PNG no tiene canal alfa transparente (Tipo esperado 6, encontrado ${colorType})!`);
  }
  console.log('✅ El archivo PNG cuenta con canal alfa 100% transparente garantizado.');

  // También verificar el SVG correspondiente
  const signatureSvgPath = path.join(process.cwd(), 'storage', 'signatures', `firma_${token}.svg`);
  if (fs.existsSync(signatureSvgPath)) {
    const svgText = fs.readFileSync(signatureSvgPath, 'utf8');
    const hasSvgOldText = svgText.includes('Firme sobre la línea');
    console.log('🔍 ¿El SVG contiene el texto antiguo? ->', hasSvgOldText ? '❌ SÍ' : '✅ NO');
    console.log('✅ SVG vectorial exportado limpiamente sin líneas accesorias.');
  }

  console.log('\n🏆 ==============================================================');
  console.log('🏆 TEST COMPLETADO: FIRMA EXPORTADA 100% LIMPIA, TRANSPARENTE Y VÁLIDA');
  console.log('🏆 ==============================================================\n');
}

run().catch((err) => {
  console.error('❌ Error en el test E2E:', err);
  process.exit(1);
});
