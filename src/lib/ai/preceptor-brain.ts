// src/lib/ai/preceptor-brain.ts
import { prisma } from '../prisma';

export interface AiQueryResult {
  answer: string;
  type: 'TABLE' | 'SUMMARY' | 'ALERT' | 'CERTIFICATE' | 'LIST';
  data?: any;
  suggestions?: string[];
}

export async function processPreceptorQuery(prompt: string): Promise<AiQueryResult> {
  const query = prompt.toLowerCase().trim();

  // 1. Consulta: Documentación pendiente / faltante
  if (query.includes('falta') || query.includes('pendiente') || query.includes('incompleto') || query.includes('sin cus') || query.includes('sin isa')) {
    const pendientes = await prisma.documento.findMany({
      where: {
        firmado: false,
      },
      include: {
        alumno: {
          include: {
            inscripciones: { include: { curso: true } },
            tutores: { include: { tutor: true } },
          },
        },
      },
    });

    const totalAlumnos = await prisma.alumno.count();
    const pendientesCount = pendientes.length;

    const items = pendientes.map((doc) => {
      const curso = doc.alumno.inscripciones[0]?.curso?.nombre || 'Sin Curso';
      const tutor = doc.alumno.tutores[0]?.tutor;
      return {
        dni: doc.alumno.dni,
        estudiante: `${doc.alumno.apellido}, ${doc.alumno.nombre}`,
        curso,
        documento: doc.tipo,
        estadoFirma: doc.firmado ? 'FIRMADO' : 'PENDIENTE',
        tutorContacto: tutor ? `${tutor.apellido}, ${tutor.nombre} (${tutor.telefono})` : 'Sin tutor asignado',
      };
    });

    return {
      answer: `Se detectaron **${pendientesCount} documentos pendientes de firma** sobre un total de ${totalAlumnos} alumnos registrados.`,
      type: 'TABLE',
      data: items,
      suggestions: [
        'Ver solo alumnos sin CUS médico',
        'Exportar planilla de contactos de tutores',
      ],
    };
  }

  // 2. Consulta: Buscar datos de un alumno / tutor específico
  const dniMatch = query.match(/\b\d{7,8}\b/);
  if (dniMatch || query.includes('alumno') || query.includes('tutor') || query.includes('contacto')) {
    const searchDni = dniMatch ? dniMatch[0] : '';
    const alumno = await prisma.alumno.findFirst({
      where: searchDni
        ? { dni: searchDni }
        : {
            OR: [
              { apellido: { contains: query.replace(/alumno|tutor|contacto|de|el/g, '').trim() } },
              { nombre: { contains: query.replace(/alumno|tutor|contacto|de|el/g, '').trim() } },
            ],
          },
      include: {
        inscripciones: { include: { curso: true } },
        tutores: { include: { tutor: true } },
        documentos: true,
      },
    });

    if (alumno) {
      const curso = alumno.inscripciones[0]?.curso?.nombre || 'Sin asignar';
      const tutor = alumno.tutores[0]?.tutor;
      return {
        answer: `**Ficha de ${alumno.apellido}, ${alumno.nombre} (DNI ${alumno.dni})**:\n- **Curso:** ${curso}\n- **Tutor:** ${tutor ? `${tutor.apellido}, ${tutor.nombre}` : 'No asignado'}\n- **Teléfono Urgencias:** ${tutor?.telefono || alumno.telefono || 'Sin teléfono'}\n- **Obra Social / Grupo:** ${alumno.obraSocial || 'Ninguna'} (${alumno.grupoSanguineo || 'S/D'})\n- **Documentos:** ${alumno.documentos.map((d) => `${d.tipo}: ${d.firmado ? 'firmado' : 'pendiente de firma'}`).join(' | ')}`,
        type: 'SUMMARY',
        data: alumno,
        suggestions: [
          `Generar Certificado de Escolaridad para ${alumno.nombre}`,
          `Descargar Ficha de Inscripción en PDF`,
        ],
      };
    }
  }

  // 3. Consulta: Listado de asistencia / Cursos
  if (query.includes('asistencia') || query.includes('curso') || query.includes('lista')) {
    const cursos = await prisma.curso.findMany({
      include: {
        inscripciones: {
          include: {
            alumno: true,
          },
        },
      },
    });

    return {
      answer: `Planilla de distribución de cursos y matrículas activas (${cursos.length} divisiones):`,
      type: 'LIST',
      data: cursos.map((c) => ({
        curso: c.nombre,
        turno: c.turno,
        matriculados: c.inscripciones.length,
        alumnos: c.inscripciones.map((i) => `${i.alumno.apellido}, ${i.alumno.nombre} (${i.alumno.dni})`),
      })),
      suggestions: [
        'Generar planilla de firmas de asistencia para imprimir',
        'Ver alumnos con falta de CUS en 1° A',
      ],
    };
  }

  // 4. Consulta General / Estadísticas por defecto
  const totalAlumnos = await prisma.alumno.count();
  const totalDocs = await prisma.documento.count();
  const docsFirmados = await prisma.documento.count({ where: { firmado: true } });

  const porcentaje = totalDocs > 0 ? Math.round((docsFirmados / totalDocs) * 100) : 0;

  return {
    answer: `**Estado General de preceptor-ia:**\n- **Alumnos Registrados:** ${totalAlumnos}\n- **Documentos Oficiales Generados:** ${totalDocs}\n- **Documentos Firmados:** ${docsFirmados} (${porcentaje}% completado)`,
    type: 'SUMMARY',
    data: { totalAlumnos, totalDocs, docsFirmados, porcentaje },
    suggestions: [
      '¿Qué alumnos tienen documentos pendientes de firma?',
      'Generar listado de asistencia para 3° A',
    ],
  };
}
