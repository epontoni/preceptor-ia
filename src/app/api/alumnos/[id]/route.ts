// src/app/api/alumnos/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const alumno = await prisma.alumno.findUnique({
      where: { id: params.id },
      include: {
        inscripciones: {
          include: { curso: true },
          orderBy: { createdAt: 'desc' },
        },
        tutores: {
          include: { tutor: true },
          orderBy: { esPrincipal: 'desc' },
        },
        documentos: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!alumno) {
      return NextResponse.json({ success: false, error: 'Estudiante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: alumno });
  } catch (error) {
    console.error('Error en GET /api/alumnos/[id]:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener datos del estudiante' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.alumno.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Estudiante no encontrado' }, { status: 404 });
    }

    // Borrar sesiones de firma vinculadas y luego el alumno (cascada a inscripciones, documentos y relación con tutor)
    await prisma.firmaSesion.deleteMany({ where: { alumnoId: params.id } });
    await prisma.alumno.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `Se eliminó el registro de inscripción de ${existing.apellido}, ${existing.nombre}.`,
    });
  } catch (error) {
    console.error('Error en DELETE /api/alumnos/[id]:', error);
    return NextResponse.json({ success: false, error: 'No se pudo eliminar el registro' }, { status: 500 });
  }
}
