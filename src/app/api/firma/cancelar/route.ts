// src/app/api/firma/cancelar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSessionEvent } from '@/lib/signature/session-events';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token no provisto' }, { status: 400 });
    }

    const session = await prisma.firmaSesion.findUnique({ where: { token } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (session.estado === 'completed') {
      return NextResponse.json({ success: false, error: 'No se puede cancelar una sesión ya completada' }, { status: 400 });
    }

    await prisma.firmaSesion.update({
      where: { id: session.id },
      data: { estado: 'cancelled' },
    });

    emitSessionEvent(token, { type: 'cancelled', estado: 'cancelled' });

    return NextResponse.json({ success: true, estado: 'cancelled' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
