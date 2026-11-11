// src/app/api/firma/sesion/[token]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSessionEvent } from '@/lib/signature/session-events';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token no provisto' }, { status: 400 });
    }

    const session = await prisma.firmaSesion.findUnique({
      where: { token },
      include: {
        alumno: true,
        tutor: true,
        documento: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_TOKEN',
          error: 'El enlace de firma no es válido o no existe.',
        },
        { status: 404 }
      );
    }

    // 1. Validar si ya fue completada (Uso único)
    if (session.estado === 'completed') {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_COMPLETED',
          error: 'Esta sesión de firma ya fue utilizada.',
          completedAt: session.completedAt,
        },
        { status: 409 }
      );
    }

    // 2. Validar si fue cancelada
    if (session.estado === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          code: 'CANCELLED',
          error: 'Esta sesión de firma fue cancelada desde la PC.',
        },
        { status: 410 }
      );
    }

    // 3. Validar si expiró
    const isExpired = session.estado === 'expired' || new Date() > session.expiresAt;
    if (isExpired) {
      if (session.estado !== 'expired') {
        await prisma.firmaSesion.update({
          where: { id: session.id },
          data: { estado: 'expired' },
        });
        emitSessionEvent(token, { type: 'expired', estado: 'expired' });
      }
      return NextResponse.json(
        {
          success: false,
          code: 'EXPIRED',
          error: 'Este código QR y sesión de firma han expirado.',
        },
        { status: 410 }
      );
    }

    // 4. Si estaba pendiente, transicionar a "opened" y registrar auditoría
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Desconocido';

    let estadoActual = session.estado;
    if (session.estado === 'pending') {
      estadoActual = 'opened';
      await prisma.firmaSesion.update({
        where: { id: session.id },
        data: {
          estado: 'opened',
          openedAt: new Date(),
          ipAddress: ip,
          userAgent: userAgent.slice(0, 255),
        },
      });

      // Notificar a la PC vía SSE que el teléfono acaba de abrir el enlace
      emitSessionEvent(token, { type: 'status', estado: 'opened' });
    }

    return NextResponse.json({
      success: true,
      data: {
        token: session.token,
        estado: estadoActual,
        documentoTitulo: session.documentoTitulo,
        tipoDocumento: session.tipoDocumento,
        expiresAt: session.expiresAt.toISOString(),
        alumno: session.alumno ? { nombre: session.alumno.nombre, apellido: session.alumno.apellido, dni: session.alumno.dni } : null,
        tutor: session.tutor ? { nombre: session.tutor.nombre, apellido: session.tutor.apellido, dni: session.tutor.dni } : null,
      },
    });
  } catch (error: any) {
    console.error('Error al consultar sesión de firma:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
