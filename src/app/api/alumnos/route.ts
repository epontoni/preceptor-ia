// src/app/api/alumnos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TIPOS_DOCUMENTO = ['FICHA_INSCRIPCION', 'ISA', 'CUS', 'AUTORIZACION_IMAGEN'] as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const alumnos = await prisma.alumno.findMany({
      where: search
        ? {
            OR: [
              { dni: { contains: search } },
              { apellido: { contains: search, mode: 'insensitive' } },
              { nombre: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        inscripciones: {
          include: {
            curso: true,
          },
        },
        tutores: {
          include: {
            tutor: true,
          },
        },
        documentos: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { apellido: 'asc' },
    });

    return NextResponse.json({ success: true, data: alumnos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      // 1. Datos Alumno
      dni,
      nombre,
      apellido,
      fechaNacimiento,
      edad,
      genero,
      lugarNacimiento,
      nacionalidad,
      direccion,
      barrio,
      localidad,
      codigoPostal,
      departamento,
      telefono,
      email,

      // 2. Trayectoria escolar & Hermanos
      cursoId,
      escuelaProcedencia,
      anioAnterior,
      turnoAnterior,
      materiasAdeudadas,
      tieneHermanos,
      cantidadHermanos,
      cursosHermanos,

      // 3. Tutor / Urgencias
      tutorDni,
      tutorNombre,
      tutorApellido,
      tutorTelefono,
      tutorEmail,
      tutorParentesco,
      tutorOcupacion,
      tutorDomicilio,
      tutorLocalidad,
      tutorNacionalidad,

      // 4. Datos Médicos & Salud
      grupoSanguineo,
      obraSocial,
      nroAfiliado,
      alergias,
      enfermedadesCronicas,
      recibeAtencionMedica,
      tomaMedicacion,
      medicacionDetalle,
      patologias,
      planAlimentarioEspecial,
      planAlimentarioDetalle,
      usaAnteojos,
      observacionesMedicas,
      urgenciasDetalle,

      // 5. Autorizaciones
      autorizaSalidas,
      autorizaImagenes,

      // 6. Firma Digital del Tutor (opcional): token de una sesión de firma ya completada
      firmaToken,
    } = body;

    if (!dni || !nombre || !apellido || !cursoId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios (DNI, Nombre, Apellido o Curso)' },
        { status: 400 }
      );
    }

    // Recuperar la sesión de firma capturada previamente (debe estar completada y con firma cifrada)
    let firmaSesionRecord: { id: string } | null = null;
    if (firmaToken && typeof firmaToken === 'string') {
      const sesion = await prisma.firmaSesion.findUnique({ where: { token: firmaToken } });
      if (sesion && sesion.estado === 'completed' && sesion.firmaPngEnc) {
        firmaSesionRecord = { id: sesion.id };
      }
    }
    const tieneFirma = Boolean(firmaSesionRecord);

    // 1. Crear o actualizar Alumno
    const alumnoData = {
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      fechaNacimiento: new Date(fechaNacimiento || '2010-01-01'),
      genero: genero || null,
      lugarNacimiento: lugarNacimiento || null,
      nacionalidad: nacionalidad || 'Argentina',
      direccion: direccion || null,
      barrio: barrio || null,
      localidad: localidad || 'Leones',
      codigoPostal: codigoPostal || '2594',
      departamento: departamento || null,
      telefono: telefono || null,
      email: email || null,
      escuelaProcedencia: escuelaProcedencia || null,
      anioAnterior: anioAnterior || null,
      turnoAnterior: turnoAnterior || null,
      materiasAdeudadas: materiasAdeudadas || null,
      tieneHermanos: Boolean(tieneHermanos),
      cantidadHermanos: Number(cantidadHermanos) || 0,
      cursosHermanos: cursosHermanos || null,
      grupoSanguineo: grupoSanguineo || null,
      obraSocial: obraSocial || null,
      nroAfiliado: nroAfiliado || null,
      alergias: alergias || null,
      enfermedadesCronicas: enfermedadesCronicas || null,
      recibeAtencionMedica: Boolean(recibeAtencionMedica),
      tomaMedicacion: Boolean(tomaMedicacion),
      medicacionDetalle: medicacionDetalle || null,
      patologias: Array.isArray(patologias) ? patologias.join(', ') : (patologias || null),
      planAlimentarioEspecial: Boolean(planAlimentarioEspecial),
      planAlimentarioDetalle: planAlimentarioDetalle || null,
      usaAnteojos: Boolean(usaAnteojos),
      observacionesMedicas: observacionesMedicas || null,
      urgenciasDetalle: urgenciasDetalle || null,
      autorizaSalidas: autorizaSalidas !== undefined ? Boolean(autorizaSalidas) : true,
      autorizaImagenes: autorizaImagenes !== undefined ? Boolean(autorizaImagenes) : true,
    };

    const alumno = await prisma.alumno.upsert({
      where: { dni: String(dni).trim() },
      update: alumnoData,
      create: {
        dni: String(dni).trim(),
        ...alumnoData,
      },
    });

    // 2. Crear o actualizar Tutor si se proveyó
    let tutorRecord: any = null;
    if (tutorDni && tutorNombre && tutorApellido) {
      const tutor = await prisma.tutor.upsert({
        where: { dni: String(tutorDni).trim() },
        update: {
          nombre: String(tutorNombre).trim(),
          apellido: String(tutorApellido).trim(),
          telefono: tutorTelefono || '',
          email: tutorEmail || null,
          domicilio: tutorDomicilio || direccion || null,
          localidad: tutorLocalidad || localidad || 'Leones',
          nacionalidad: tutorNacionalidad || 'Argentina',
          ocupacion: tutorOcupacion || null,
        },
        create: {
          dni: String(tutorDni).trim(),
          nombre: String(tutorNombre).trim(),
          apellido: String(tutorApellido).trim(),
          telefono: tutorTelefono || '',
          email: tutorEmail || null,
          domicilio: tutorDomicilio || direccion || null,
          localidad: tutorLocalidad || localidad || 'Leones',
          nacionalidad: tutorNacionalidad || 'Argentina',
          ocupacion: tutorOcupacion || null,
        },
      });
      tutorRecord = tutor;

      await prisma.alumnoTutor.upsert({
        where: {
          alumnoId_tutorId: {
            alumnoId: alumno.id,
            tutorId: tutor.id,
          },
        },
        update: {
          parentesco: tutorParentesco || 'PADRE',
          esPrincipal: true,
        },
        create: {
          alumnoId: alumno.id,
          tutorId: tutor.id,
          parentesco: tutorParentesco || 'PADRE',
          esPrincipal: true,
          convive: true,
        },
      });
    }

    // Vincular sesión de firma previa con el alumno y tutor
    if (firmaSesionRecord) {
      try {
        await prisma.firmaSesion.update({
          where: { id: firmaSesionRecord.id },
          data: {
            alumnoId: alumno.id,
            tutorId: tutorRecord?.id || null,
          },
        });
      } catch (err) {
        console.warn('No se pudo vincular FirmaSesion:', err);
      }
    }

    // 3. Crear Inscripción en Curso
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (curso) {
      await prisma.inscripcion.upsert({
        where: {
          alumnoId_cursoId_cicloLectivo: {
            alumnoId: alumno.id,
            cursoId: curso.id,
            cicloLectivo: 2026,
          },
        },
        update: { estado: 'REGULAR' },
        create: {
          alumnoId: alumno.id,
          cursoId: curso.id,
          cicloLectivo: 2026,
          estado: 'REGULAR',
        },
      });
    }

    // 4. Registrar los 4 documentos del legajo. Los PDFs NO se guardan: se generan al vuelo
    //    desde estos campos (y la firma cifrada) cada vez que se visualizan o descargan.
    const generatedDocs = [];
    for (const tipo of TIPOS_DOCUMENTO) {
      const docRecord = await prisma.documento.upsert({
        where: { alumnoId_tipo_version: { alumnoId: alumno.id, tipo, version: 1 } },
        update: tieneFirma ? { estado: 'GENERADO', firmado: true, firmaFecha: new Date() } : { estado: 'GENERADO' },
        create: {
          alumnoId: alumno.id,
          tipo,
          estado: 'GENERADO',
          firmado: tieneFirma,
          firmaFecha: tieneFirma ? new Date() : null,
        },
      });
      generatedDocs.push(docRecord);
    }

    return NextResponse.json({
      success: true,
      message: 'Inscripción registrada. Los 4 documentos se generan al momento de descargarlos.',
      data: {
        alumno,
        documentos: generatedDocs,
      },
    });
  } catch (error: any) {
    console.error('Error en POST /api/alumnos:', error);
    return NextResponse.json({ success: false, error: 'Error al procesar la inscripción' }, { status: 500 });
  }
}
