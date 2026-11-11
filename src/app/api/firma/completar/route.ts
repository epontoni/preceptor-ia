
// src/app/api/firma/completar/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSessionEvent } from '@/lib/signature/session-events';
import { validateStrokes } from '@/lib/signature/stroke-utils';
import { encryptBuffer, pngDataUrlToBuffer } from '@/lib/signature/crypto';

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  try {
    // 1. Control preventivo del tamaño declarado del cuerpo
    const contentLength = req.headers.get('content-length');

    if (contentLength !== null) {
      const declaredSize = Number(contentLength);

      if (!Number.isFinite(declaredSize) || declaredSize < 0) {
        return NextResponse.json(
          { success: false, error: 'Tamaño de solicitud inválido.' },
          { status: 400 }
        );
      }

      if (declaredSize > MAX_BODY_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: 'El tamaño de los datos de firma excede el límite permitido (2MB).',
          },
          { status: 413 }
        );
      }
    }

    // 2. Leer el cuerpo de la solicitud
    const bodyText = await req.text();

    // Validar tamaño real en bytes UTF-8
    const bodySize = new TextEncoder().encode(bodyText).byteLength;

    if (bodySize > MAX_BODY_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'El tamaño de los datos de firma excede el límite permitido (2MB).',
        },
        { status: 413 }
      );
    }

    // 3. Parsear JSON
    let payload: any;

    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de solicitud JSON inválido' },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { success: false, error: 'Formato de solicitud inválido.' },
        { status: 400 }
      );
    }

    const { token, strokes, pngDataUrl } = payload;

    // 4. Validar token
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token no provisto o inválido' },
        { status: 400 }
      );
    }

    // 5. Validar trazos manuscritos
    const validation = validateStrokes(strokes);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.reason || 'La firma proporcionada no es válida o está vacía.',
        },
        { status: 422 }
      );
    }

    // 6. Validar MIME, firma binaria PNG y tamaño de imagen
    let pngBuffer: Buffer;

    try {
      pngBuffer = pngDataUrlToBuffer(pngDataUrl);

      if (pngBuffer.length > MAX_BODY_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: 'La imagen de firma excede el límite permitido (2MB).',
          },
          { status: 413 }
        );
      }
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || 'Imagen de firma inválida.' },
        { status: 400 }
      );
    }

    // 7. Buscar sesión de firma
    const session = await prisma.firmaSesion.findUnique({
      where: { token },
      include: {
        documento: true,
        tutor: true,
        alumno: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesión de firma inexistente' },
        { status: 404 }
      );
    }

    // 8. Validar estado de la sesión
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

      emitSessionEvent(token, {
        type: 'expired',
        estado: 'expired',
      });

      return NextResponse.json(
        {
          success: false,
          code: 'EXPIRED',
          error: 'El tiempo límite para firmar este documento ha expirado.',
        },
        { status: 410 }
      );
    }

    // 9. Reclamar la sesión e invalidar el token para uso único.
    // updateMany permite evitar que dos solicitudes simultáneas
    // completen la misma sesión.

    const claimed = await prisma.firmaSesion.updateMany({
      where: {
        id: session.id,
        estado: {
          notIn: ['completed', 'cancelled', 'expired'],
        },
        expiresAt: {
          gt: now,
        },
      },
      data: {
        estado: 'completed',
        firmaPngEnc: encryptBuffer(pngBuffer),
        signedAt: now,
        completedAt: now,
        ipAddress:
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          session.ipAddress,
        userAgent:
          req.headers.get('user-agent')?.slice(0, 300) ||
          session.userAgent,
      },
    });

    if (claimed.count === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_COMPLETED',
          error: 'Esta sesión de firma ya fue utilizada o expiró.',
        },
        { status: 409 }
      );
    }

    // 10. Identificar al alumno asociado a la sesión
    let docsStampedCount = 0;
    let targetAlumnoId = session.alumnoId;

    if (!targetAlumnoId && session.documentoId) {
      const doc = await prisma.documento.findUnique({
        where: { id: session.documentoId },
        select: { alumnoId: true },
      });

      targetAlumnoId = doc?.alumnoId || null;
    }

    // 11. Marcar como firmados todos los documentos del alumno
    if (targetAlumnoId) {
      const res = await prisma.documento.updateMany({
        where: {
          alumnoId: targetAlumnoId,
        },
        data: {
          firmado: true,
          firmaFecha: now,
        },
      });

      docsStampedCount = res.count;

      if (!session.alumnoId) {
        await prisma.firmaSesion.update({
          where: { id: session.id },
          data: { alumnoId: targetAlumnoId },
        });
      }
    }

    const docUpdated = docsStampedCount > 0;

    // 12. Preparar vista previa de la firma
    const pngPreview = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // 13. Notificar a la PC mediante SSE
    emitSessionEvent(token, {
      type: 'completed',
      estado: 'completed',
      data: {
        pngUrl: pngPreview,
        signedAt: now.toISOString(),
        documentoId: session.documentoId,
        docUpdated,
        docsStampedCount,
        tutorNombre: session.tutor
          ? `${session.tutor.apellido}, ${session.tutor.nombre}`
          : undefined,
      },
    });

    // 14. Responder al cliente
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

    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo procesar la firma',
      },
      { status: 500 }
    );
  }
}
