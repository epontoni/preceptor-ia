// src/app/api/cursos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cursos = await prisma.curso.findMany({
      orderBy: [{ anio: 'asc' }, { division: 'asc' }],
    });
    return NextResponse.json({ success: true, data: cursos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'No se pudieron cargar los cursos' }, { status: 500 });
  }
}
