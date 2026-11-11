// src/app/api/firma/status/[token]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSessionEvent } from '@/lib/signature/session-events';
import { getSignatureDataUrl } from '@/lib/signature/crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token no provisto' }, { status: 400 });
    }

    const session = await prisma.firmaSesion.findUnique({
      where: { token },
      include: {
        documento: true,
        tutor: true,
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Auto-expiración
    let estado = session.estado;
    if (estado !== 'completed' && estado !== 'cancelled' && new Date() > session.expiresAt) {
      estado = 'expired';
      if (session.estado !== 'expired') {
        await prisma.firmaSesion.update({
          where: { id: session.id },
          data: { estado: 'expired' },
        });
        emitSessionEvent(token, { type: 'expired', estado: 'expired' });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        token: session.token,
        estado,
        documentoTitulo: session.documentoTitulo,
        documentoId: session.documentoId,
        expiresAt: session.expiresAt.toISOString(),
        signedAt: session.signedAt?.toISOString() || null,
        completedAt: session.completedAt?.toISOString() || null,
        pngUrl: estado === 'completed' ? getSignatureDataUrl(session) : null,
        tutorNombre: session.tutor ? `${session.tutor.apellido}, ${session.tutor.nombre}` : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
