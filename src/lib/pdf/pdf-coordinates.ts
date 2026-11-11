// src/lib/pdf/pdf-coordinates.ts

/**
 * ============================================================================
 * GUÍA DE COORDENADAS PDF (pdf-lib)
 * ============================================================================
 * 
 * En pdf-lib, el sistema de coordenadas funciona con origen en la esquina
 * INFERIOR IZQUIERDA de la página:
 * 
 *  - Eje X (Horizontal):
 *      0 = Borde izquierdo de la página.
 *      Aumentar X -> Mueve el texto hacia la DERECHA.
 *      Disminuir X -> Mueve el texto hacia la IZQUIERDA.
 *      (Ancho estándar A4 = ~595 pt, Carta = 612 pt).
 * 
 *  - Eje Y (Vertical):
 *      0 = Borde INFERIOR (abajo de todo) de la página.
 *      Aumentar Y -> Mueve el texto hacia ARRIBA.
 *      Disminuir Y -> Mueve el texto hacia ABAJO.
 *      (Alto estándar A4 = ~842 pt, Carta = 792 pt).
 * 
 * ============================================================================
 */

export interface FieldCoord {
  x: number;
  y: number;
  size?: number;
  page?: number;
}

export const PDF_COORDINATES = {
  // --------------------------------------------------------------------------
  // 1. FICHA DE INSCRIPCIÓN / SOLICITUD DE MATRÍCULA (finscripcion.pdf)
  // --------------------------------------------------------------------------
  FICHA_INSCRIPCION: {
    fechaCabecera: { x: 330, y: 690, size: 8.5 },
    cursoSolicitado: { x: 395, y: 600, size: 8.5 },

    // Datos del Alumno
    alumnoNombreApellido: { x: 150, y: 525, size: 8.5 },
    alumnoDni: { x: 390, y: 460, size: 8.5 },
    alumnoEdad: { x: 75, y: 500, size: 8 },
    alumnoFechaNac: { x: 185, y: 574, size: 8 },
    alumnoLugarNac: { x: 310, y: 574, size: 8 },
    alumnoNacionalidad: { x: 470, y: 574, size: 8 },
    alumnoDomicilio: { x: 95, y: 552, size: 8 },
    alumnoBarrio: { x: 310, y: 552, size: 8 },
    alumnoLocalidadCP: { x: 425, y: 552, size: 8 },
    alumnoTelefono: { x: 95, y: 530, size: 8 },
    alumnoEmail: { x: 315, y: 530, size: 8 },
    escuelaProcedencia: { x: 200, y: 508, size: 8 },
    cursoAnterior: { x: 120, y: 486, size: 8 },
    turnoAnterior: { x: 260, y: 486, size: 8 },
    materiasAdeudadas: { x: 420, y: 486, size: 8 },
    tieneHermanos: { x: 215, y: 464, size: 8 },
    detalleHermanos: { x: 290, y: 464, size: 8 },

    // Datos del Tutor
    tutorNombreApellido: { x: 155, y: 408, size: 8.5 },
    tutorDni: { x: 440, y: 408, size: 8.5 },
    tutorParentesco: { x: 140, y: 386, size: 8 },
    tutorNacionalidad: { x: 270, y: 386, size: 8 },
    tutorOcupacion: { x: 430, y: 386, size: 8 },
    tutorDomicilio: { x: 95, y: 364, size: 8 },
    tutorLocalidad: { x: 380, y: 364, size: 8 },
    tutorTelefono: { x: 95, y: 342, size: 8 },
    tutorEmail: { x: 315, y: 342, size: 8 },

    // NOTA: El recuadro "USO EXCLUSIVO / ADMINISTRACIÓN" queda INTENCIONALMENTE EN BLANCO
  },

  // --------------------------------------------------------------------------
  // 2. INFORME DE SALUD ANUAL (ISA - INFORME DE SALUD ANUAL.pdf)
  // --------------------------------------------------------------------------
  ISA: {
    // Página 0: Datos Generales
    fecha: { x: 125, y: 587, size: 9, page: 0 },
    escuela: { x: 320, y: 587, size: 8.5, page: 0 },
    alumnoNombreApellido: { x: 245, y: 559, size: 9, page: 0 },
    alumnoDni: { x: 125, y: 531, size: 9, page: 0 },
    alumnoFechaNac: { x: 340, y: 531, size: 8.5, page: 0 },
    alumnoEdad: { x: 125, y: 504, size: 8.5, page: 0 },
    alumnoGenero: { x: 230, y: 504, size: 8.5, page: 0 },
    alumnoLugarNac: { x: 370, y: 504, size: 8.5, page: 0 },
    alumnoDomicilio: { x: 135, y: 476, size: 8.5, page: 0 },
    alumnoLocalidad: { x: 370, y: 476, size: 8.5, page: 0 },
    alumnoTelefono: { x: 135, y: 448, size: 8.5, page: 0 },
    alumnoCursoTurno: { x: 370, y: 448, size: 8.5, page: 0 },
    grupoSanguineo: { x: 180, y: 420, size: 9, page: 0 },
    obraSocial: { x: 370, y: 420, size: 8.5, page: 0 },
    enfermedadesCronicas: { x: 220, y: 365, size: 8.5, page: 0 },
    recibeAtencionMedica: { x: 240, y: 337, size: 8.5, page: 0 },
    tomaMedicacion: { x: 240, y: 309, size: 8.5, page: 0 },

    // Checkboxes Patologías (Página 0)
    patologiaAlergias: { x: 155, y: 260, size: 9, page: 0 },
    patologiaCardio: { x: 295, y: 260, size: 9, page: 0 },
    patologiaDiabetes: { x: 440, y: 260, size: 9, page: 0 },
    patologiaNeuro: { x: 155, y: 240, size: 9, page: 0 },
    patologiaOftalmo: { x: 295, y: 240, size: 9, page: 0 },
    patologiaAuditiva: { x: 440, y: 240, size: 9, page: 0 },

    // Página 1: Urgencias y Declaración Jurada
    urgenciasDetalle: { x: 85, y: 640, size: 8.5, page: 1 },
    urgenciasContacto: { x: 85, y: 590, size: 8.5, page: 1 },
    firmaTutorAclaracion: { x: 200, y: 290, size: 8.5, page: 1 },
    firmaTutorDni: { x: 380, y: 290, size: 8.5, page: 1 },
  },

  // --------------------------------------------------------------------------
  // 3. CERTIFICADO ÚNICO DE SALUD (CUS - FICHA MÉDICA.pdf)
  // --------------------------------------------------------------------------
  CUS: {
    fecha: { x: 95, y: 737, size: 8.5, page: 0 },
    alumnoDni: { x: 440, y: 737, size: 9, page: 0 },
    alumnoNombreApellido: { x: 145, y: 726, size: 9, page: 0 },
    alumnoFechaNac: { x: 145, y: 714, size: 8, page: 0 },
    alumnoEdad: { x: 275, y: 714, size: 8, page: 0 },
    alumnoGenero: { x: 350, y: 714, size: 8, page: 0 },
    alumnoLugarNac: { x: 440, y: 714, size: 8, page: 0 },
    alumnoDomicilio: { x: 100, y: 703, size: 8, page: 0 },
    alumnoLocalidad: { x: 310, y: 703, size: 8, page: 0 },
    alumnoTelefono: { x: 440, y: 703, size: 8, page: 0 },
    escuela: { x: 155, y: 691, size: 8, page: 0 },
    cursoTurno: { x: 440, y: 691, size: 8.5, page: 0 },
    obraSocial: { x: 115, y: 680, size: 8, page: 0 },
    grupoSanguineo: { x: 440, y: 680, size: 8.5, page: 0 },
    vacunacionCompleta: { x: 235, y: 655, size: 8.5, page: 0 },
    pagina1Header: { x: 60, y: 810, size: 8.5, page: 1 },
  },

  // --------------------------------------------------------------------------
  // 4. AUTORIZACIÓN DE PUBLICACIÓN DE IMÁGENES
  // (Autorización para la publicación de imágenes de los alumnos.pdf)
  // --------------------------------------------------------------------------
  AUTORIZACION_IMAGEN: {
    tutorNombreApellido: { x: 135, y: 452, size: 9 },
    tutorDni: { x: 420, y: 452, size: 9 },
    tutorParentesco: { x: 120, y: 423, size: 8.5 },
    alumnoNombreApellido: { x: 230, y: 423, size: 9 },
    alumnoDni: { x: 440, y: 423, size: 9 },
    fechaPie: { x: 75, y: 240, size: 8.5 },
    firmaAclaracion: { x: 125, y: 167, size: 8.5 },
  },

  // --------------------------------------------------------------------------
  // 5. AUTORIZACIÓN DE ALUMNOS EXTERNOS Y SALIDAS (Aexternos.pdf)
  // --------------------------------------------------------------------------
  AUTORIZACION_EXTERNOS: {
    alumnoNombreApellido: { x: 220, y: 738, size: 9 },
    alumnoDni: { x: 445, y: 738, size: 9 },
    cursoTurno: { x: 380, y: 712, size: 8.5 },
    tutorNombreApellido: { x: 180, y: 220, size: 9 },
    tutorDni: { x: 410, y: 220, size: 9 },
    tutorTelefono: { x: 160, y: 195, size: 9 },

    // NOTA: El campo "Lugar y fecha" se deja INTENCIONALMENTE EN BLANCO
    // debido a que es un documento con firma certificada por la Policía
    // y debe ser completado en sede policial por el oficial certificante.
  },
};

/**
 * Coordenadas exactas para la firma manuscrita digital del tutor / padre / madre
 * verificadas con AcroForms y geometría vectorial de cada plantilla oficial.
 */
export const FIRMA_COORDINATES: Record<string, { page: number; x: number; y: number; width: number; height: number }> = {
  FICHA_INSCRIPCION: {
    page: 0,
    x: 72,
    y: 172,
    width: 180,
    height: 36,
  },
  ISA: {
    page: 1,
    x: 330,
    y: 395,
    width: 155,
    height: 46,
  },
  CUS: {
    page: 0,
    x: 80,
    y: 42,
    width: 180,
    height: 42,
  },
  AUTORIZACION_IMAGEN: {
    page: 0,
    x: 210,
    y: 168,
    width: 175,
    height: 48,
  },
  AUTORIZACION_EXTERNOS: {
    page: 0,
    x: 160,
    y: 235,
    width: 170,
    height: 45,
  },
};

