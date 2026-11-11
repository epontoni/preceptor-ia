// src/app/api/alumnos/[id]/firma/route.ts
// Entrega el PNG de la firma vigente del alumno (descifrado en memoria) para copiarlo
// a la carpeta de Google Drive desde el navegador. Requiere sesión (middleware).
import { NextResponse } from 'next/server';
import { getLatestSignaturePng } from '@/lib/pdf/build-document';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const png = await getLatestSignaturePng(params.id);
    if (!png) return new NextResponse('Sin firma registrada', { status: 404 });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error al obtener firma del alumno:', error);
    return new NextResponse('Error al obtener la firma', { status: 500 });
  }
}

