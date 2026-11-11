// src/app/api/firma/archivo/[token]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignaturePng } from '@/lib/signature/crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const session = await prisma.firmaSesion.findUnique({ where: { token: params.token } });

    if (!session || session.estado !== 'completed') {
      return new NextResponse('Firma no disponible o no completada', { status: 404 });
    }

    const png = getSignaturePng(session);
    if (!png) {
      return new NextResponse('Firma no disponible', { status: 404 });
    }

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Error al servir firma:', error);
    return new NextResponse('Error al obtener la firma', { status: 500 });
  }
}
