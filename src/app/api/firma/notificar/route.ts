// src/app/api/firma/notificar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSessionEvent } from '@/lib/signature/session-events';

export async function POST(req: Request) {
  try {
    const { token, estado } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token no provisto' }, { status: 400 });
    }

    if (estado !== 'signing' && estado !== 'opened') {
      return NextResponse.json({ success: false, error: 'Estado no admitido' }, { status: 400 });
    }

    const session = await prisma.firmaSesion.findUnique({ where: { token } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (session.estado === 'completed' || session.estado === 'cancelled' || session.estado === 'expired') {
      return NextResponse.json({ success: false, error: 'La sesión ya no está activa' }, { status: 400 });
    }

    // Actualizar a signing si no estaba en signing
    if (session.estado !== estado) {
      await prisma.firmaSesion.update({
        where: { id: session.id },
        data: { estado },
      });
      emitSessionEvent(token, { type: 'status', estado });
    }

    return NextResponse.json({ success: true, estado });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
