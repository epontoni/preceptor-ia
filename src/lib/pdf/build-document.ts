// src/lib/pdf/build-document.ts
// Genera los PDFs al vuelo a partir de los campos del legajo en la base de datos
// (y la firma cifrada, si existe). No se guardan archivos en disco ni en la base.
import { prisma } from '@/lib/prisma';
import { generarDocumentoPdf, AlumnoPdfData } from '@/lib/pdf/generator';
import { getSignaturePng } from '@/lib/signature/crypto';

export type TipoDocumento = Parameters<typeof generarDocumentoPdf>[0];

/** Última firma completada de un alumno (PNG descifrado) o null. */
export async function getLatestSignaturePng(alumnoId: string): Promise<Buffer | null> {
  const session = await prisma.firmaSesion.findFirst({
    where: { alumnoId, estado: 'completed', firmaPngEnc: { not: null } },
    orderBy: { completedAt: 'desc' },
    select: { firmaPngEnc: true },
  });
  return getSignaturePng(session);
}

export async function buildAlumnoPdfData(alumnoId: string, firma?: Buffer | null): Promise<AlumnoPdfData | null> {
  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoId },
    include: {
      inscripciones: { include: { curso: true }, orderBy: { createdAt: 'desc' } },
      tutores: { include: { tutor: true }, orderBy: { esPrincipal: 'desc' } },
    },
  });
  if (!alumno) return null;

  const tutorRel = alumno.tutores[0];
  const tutor = tutorRel?.tutor;
  const curso = alumno.inscripciones[0]?.curso;
  const birth = new Date(alumno.fechaNacimiento);
  const edad = Math.abs(new Date(Date.now() - birth.getTime()).getUTCFullYear() - 1970);

  return {
    id: alumno.id,
    dni: alumno.dni,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    fechaNacimiento: birth.toLocaleDateString('es-AR'),
    edad,
    genero: alumno.genero || undefined,
    lugarNacimiento: alumno.lugarNacimiento || undefined,
    nacionalidad: alumno.nacionalidad || undefined,
    direccion: alumno.direccion || undefined,
    barrio: alumno.barrio || undefined,
    localidad: alumno.localidad || undefined,
    codigoPostal: alumno.codigoPostal || undefined,
    departamento: alumno.departamento || undefined,
    telefono: alumno.telefono || undefined,
    email: alumno.email || undefined,
    curso: curso?.nombre || 'Sin curso',
    turno: curso?.turno || 'Mañana',
    escuelaProcedencia: alumno.escuelaProcedencia || undefined,
    anioAnterior: alumno.anioAnterior || undefined,
    turnoAnterior: alumno.turnoAnterior || undefined,
    materiasAdeudadas: alumno.materiasAdeudadas || undefined,
    tieneHermanos: alumno.tieneHermanos,
    cantidadHermanos: alumno.cantidadHermanos || undefined,
    cursosHermanos: alumno.cursosHermanos || undefined,
    tutorNombre: tutor?.nombre,
    tutorApellido: tutor?.apellido,
    tutorDni: tutor?.dni,
    tutorTelefono: tutor?.telefono,
    tutorEmail: tutor?.email || undefined,
    tutorParentesco: tutorRel?.parentesco,
    tutorOcupacion: tutor?.ocupacion || undefined,
    tutorDomicilio: tutor?.domicilio || alumno.direccion || undefined,
    tutorLocalidad: tutor?.localidad || alumno.localidad || undefined,
    tutorNacionalidad: tutor?.nacionalidad || undefined,
    grupoSanguineo: alumno.grupoSanguineo || undefined,
    obraSocial: alumno.obraSocial || undefined,
    nroAfiliado: alumno.nroAfiliado || undefined,
    alergias: alumno.alergias || undefined,
    enfermedadesCronicas: alumno.enfermedadesCronicas || undefined,
    recibeAtencionMedica: alumno.recibeAtencionMedica,
    tomaMedicacion: alumno.tomaMedicacion,
    medicacionDetalle: alumno.medicacionDetalle || undefined,
    patologias: alumno.patologias || undefined,
    planAlimentarioEspecial: alumno.planAlimentarioEspecial,
    planAlimentarioDetalle: alumno.planAlimentarioDetalle || undefined,
    usaAnteojos: alumno.usaAnteojos,
    observacionesMedicas: alumno.observacionesMedicas || undefined,
    urgenciasDetalle: alumno.urgenciasDetalle || undefined,
    autorizaSalidas: alumno.autorizaSalidas,
    autorizaImagenes: alumno.autorizaImagenes,
    firmaTutorPng: firma || undefined,
  };
}

/** Genera el PDF de un documento del legajo (con la firma si el documento está firmado). */
export async function buildDocumentoPdf(
  documentoId: string
): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const doc = await prisma.documento.findUnique({
    where: { id: documentoId },
    select: { alumnoId: true, tipo: true, firmado: true },
  });
  if (!doc) return null;

  const firma = doc.firmado ? await getLatestSignaturePng(doc.alumnoId) : null;
  const data = await buildAlumnoPdfData(doc.alumnoId, firma);
  if (!data) return null;

  return generarDocumentoPdf(doc.tipo as TipoDocumento, data);
}

