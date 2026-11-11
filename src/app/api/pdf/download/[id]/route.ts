// src/app/api/pdf/download/[id]/route.ts
import { NextResponse } from 'next/server';
import { buildDocumentoPdf } from '@/lib/pdf/build-document';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await buildDocumentoPdf(params.id);
    if (!result) {
      return new NextResponse('Documento no encontrado', { status: 404 });
    }

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${result.fileName}"`,
        // Datos personales y de salud de menores: nunca cachear en navegadores ni proxies
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Error al generar PDF:', error);
    return new NextResponse('Error al generar el documento', { status: 500 });
  }
}
