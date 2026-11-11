// src/lib/pdf/generator.ts
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { PDF_COORDINATES, FIRMA_COORDINATES } from './pdf-coordinates';

export interface AlumnoPdfData {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  edad?: number | string;
  genero?: string;
  lugarNacimiento?: string;
  nacionalidad?: string;
  direccion?: string;
  barrio?: string;
  localidad?: string;
  codigoPostal?: string;
  departamento?: string;
  telefono?: string;
  email?: string;

  // Trayectoria escolar
  curso: string;
  turno?: string;
  escuelaProcedencia?: string;
  anioAnterior?: string;
  turnoAnterior?: string;
  materiasAdeudadas?: string;
  tieneHermanos?: boolean;
  cantidadHermanos?: number;
  cursosHermanos?: string;

  // Tutor
  tutorNombre?: string;
  tutorApellido?: string;
  tutorDni?: string;
  tutorTelefono?: string;
  tutorEmail?: string;
  tutorParentesco?: string;
  tutorOcupacion?: string;
  tutorDomicilio?: string;
  tutorLocalidad?: string;
  tutorNacionalidad?: string;

  // Salud
  grupoSanguineo?: string;
  obraSocial?: string;
  nroAfiliado?: string;
  alergias?: string;
  enfermedadesCronicas?: string;
  recibeAtencionMedica?: boolean;
  tomaMedicacion?: boolean;
  medicacionDetalle?: string;
  patologias?: string;
  planAlimentarioEspecial?: boolean;
  planAlimentarioDetalle?: string;
  usaAnteojos?: boolean;
  observacionesMedicas?: string;
  urgenciasDetalle?: string;

  // Autorizaciones
  autorizaSalidas?: boolean;
  autorizaImagenes?: boolean;

  // Firma Digital Manuscrita del Tutor (Opcional antes de generar)
  firmaTutorPng?: Buffer | string;
}

// Helper para encontrar archivo de plantilla en src/assets de forma segura
function findAssetFile(keyword: string): string | null {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');
  if (!fs.existsSync(assetsDir)) return null;

  const files = fs.readdirSync(assetsDir);
  const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const file of files) {
    const normalizedFile = file.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalizedFile.includes(normalizedKeyword) && file.endsWith('.pdf')) {
      return path.join(assetsDir, file);
    }
  }
  return null;
}

// Helper para sanitizar texto antes de imprimir con StandardFonts
function cleanText(text?: string | number | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .normalize('NFC')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

// Helper para incrustar la imagen PNG de la firma digital en el documento
async function getEmbeddedSignature(doc: PDFDocument, firmaTutorPng?: Buffer | string) {
  if (!firmaTutorPng) return null;
  try {
    let buf: Buffer;
    if (Buffer.isBuffer(firmaTutorPng)) {
      buf = firmaTutorPng;
    } else if (typeof firmaTutorPng === 'string') {
      if (firmaTutorPng.startsWith('data:image/')) {
        const base64Data = firmaTutorPng.replace(/^data:image\/\w+;base64,/, '');
        buf = Buffer.from(base64Data, 'base64');
      } else {
        buf = Buffer.from(firmaTutorPng, 'base64');
      }
    } else {
      return null;
    }
    return await doc.embedPng(buf);
  } catch (err) {
    console.warn('Advertencia: no se pudo incrustar firma PNG en documento:', err);
    return null;
  }
}

export async function generarDocumentoPdf(
  tipo: 'FICHA_INSCRIPCION' | 'ISA' | 'CUS' | 'AUTORIZACION_IMAGEN' | 'AUTORIZACION_EXTERNOS' | 'CERTIFICADO_ESCOLARIDAD',
  data: AlumnoPdfData
): Promise<{ bytes: Uint8Array; fileName: string }> {
  let pdfDoc: PDFDocument;

  // Paleta de colores para trazado
  const cDark = rgb(0.08, 0.12, 0.22);
  const cBold = rgb(0.02, 0.08, 0.18);
  const cPrimary = rgb(0.05, 0.2, 0.45);
  const cMuted = rgb(0.35, 0.4, 0.48);

  const fechaActual = new Date();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaTexto = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}`;

  // =========================================================================
  // 1. FICHA DE INSCRIPCIÓN / SOLICITUD DE MATRÍCULA (finscripcion-2026.pdf)
  // =========================================================================
  if (tipo === 'FICHA_INSCRIPCION') {
    const coords = PDF_COORDINATES.FICHA_INSCRIPCION;
    // Priorizamos la nueva plantilla finscripcion-2026.pdf
    const templatePath = findAssetFile('finscripcion-2026') || findAssetFile('finscripcion');

    if (templatePath && fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([612, 792]);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const form = pdfDoc.getForm();

    // 1. Inyección automática en AcroForms si los campos existen
    const filledFields = new Set<string>();

    const tryFillTextField = (fieldNames: string | string[], value: string, canonicalKey?: string, fontSize: number = 8.5) => {
      const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
      let filled = false;
      for (const name of names) {
        try {
          const field = form.getTextField(name);
          if (field) {
            field.setFontSize(fontSize);
            field.setText(cleanText(value));
            filledFields.add(name);
            if (canonicalKey) filledFields.add(canonicalKey);
            filled = true;
          }
        } catch (e) {}
      }
      return filled;
    };

    // Encabezado y Solicitud
    tryFillTextField(['fechaCabecera', 'fecha'], `LEONES, ${fechaTexto}`, 'fechaCabecera', 8.5);
    tryFillTextField(['cursoSolicitado', 'curso'], `${data.curso} (${data.turno || 'Turno Mañana'})`, 'cursoSolicitado', 8.5);

    // Datos del Alumno
    tryFillTextField(['alumnoNombreApellido', 'nombreApellido'], `${data.apellido}, ${data.nombre}`, 'alumnoNombreApellido', 9);
    tryFillTextField(['alumnoEdad', 'edad'], data.edad ? `${data.edad} años` : '', 'alumnoEdad', 8.5);
    tryFillTextField(['alumnoFechaNac', 'fechaNacimiento'], data.fechaNacimiento, 'alumnoFechaNac', 8.5);
    tryFillTextField(['alumnoLugarNac', 'lugarNacimiento'], data.lugarNacimiento || 'Leones, Córdoba', 'alumnoLugarNac', 8.5);
    tryFillTextField(['alumnoNacionalidad', 'nacionalidad'], data.nacionalidad || 'Argentina', 'alumnoNacionalidad', 8.5);
    tryFillTextField(['alumnoDni', 'dni'], data.dni, 'alumnoDni', 8.5);
    tryFillTextField(['alumnoTelefono', 'telefono'], data.telefono || '---', 'alumnoTelefono', 8.5);
    tryFillTextField(['Campo de texto0', 'alumnoCodigoPostal', 'codigoPostal', 'cp'], data.codigoPostal || '2594', 'alumnoLocalidadCP', 8.5);
    tryFillTextField(['alumnoDomicilio', 'domicilio', 'direccion'], data.direccion || '---', 'alumnoDomicilio', 8.5);
    tryFillTextField(['alumnoBarrio', 'barrio'], data.barrio || '---', 'alumnoBarrio', 8.5);
    tryFillTextField(['alumnoLocalidad', 'localidad'], data.localidad || 'Leones', 'alumnoLocalidad', 8.5);
    tryFillTextField(['alumnoLocalidadDpto', 'alumnoDepartamento', 'departamento'], data.departamento || 'Marcos Juárez', 'alumnoDepartamento', 8.5);
    tryFillTextField(['alumnoEmail', 'email'], data.email || '---', 'alumnoEmail', 8.5);

    // Trayectoria Escolar & Hermanos
    tryFillTextField(['escuelaProcedencia', 'establecimientoProcede'], data.escuelaProcedencia || 'IPETYM Nº 256 "Lib. Gral. San Martín"', 'escuelaProcedencia', 8.5);
    tryFillTextField(['cursoAnterior', 'gradoAnterior'], data.anioAnterior || '---', 'cursoAnterior', 8.5);
    tryFillTextField(['turnoAnterior'], data.turnoAnterior || '---', 'turnoAnterior', 8.5);
    tryFillTextField(['materiasAdeudadas', 'materiasAdeuda'], data.materiasAdeudadas || 'Ninguna', 'materiasAdeudadas', 8.5);
    tryFillTextField(['tieneHermanos', 'hermanosColegio'], data.tieneHermanos ? 'SÍ' : 'NO', 'tieneHermanos', 8.5);
    tryFillTextField(
      ['Campo de texto1', 'detalleHermanos', 'cantidadHermanos', 'cursosHermanos'],
      data.tieneHermanos ? (data.cursosHermanos ? `Cant: ${data.cantidadHermanos || 1} (${data.cursosHermanos})` : `${data.cantidadHermanos || 1}`) : '---',
      'detalleHermanos',
      8.5
    );

    // Datos del Tutor / Responsable (Documento al lado del nombre del tutor)
    const tutorNomApe = `${data.tutorApellido || ''}, ${data.tutorNombre || ''}`.replace(/^,\s*|,\s*$/g, '').trim();
    const tutorConDni = tutorNomApe ? (data.tutorDni ? `${tutorNomApe} - DNI: ${data.tutorDni}` : tutorNomApe) : '---';
    tryFillTextField(['tutorNombreApellido', 'nombreTutor'], tutorConDni, 'tutorNombreApellido', 8.5);
    tryFillTextField(['tutorNacionalidad'], data.tutorNacionalidad || 'Argentina', 'tutorNacionalidad', 8.5);
    tryFillTextField(['tutorDomicilio'], data.tutorDomicilio || data.direccion || '---', 'tutorDomicilio', 8.5);
    tryFillTextField(['tutorLocalidad'], data.tutorLocalidad || data.localidad || 'Leones', 'tutorLocalidad', 8.5);
    tryFillTextField(['tutorTelefono'], data.tutorTelefono || '---', 'tutorTelefono', 8.5);
    tryFillTextField(['tutorEmail'], data.tutorEmail || '---', 'tutorEmail', 8.5);
    tryFillTextField(['tutorOcupacion', 'profesionTutor'], data.tutorOcupacion || '---', 'tutorOcupacion', 8.5);
    tryFillTextField(['tutorParentesco', 'vinculoAlumno', 'parentesco'], data.tutorParentesco || 'PADRE', 'tutorParentesco', 8.5);

    // NOTA: "USO EXCLUSIVO / ADMINISTRACION" va completamente VACÍO
    // No se rellenan presentadoPor, selloFecha, ni matriculaNro

    // 2. Fallback de coordenadas para campos que aún no tengan AcroForm en la plantilla
    const page = pdfDoc.getPage(0);

    if (!filledFields.has('fechaCabecera')) {
      page.drawText(`LEONES, ${fechaTexto}`, { ...coords.fechaCabecera, font, color: cDark });
    }
    if (!filledFields.has('cursoSolicitado')) {
      page.drawText(cleanText(`${data.curso} (${data.turno || 'Turno Mañana'})`), {
        ...coords.cursoSolicitado,
        font: fontBold,
        color: cPrimary,
      });
    }
    if (!filledFields.has('alumnoNombreApellido')) {
      page.drawText(cleanText(`${data.apellido}, ${data.nombre}`), { ...coords.alumnoNombreApellido, font: fontBold, color: cDark });
    }
    if (!filledFields.has('alumnoDni')) {
      page.drawText(cleanText(data.dni), { ...coords.alumnoDni, font: fontBold, color: cPrimary });
    }

    if (!filledFields.has('alumnoEdad')) page.drawText(cleanText(`${data.edad || ''} años`), { ...coords.alumnoEdad, font, color: cDark });
    if (!filledFields.has('alumnoFechaNac')) page.drawText(cleanText(data.fechaNacimiento), { ...coords.alumnoFechaNac, font, color: cDark });
    if (!filledFields.has('alumnoLugarNac')) page.drawText(cleanText(data.lugarNacimiento || 'Leones, Córdoba'), { ...coords.alumnoLugarNac, font, color: cDark });
    if (!filledFields.has('alumnoNacionalidad')) page.drawText(cleanText(data.nacionalidad || 'Argentina'), { ...coords.alumnoNacionalidad, font, color: cDark });
    if (!filledFields.has('alumnoDomicilio')) page.drawText(cleanText(data.direccion || '---'), { ...coords.alumnoDomicilio, font, color: cDark });
    if (!filledFields.has('alumnoBarrio')) page.drawText(cleanText(data.barrio || '---'), { ...coords.alumnoBarrio, font, color: cDark });
    if (!filledFields.has('alumnoLocalidadCP')) page.drawText(cleanText(`${data.localidad || 'Leones'} (CP ${data.codigoPostal || '2594'})`), { ...coords.alumnoLocalidadCP, font, color: cDark });
    if (!filledFields.has('alumnoTelefono')) page.drawText(cleanText(data.telefono || '---'), { ...coords.alumnoTelefono, font, color: cDark });
    if (!filledFields.has('alumnoEmail')) page.drawText(cleanText(data.email || '---'), { ...coords.alumnoEmail, font, color: cDark });
    if (!filledFields.has('escuelaProcedencia')) page.drawText(cleanText(data.escuelaProcedencia || 'IPETYM Nº 256 "Lib. Gral. San Martín"'), { ...coords.escuelaProcedencia, font, color: cDark });
    if (!filledFields.has('cursoAnterior')) page.drawText(cleanText(data.anioAnterior || '---'), { ...coords.cursoAnterior, font, color: cDark });
    if (!filledFields.has('turnoAnterior')) page.drawText(cleanText(data.turnoAnterior || '---'), { ...coords.turnoAnterior, font, color: cDark });
    if (!filledFields.has('materiasAdeudadas')) page.drawText(cleanText(data.materiasAdeudadas || 'Ninguna'), { ...coords.materiasAdeudadas, font, color: cDark });
    if (!filledFields.has('tieneHermanos')) {
      page.drawText(data.tieneHermanos ? 'SÍ' : 'NO', { ...coords.tieneHermanos, font: fontBold, color: cDark });
      if (data.tieneHermanos) {
        page.drawText(cleanText(`Cant: ${data.cantidadHermanos || 1} | Cursos: ${data.cursosHermanos || '---'}`), {
          ...coords.detalleHermanos,
          font,
          color: cDark,
        });
      }
    }
    if (!filledFields.has('tutorNombreApellido')) page.drawText(cleanText(tutorConDni), { ...coords.tutorNombreApellido, font: fontBold, color: cDark });
    if (!filledFields.has('tutorParentesco')) page.drawText(cleanText(data.tutorParentesco || 'PADRE'), { ...coords.tutorParentesco, font, color: cDark });
    if (!filledFields.has('tutorNacionalidad')) page.drawText(cleanText(data.tutorNacionalidad || 'Argentina'), { ...coords.tutorNacionalidad, font, color: cDark });
    if (!filledFields.has('tutorOcupacion')) page.drawText(cleanText(data.tutorOcupacion || '---'), { ...coords.tutorOcupacion, font, color: cDark });
    if (!filledFields.has('tutorDomicilio')) page.drawText(cleanText(data.tutorDomicilio || data.direccion || '---'), { ...coords.tutorDomicilio, font, color: cDark });
    if (!filledFields.has('tutorLocalidad')) page.drawText(cleanText(data.tutorLocalidad || data.localidad || 'Leones'), { ...coords.tutorLocalidad, font, color: cDark });
    if (!filledFields.has('tutorTelefono')) page.drawText(cleanText(data.tutorTelefono || '---'), { ...coords.tutorTelefono, font, color: cDark });
    if (!filledFields.has('tutorEmail')) page.drawText(cleanText(data.tutorEmail || '---'), { ...coords.tutorEmail, font, color: cDark });

    // Actualizar apariencia de los AcroForms rellenados y aplanar
    if (filledFields.size > 0) {
      try {
        form.updateFieldAppearances(font);
        form.flatten();
      } catch (e) {}
    }

    // Incrustar firma manuscrita del tutor en el lugar exacto (página 0, x: 72, y: 172)
    if (data.firmaTutorPng) {
      try {
        const sigImg = await getEmbeddedSignature(pdfDoc, data.firmaTutorPng);
        if (sigImg) {
          const cfg = FIRMA_COORDINATES.FICHA_INSCRIPCION;
          const sigPage = pdfDoc.getPage(cfg.page);
          sigPage.drawImage(sigImg, {
            x: cfg.x,
            y: cfg.y,
            width: cfg.width,
            height: cfg.height,
          });
        }
      } catch (e) {
        console.warn('Error dibujando firma en FICHA_INSCRIPCION:', e);
      }
    }
  }

  // =========================================================================
  // 2. INFORME DE SALUD ANUAL (I.S.A.)
  // =========================================================================
  else if (tipo === 'ISA') {
    const coords = PDF_COORDINATES.ISA;
    const templatePath = findAssetFile('ISA - INFORME DE SALUD');

    if (templatePath && fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.32, 841.92]);
      pdfDoc.addPage([595.32, 841.92]);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const form = pdfDoc.getForm();
    const filledFields = new Set<string>();

    const tryFillTextField = (fieldNames: string | string[], value: string, fontSize: number = 8.5) => {
      const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
      let filled = false;
      for (const name of names) {
        try {
          const field = form.getTextField(name);
          if (field) {
            field.setFontSize(fontSize);
            field.setText(cleanText(value));
            filledFields.add(name);
            filled = true;
          }
        } catch (e) {}
      }
      return filled;
    };

    // Inyección en AcroForms: Datos demográficos y escolares
    // NOTA 1: La fecha del examen médico y los datos de salud los completa el médico manualmente.
    // NOTA 2: Si el grupo sanguíneo no es informado, se deja vacío.
    const grupoSanguineoValor = (data.grupoSanguineo && data.grupoSanguineo !== 'No informado' && data.grupoSanguineo !== '---')
      ? data.grupoSanguineo
      : '';

    tryFillTextField(['alumnoNombreApellido', 'nombreApellido'], `${data.apellido}, ${data.nombre}`, 9);
    tryFillTextField(['alumnoDni', 'dni'], data.dni, 8.5);
    tryFillTextField(['escuela'], 'IPETYM Nº 256 "Lib. Gral. San Martín"', 8);
    tryFillTextField(['cursoTurno', 'curso'], `${data.curso} (${data.turno || 'Mañana'})`, 8);
    tryFillTextField(['alumnoGenero', 'genero'], data.genero || '---', 8.5);
    tryFillTextField(['alumnoFechaNac', 'fechaNacimiento'], data.fechaNacimiento, 8.5);
    tryFillTextField(['alumnoEdad', 'edad'], data.edad ? `${data.edad} años` : '', 8.5);
    tryFillTextField(['alumnoDomicilio', 'domicilio'], data.direccion || '---', 8.5);
    tryFillTextField(['alumnoLocalidad', 'localidad'], data.localidad || 'Leones', 8.5);
    tryFillTextField(['alumnoTelefono', 'telefono'], data.telefono || data.tutorTelefono || '---', 8.5);
    tryFillTextField(['obraSocial'], `${data.obraSocial || 'Pública'}${data.nroAfiliado ? ` (Nº ${data.nroAfiliado})` : ''}`, 8);
    tryFillTextField(['grupoSanguineo'], grupoSanguineoValor, 8.5);

    const tutorNomApe = `${data.tutorApellido || ''}, ${data.tutorNombre || ''}`.replace(/^,\s*|,\s*$/g, '').trim();
    tryFillTextField(['tutorNombreApellido', 'tutorNombre'], tutorNomApe || '---', 8.5);
    tryFillTextField(['tutorDni'], data.tutorDni || '---', 8.5);

    // Fallback de coordenadas para plantillas sin AcroForms (dejando fecha médica en blanco)
    const page0 = pdfDoc.getPage(0);
    if (!filledFields.has('escuela')) page0.drawText(cleanText('IPETYM Nº 256 "Lib. Gral. San Martín"'), { x: coords.escuela.x, y: coords.escuela.y, size: 8, font: fontBold, color: cDark });
    if (!filledFields.has('alumnoNombreApellido')) page0.drawText(cleanText(`${data.apellido}, ${data.nombre}`), { x: coords.alumnoNombreApellido.x, y: coords.alumnoNombreApellido.y, size: 9, font: fontBold, color: cDark });
    if (!filledFields.has('alumnoDni')) page0.drawText(cleanText(data.dni), { x: coords.alumnoDni.x, y: coords.alumnoDni.y, size: 8.5, font: fontBold, color: cPrimary });
    if (!filledFields.has('alumnoFechaNac')) page0.drawText(cleanText(data.fechaNacimiento), { x: coords.alumnoFechaNac.x, y: coords.alumnoFechaNac.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoEdad')) page0.drawText(cleanText(`${data.edad || ''} años`), { x: coords.alumnoEdad.x, y: coords.alumnoEdad.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoGenero')) page0.drawText(cleanText(data.genero || '---'), { x: coords.alumnoGenero.x, y: coords.alumnoGenero.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoDomicilio')) page0.drawText(cleanText(data.direccion || '---'), { x: coords.alumnoDomicilio.x, y: coords.alumnoDomicilio.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoLocalidad')) page0.drawText(cleanText(data.localidad || 'Leones'), { x: coords.alumnoLocalidad.x, y: coords.alumnoLocalidad.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoTelefono')) page0.drawText(cleanText(data.telefono || data.tutorTelefono || '---'), { x: coords.alumnoTelefono.x, y: coords.alumnoTelefono.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('cursoTurno')) page0.drawText(cleanText(`${data.curso} (${data.turno || 'Mañana'})`), { x: coords.alumnoCursoTurno.x, y: coords.alumnoCursoTurno.y, size: 8, font: fontBold, color: cPrimary });
    if (!filledFields.has('grupoSanguineo') && grupoSanguineoValor) {
      page0.drawText(cleanText(grupoSanguineoValor), { x: coords.grupoSanguineo.x, y: coords.grupoSanguineo.y, size: 8.5, font: fontBold, color: cPrimary });
    }
    if (!filledFields.has('obraSocial')) page0.drawText(cleanText(`${data.obraSocial || 'Pública'} (Nº ${data.nroAfiliado || '---'})`), { x: coords.obraSocial.x, y: coords.obraSocial.y, size: 8, font, color: cDark });

    if (filledFields.size > 0) {
      try {
        form.updateFieldAppearances(font);
        form.flatten();
      } catch (e) {}
    }

    // Incrustar firma manuscrita del tutor en el lugar exacto (página 1, x: 330, y: 395)
    if (data.firmaTutorPng) {
      try {
        const sigImg = await getEmbeddedSignature(pdfDoc, data.firmaTutorPng);
        const cfg = FIRMA_COORDINATES.ISA;
        if (sigImg && pdfDoc.getPageCount() > cfg.page) {
          const sigPage = pdfDoc.getPage(cfg.page);
          sigPage.drawImage(sigImg, {
            x: cfg.x,
            y: cfg.y,
            width: cfg.width,
            height: cfg.height,
          });
        }
      } catch (e) {
        console.warn('Error dibujando firma en ISA:', e);
      }
    }
  }

  // =========================================================================
  // 3. CERTIFICADO ÚNICO DE SALUD (C.U.S.)
  // =========================================================================
  else if (tipo === 'CUS') {
    const coords = PDF_COORDINATES.CUS;
    const templatePath = findAssetFile('CUS - FICHA');

    if (templatePath && fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.32, 842.04]);
      pdfDoc.addPage([595.32, 842.04]);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const form = pdfDoc.getForm();
    const filledFields = new Set<string>();

    const tryFillTextField = (fieldNames: string | string[], value: string, fontSize: number = 8.5) => {
      const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
      let filled = false;
      for (const name of names) {
        try {
          const field = form.getTextField(name);
          if (field) {
            field.setFontSize(fontSize);
            field.setText(cleanText(value));
            filledFields.add(name);
            filled = true;
          }
        } catch (e) {}
      }
      return filled;
    };

    // Inyección en AcroForms: Datos demográficos del estudiante
    // NOTA: Fecha médica, vacunas y exámenes clínicos quedan en blanco para el médico.
    tryFillTextField(['alumnoNombreApellido', 'nombreApellido'], `${data.apellido}, ${data.nombre}`, 9);
    tryFillTextField(['alumnoDni', 'dni'], data.dni, 8.5);
    tryFillTextField(['alumnoFechaNac', 'fechaNacimiento'], data.fechaNacimiento, 8.5);
    tryFillTextField(['alumnoEdad', 'edad'], data.edad ? `${data.edad}` : '', 8.5);
    tryFillTextField(['alumnoGenero', 'genero'], data.genero || '---', 8.5);
    tryFillTextField(['alumnoLugarNac', 'lugarNacimiento'], data.lugarNacimiento || 'Leones, Córdoba', 8.5);
    tryFillTextField(['alumnoDomicilio', 'domicilio'], data.direccion || '---', 8.5);
    tryFillTextField(['alumnoLocalidad', 'localidad'], data.localidad || 'Leones', 8.5);
    tryFillTextField(['alumnoTelefono', 'telefono'], data.telefono || data.tutorTelefono || '---', 8.5);

    // Fallback de coordenadas si no hay AcroForms
    const page0 = pdfDoc.getPage(0);
    if (!filledFields.has('alumnoNombreApellido')) page0.drawText(cleanText(`${data.apellido}, ${data.nombre}`), { x: coords.alumnoNombreApellido.x, y: coords.alumnoNombreApellido.y, size: 9, font: fontBold, color: cDark });
    if (!filledFields.has('alumnoDni')) page0.drawText(cleanText(data.dni), { x: coords.alumnoDni.x, y: coords.alumnoDni.y, size: 8.5, font: fontBold, color: cPrimary });
    if (!filledFields.has('alumnoFechaNac')) page0.drawText(cleanText(data.fechaNacimiento), { x: coords.alumnoFechaNac.x, y: coords.alumnoFechaNac.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoEdad')) page0.drawText(cleanText(data.edad ? `${data.edad}` : ''), { x: coords.alumnoEdad.x, y: coords.alumnoEdad.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoGenero')) page0.drawText(cleanText(data.genero || '---'), { x: coords.alumnoGenero.x, y: coords.alumnoGenero.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoLugarNac')) page0.drawText(cleanText(data.lugarNacimiento || 'Leones, Córdoba'), { x: coords.alumnoLugarNac.x, y: coords.alumnoLugarNac.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoDomicilio')) page0.drawText(cleanText(data.direccion || '---'), { x: coords.alumnoDomicilio.x, y: coords.alumnoDomicilio.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoLocalidad')) page0.drawText(cleanText(data.localidad || 'Leones'), { x: coords.alumnoLocalidad.x, y: coords.alumnoLocalidad.y, size: 8.5, font, color: cDark });
    if (!filledFields.has('alumnoTelefono')) page0.drawText(cleanText(data.telefono || data.tutorTelefono || '---'), { x: coords.alumnoTelefono.x, y: coords.alumnoTelefono.y, size: 8.5, font, color: cDark });

    if (filledFields.size > 0) {
      try {
        form.updateFieldAppearances(font);
        form.flatten();
      } catch (e) {}
    }

    // Incrustar firma manuscrita del tutor en el lugar exacto (página 0, x: 80, y: 42)
    if (data.firmaTutorPng) {
      try {
        const sigImg = await getEmbeddedSignature(pdfDoc, data.firmaTutorPng);
        const cfg = FIRMA_COORDINATES.CUS;
        if (sigImg && pdfDoc.getPageCount() > cfg.page) {
          const sigPage = pdfDoc.getPage(cfg.page);
          sigPage.drawImage(sigImg, {
            x: cfg.x,
            y: cfg.y,
            width: cfg.width,
            height: cfg.height,
          });
        }
      } catch (e) {
        console.warn('Error dibujando firma en CUS:', e);
      }
    }
  }

  // =========================================================================
  // 4. AUTORIZACIÓN DE PUBLICACIÓN DE IMÁGENES
  // =========================================================================
  else if (tipo === 'AUTORIZACION_IMAGEN') {
    const coords = PDF_COORDINATES.AUTORIZACION_IMAGEN;
    const templatePath = findAssetFile('publicacion de imagenes');

    if (templatePath && fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.4, 842]);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const form = pdfDoc.getForm();
    const filledFields = new Set<string>();

    // Eliminar el widget duplicado inferior de firma en tutorNombreApellido si existe
    try {
      const tutorField = form.getTextField('tutorNombreApellido');
      const widgets = tutorField.acroField.getWidgets();
      for (let i = widgets.length - 1; i >= 0; i--) {
        const rect = widgets[i].getRectangle();
        if (rect.y < 200) {
          tutorField.acroField.removeWidget(i);
        }
      }
    } catch (e) {}

    const tryFillTextField = (fieldNames: string | string[], value: string, fontSize: number = 8.5) => {
      const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
      let filled = false;
      for (const name of names) {
        try {
          const field = form.getTextField(name);
          if (field) {
            field.setFontSize(fontSize);
            field.setText(cleanText(value));
            filledFields.add(name);
            filled = true;
          }
        } catch (e) {}
      }
      return filled;
    };

    // ÚNICOS CAMPOS a renderizarse según requerimiento:
    // 1. Nombre y apellido del tutor
    // 2. DNI del tutor
    // 3. Nombre y apellido del estudiante
    // 4. Fecha
    const tutorNomApe = `${data.tutorApellido || ''} ${data.tutorNombre || ''}`.trim() || `${data.apellido} ${data.nombre}`;
    tryFillTextField(['tutorNombreApellido', 'nombreTutor'], tutorNomApe, 9);
    tryFillTextField(['tutorDni', 'dniTutor'], data.tutorDni || '---', 8.5);
    tryFillTextField(['alumnoNombreApellido', 'nombreAlumno'], `${data.apellido}, ${data.nombre}`, 9);
    tryFillTextField(['fechaCabecera', 'fecha'], `Leones, ${fechaTexto}`, 8.5);

    // Fallback de coordenadas si no hay AcroForms (solo los 4 campos autorizados, sin duplicar firmas abajo)
    const page = pdfDoc.getPage(0);
    if (!filledFields.has('tutorNombreApellido')) page.drawText(cleanText(tutorNomApe), { ...coords.tutorNombreApellido, font: fontBold, color: cDark });
    if (!filledFields.has('tutorDni')) page.drawText(cleanText(data.tutorDni || '---'), { ...coords.tutorDni, font: fontBold, color: cDark });
    if (!filledFields.has('alumnoNombreApellido')) page.drawText(cleanText(`${data.apellido}, ${data.nombre}`), { ...coords.alumnoNombreApellido, font: fontBold, color: cPrimary });
    if (!filledFields.has('fechaCabecera')) page.drawText(cleanText(`Leones, ${fechaTexto}`), { ...coords.fechaPie, font, color: cDark });

    if (filledFields.size > 0) {
      try {
        form.updateFieldAppearances(font);
        form.flatten();
      } catch (e) {}
    }

    // Incrustar firma manuscrita del tutor en el lugar exacto (página 0, x: 210, y: 168)
    if (data.firmaTutorPng) {
      try {
        const sigImg = await getEmbeddedSignature(pdfDoc, data.firmaTutorPng);
        const cfg = FIRMA_COORDINATES.AUTORIZACION_IMAGEN;
        if (sigImg && pdfDoc.getPageCount() > cfg.page) {
          const sigPage = pdfDoc.getPage(cfg.page);
          sigPage.drawImage(sigImg, {
            x: cfg.x,
            y: cfg.y,
            width: cfg.width,
            height: cfg.height,
          });
        }
      } catch (e) {
        console.warn('Error dibujando firma en AUTORIZACION_IMAGEN:', e);
      }
    }
  }

  // =========================================================================
  // 5. AUTORIZACIÓN DE ALUMNOS EXTERNOS Y SALIDAS (Aexternos.pdf)
  // =========================================================================
  else if (tipo === 'AUTORIZACION_EXTERNOS') {
    const coords = PDF_COORDINATES.AUTORIZACION_EXTERNOS;
    const templatePath = findAssetFile('Aexternos');

    if (templatePath && fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPage(0);

    // Alumno y DNI
    page.drawText(cleanText(`${data.apellido}, ${data.nombre}`), { ...coords.alumnoNombreApellido, font: fontBold, color: cDark });
    page.drawText(cleanText(data.dni), { ...coords.alumnoDni, font: fontBold, color: cPrimary });

    // Curso
    page.drawText(cleanText(`${data.curso} (${data.turno || 'Mañana'})`), { ...coords.cursoTurno, font: fontBold, color: cPrimary });

    // Tutor
    page.drawText(cleanText(`${data.tutorApellido || ''} ${data.tutorNombre || ''}`), { ...coords.tutorNombreApellido, font: fontBold, color: cDark });
    page.drawText(cleanText(data.tutorDni || '---'), { ...coords.tutorDni, font: fontBold, color: cDark });
    page.drawText(cleanText(data.tutorTelefono || '---'), { ...coords.tutorTelefono, font, color: cDark });

    // IMPORTANTE: Lugar y fecha queda INTENCIONALMENTE EN BLANCO
    // debido a que es una firma certificada por la Policía provincial.

    // Incrustar firma manuscrita del tutor en el lugar exacto (página 0, x: 160, y: 235)
    if (data.firmaTutorPng) {
      try {
        const sigImg = await getEmbeddedSignature(pdfDoc, data.firmaTutorPng);
        const cfg = FIRMA_COORDINATES.AUTORIZACION_EXTERNOS;
        if (sigImg && pdfDoc.getPageCount() > cfg.page) {
          const sigPage = pdfDoc.getPage(cfg.page);
          sigPage.drawImage(sigImg, {
            x: cfg.x,
            y: cfg.y,
            width: cfg.width,
            height: cfg.height,
          });
        }
      } catch (e) {
        console.warn('Error dibujando firma en AUTORIZACION_EXTERNOS:', e);
      }
    }
  }

  // =========================================================================
  // 6. CERTIFICADO DE ALUMNO REGULAR
  // =========================================================================
  else {
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 40,
      y: height - 85,
      width: width - 80,
      height: 55,
      color: rgb(0.95, 0.96, 0.98),
      borderColor: rgb(0.78, 0.82, 0.88),
      borderWidth: 1,
    });

    page.drawText('IPETYM Nº 256 "Libertador Gral. Don José de San Martín"', {
      x: 55,
      y: height - 52,
      size: 11,
      font: fontBold,
      color: cPrimary,
    });
    page.drawText('Gral. Roca 724 – 2594 – LEONES (Cba.) | Tel: 03472-483564 | ipetym256ls@gmail.com', {
      x: 55,
      y: height - 68,
      size: 8,
      font,
      color: cMuted,
    });

    let y = height - 140;
    page.drawText('CERTIFICADO DE ALUMNO REGULAR', { x: width / 2 - 130, y, size: 14, font: fontBold, color: cPrimary });

    y -= 50;
    page.drawText(`El IPETYM Nº 256 "Libertador Gral. Don José de San Martín" hace constar por la presente que:`, { x: 50, y, size: 10, font, color: cDark });

    y -= 30;
    page.drawText(`El/la estudiante: ${cleanText(data.apellido)}, ${cleanText(data.nombre)}`, { x: 65, y, size: 11, font: fontBold, color: cBold });
    y -= 20;
    page.drawText(`Documento Nacional de Identidad: ${cleanText(data.dni)}`, { x: 65, y, size: 10, font: fontBold, color: cPrimary });
    y -= 25;
    page.drawText(`se encuentra matriculado/a como ALUMNO/A REGULAR cursando el ${cleanText(data.curso)} (${cleanText(data.turno || 'Mañana')})`, { x: 50, y, size: 10, font, color: cDark });
    y -= 18;
    page.drawText(`durante el Ciclo Lectivo 2026.`, { x: 50, y, size: 10, font, color: cDark });

    y -= 40;
    page.drawText(`A pedido del interesado/a y para ser presentado ante quien corresponda, se expide el presente en la`, { x: 50, y, size: 9.5, font, color: cDark });
    y -= 16;
    page.drawText(`ciudad de Leones (Córdoba), a los ${fechaTexto}.`, { x: 50, y, size: 9.5, font, color: cDark });

    y -= 90;
    page.drawLine({ start: { x: 340, y }, end: { x: 520, y }, thickness: 1, color: cDark });
    page.drawText('Firma y Sello de la Dirección Escolar', { x: 350, y: y - 14, size: 8.5, font: fontBold, color: cDark });
    page.drawText('IPETYM Nº 256 - Leones (Cba.)', { x: 370, y: y - 26, size: 8, font, color: cMuted });
  }

  // El PDF se genera en memoria: no se escribe en disco ni en la base de datos.
  const bytes = await pdfDoc.save();
  return { bytes, fileName: `${tipo}_${data.dni}.pdf` };
}
