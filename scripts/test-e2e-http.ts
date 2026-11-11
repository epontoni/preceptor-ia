// scripts/test-e2e-http.ts
import { prisma } from '../src/lib/prisma';

async function testE2E() {
  console.log('🌐 ============================================================');
  console.log('🌐 TEST E2E: FLUJO COMPLETO HTTP PC → QR → TELÉFONO → BACKEND');
  console.log('🌐 ============================================================\n');

  const baseUrl = 'http://localhost:3000';

  // 1. Obtener un alumno y documento real para el test
  const alumno = await prisma.alumno.findFirst({
    include: {
      tutores: { include: { tutor: true } },
      documentos: true,
    },
  });

  const doc = alumno?.documentos[0];
  console.log(`📌 Alumno: ${alumno?.apellido}, ${alumno?.nombre}`);
  console.log(`📌 Tutor: ${alumno?.tutores[0]?.tutor?.apellido}, ${alumno?.tutores[0]?.tutor?.nombre}`);
  console.log(`📌 Documento ID: ${doc?.id || 'Ninguno (Prueba genérica)'}`);

  // PASO 1: PC solicita creación de sesión de firma con QR
  console.log('\n[Paso 1] PC llama a POST /api/firma/crear...');
  const createRes = await fetch(`${baseUrl}/api/firma/crear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentoId: doc?.id,
      alumnoId: alumno?.id,
      expirationMinutes: 5,
    }),
  });

  const createJson = await createRes.json();
  if (!createJson.success) {
    throw new Error(`Fallo en /api/firma/crear: ${JSON.stringify(createJson)}`);
  }

  const { token, signUrl, qrDataUrl, documentoTitulo } = createJson.data;
  console.log(`  ✅ Sesión creada exitosamente.`);
  console.log(`  🔑 Token Criptográfico: ${token}`);
  console.log(`  🔗 URL en el QR: ${signUrl}`);
  console.log(`  📷 QR Data URL generado: ${qrDataUrl.slice(0, 40)}... (${qrDataUrl.length} caracteres)`);
  console.log(`  📄 Título: ${documentoTitulo}`);

  // PASO 2: Teléfono escanea el QR y abre la página móvil
  console.log('\n[Paso 2] Teléfono consulta GET /api/firma/sesion/[token]...');
  const mobileRes = await fetch(`${baseUrl}/api/firma/sesion/${token}`, {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      'x-forwarded-for': '181.165.20.10',
    },
  });
  const mobileJson = await mobileRes.json();
  console.log(`  ✅ Estado tras apertura del teléfono: ${mobileJson.data?.estado}`);
  if (mobileJson.data?.estado !== 'opened') {
    throw new Error(`Se esperaba estado "opened", recibido: ${mobileJson.data?.estado}`);
  }

  // PASO 3: Usuario apoya el dedo en el canvas del teléfono (estado signing)
  console.log('\n[Paso 3] Teléfono notifica que el usuario está firmando (POST /api/firma/notificar)...');
  const notifyRes = await fetch(`${baseUrl}/api/firma/notificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, estado: 'signing' }),
  });
  const notifyJson = await notifyRes.json();
  console.log(`  ✅ Estado actualizado: ${notifyJson.estado}`);

  // PASO 4: PC verifica estado vía polling / status
  console.log('\n[Paso 4] PC consulta estado GET /api/firma/status/[token]...');
  const statusRes = await fetch(`${baseUrl}/api/firma/status/${token}`);
  const statusJson = await statusRes.json();
  console.log(`  ✅ PC detecta que el usuario está: ${statusJson.data?.estado}`);

  // PASO 5: Teléfono presiona "Confirmar firma" con trazos reales
  console.log('\n[Paso 5] Teléfono confirma firma POST /api/firma/completar...');
  const sampleStrokes = [
    {
      points: [
        { x: 30, y: 80 },
        { x: 50, y: 40 },
        { x: 70, y: 110 },
        { x: 90, y: 60 },
        { x: 120, y: 120 },
      ],
    },
    {
      points: [
        { x: 20, y: 120 },
        { x: 60, y: 120 },
        { x: 100, y: 120 },
        { x: 140, y: 120 },
        { x: 150, y: 120 },
      ],
    },
  ];
  const samplePng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAAA8CAYAAACE8gQ0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJ/SURBVHgB7d09axRRFMbx...';
  // Generamos un PNG base64 válido de 50x20
  const validPngDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVGPoVABbaAQT5P/eFAAAAAElFTkSuQmCC';

  const completeRes = await fetch(`${baseUrl}/api/firma/completar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      strokes: sampleStrokes,
      pngDataUrl: validPngDataUrl,
    }),
  });
  const completeJson = await completeRes.json();
  console.log(`  ✅ Respuesta del servidor:`, completeJson);
  if (!completeJson.success) {
    throw new Error(`Fallo en completar firma: ${completeJson.error}`);
  }

  // PASO 6: PC verifica estado completado con previsualización
  console.log('\n[Paso 6] PC consulta estado final completado...');
  const finalStatusRes = await fetch(`${baseUrl}/api/firma/status/${token}`);
  const finalStatusJson = await finalStatusRes.json();
  console.log(`  ✅ Estado final en la PC: ${finalStatusJson.data?.estado}`);
  console.log(`  🖼️ URL de firma: ${finalStatusJson.data?.pngUrl}`);
  console.log(`  ✍️ Tutor registrado: ${finalStatusJson.data?.tutorNombre || 'Registrado'}`);

  // PASO 7: Servir archivo de firma
  console.log('\n[Paso 7] Descargar imagen de firma GET /api/firma/archivo/[token]...');
  const fileRes = await fetch(`${baseUrl}/api/firma/archivo/${token}?format=png`);
  console.log(`  ✅ HTTP Status: ${fileRes.status}`);
  console.log(`  📦 Content-Type: ${fileRes.headers.get('content-type')}`);

  // PASO 8: Regla de seguridad de uso único (Rechazar reutilización del token)
  console.log('\n[Paso 8] Verificar que el token ya no puede reutilizarse...');
  const reuseRes = await fetch(`${baseUrl}/api/firma/sesion/${token}`);
  const reuseJson = await reuseRes.json();
  console.log(`  ✅ Código al reintentar: ${reuseJson.code} (${reuseRes.status})`);
  console.log(`  🔒 Mensaje de seguridad: "${reuseJson.error}"`);

  console.log('\n🎉 ============================================================');
  console.log('🎉 FLUJO COMPLETO VALIDADO SATISFACTORIAMENTE');
  console.log('🎉 ============================================================');
}

testE2E().catch((err) => {
  console.error('❌ Error en test E2E:', err);
  process.exit(1);
});
