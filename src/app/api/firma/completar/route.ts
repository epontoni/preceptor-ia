// src/app/api/firma/completar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSessionEvent } from '@/lib/signature/session-events';
import { validateStrokes } from '@/lib/signature/stroke-utils';
import { encryptBuffer, pngDataUrlToBuffer } from '@/lib/signature/crypto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();

    // 1. Limitar tamaño estricto del cuerpo para seguridad (máx 2MB)
    if (bodyText.length > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'El tamaño de los datos de firma excede el límite permitido (2MB).' },
        { status: 413 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ success: false, error: 'Cuerpo de solicitud JSON inválido' }, { status: 400 });
    }

    const { token, strokes, pngDataUrl } = payload;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Token no provisto o inválido' }, { status: 400 });
    }

    // 2. Validar que la firma no esté vacía y contenga trazos manuscritos válidos
    const validation = validateStrokes(strokes);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.reason || 'La firma proporcionada no es válida o está vacía.' },
        { status: 422 }
      );
    }

    // 3. Validar MIME, firma binaria PNG y tamaño de la imagen
    let pngBuffer: Buffer;
    try {
      pngBuffer = pngDataUrlToBuffer(pngDataUrl);
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }

    // 4. Buscar sesión en la base de datos
    const session = await prisma.firmaSesion.findUnique({
      where: { token },
      include: {
        documento: true,
        tutor: true,
        alumno: true,
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesión de firma inexistente' }, { status: 404 });
    }

    // 5. Validar uso único y estado
    if (session.estado === 'completed') {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_COMPLETED',
          error: 'Esta sesión de firma ya fue utilizada.',
        },
        { status: 409 }
      );
    }

    if (session.estado === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          code: 'CANCELLED',
          error: 'La sesión fue cancelada por el usuario desde la computadora.',
        },
        { status: 410 }
      );
    }

    const now = new Date();
    if (session.estado === 'expired' || now > session.expiresAt) {
      await prisma.firmaSesion.update({
        where: { id: session.id },
        data: { estado: 'expired' },
      });
      emitSessionEvent(token, { type: 'expired', estado: 'expired' });
      return NextResponse.json(
        {
          success: false,
          code: 'EXPIRED',
          error: 'El tiempo límite para firmar este documento ha expirado.',
        },
        { status: 410 }
      );
    }

    // 6. Invalidar el token (uso único) y guardar la firma CIFRADA (AES-256-GCM) en la base de datos.
    //    La condición estado != completed evita que dos envíos simultáneos usen el mismo token.
    const claimed = await prisma.firmaSesion.updateMany({
      where: { id: session.id, estado: { notIn: ['completed', 'cancelled', 'expired'] } },
      data: {
        estado: 'completed',
        firmaPngEnc: encryptBuffer(pngBuffer),
        signedAt: now,
        completedAt: now,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || session.ipAddress,
        userAgent: req.headers.get('user-agent')?.slice(0, 300) || session.userAgent,
      },
    });
    if (claimed.count === 0) {
      return NextResponse.json(
        { success: false, code: 'ALREADY_COMPLETED', error: 'Esta sesión de firma ya fue utilizada.' },
        { status: 409 }
      );
    }

    // 7. Marcar como firmados TODOS los documentos del alumno (los PDFs se generan al vuelo con la firma)
    let docsStampedCount = 0;
    let targetAlumnoId = session.alumnoId;
    if (!targetAlumnoId && session.documentoId) {
      const doc = await prisma.documento.findUnique({
        where: { id: session.documentoId },
        select: { alumnoId: true },
      });
      targetAlumnoId = doc?.alumnoId || null;
    }
    if (targetAlumnoId) {
      const res = await prisma.documento.updateMany({
        where: { alumnoId: targetAlumnoId },
        data: { firmado: true, firmaFecha: now },
      });
      docsStampedCount = res.count;
      if (!session.alumnoId) {
        await prisma.firmaSesion.update({ where: { id: session.id }, data: { alumnoId: targetAlumnoId } });
      }
    }
    const docUpdated = docsStampedCount > 0;
    const pngPreview = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // 9. Notificar inmediatamente a la PC a través de SSE
    emitSessionEvent(token, {
      type: 'completed',
      estado: 'completed',
      data: {
        pngUrl: pngPreview,
        signedAt: now.toISOString(),
        documentoId: session.documentoId,
        docUpdated,
        docsStampedCount,
        tutorNombre: session.tutor ? `${session.tutor.apellido}, ${session.tutor.nombre}` : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Firma recibida y registrada correctamente.',
      data: {
        token: session.token,
        estado: 'completed',
        completedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error al procesar la firma:', error);
    return NextResponse.json({ success: false, error: 'No se pudo procesar la firma' }, { status: 500 });
  }
}
