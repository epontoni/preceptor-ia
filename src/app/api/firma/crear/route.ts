// src/app/api/firma/crear/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      documentoId,
      alumnoId: reqAlumnoId,
      tutorId: reqTutorId,
      documentoTitulo: reqTitulo,
      tipoDocumento: reqTipo,
      expirationMinutes = 5,
    } = body;

    let alumnoId = reqAlumnoId || null;
    let tutorId = reqTutorId || null;
    let tipoDocumento = reqTipo || null;
    let documentoTitulo = reqTitulo || 'Documento Escolar - IPETYM 256';

    // Si se especificó un documentoId, cargar datos reales del alumno y tutor
    if (documentoId) {
      const doc = await prisma.documento.findUnique({
        where: { id: documentoId },
        include: {
          alumno: {
            include: {
              tutores: {
                include: { tutor: true },
              },
            },
          },
        },
      });

      if (doc) {
        alumnoId = doc.alumnoId;
        tipoDocumento = doc.tipo;
        const tutorRel = doc.alumno.tutores[0];
        if (tutorRel) {
          tutorId = tutorRel.tutorId;
        }

        const tipoLabels: Record<string, string> = {
          FICHA_INSCRIPCION: 'Ficha de Matrícula Oficial',
          ISA: 'Informe de Salud Anual (I.S.A.)',
          CUS: 'Certificado Único de Salud (C.U.S.)',
          AUTORIZACION_IMAGEN: 'Autorización Salidas & Imagen',
          CERTIFICADO_ESCOLARIDAD: 'Certificado de Alumno Regular',
        };

        const label = tipoLabels[doc.tipo] || doc.tipo;
        documentoTitulo = `${label} - ${doc.alumno.apellido}, ${doc.alumno.nombre}`;
      }
    } else if (alumnoId && !tutorId) {
      const alumno = await prisma.alumno.findUnique({
        where: { id: alumnoId },
        include: {
          tutores: { include: { tutor: true } },
        },
      });
      if (alumno) {
        if (!reqTitulo) {
          documentoTitulo = `Inscripción y Legajo - ${alumno.apellido}, ${alumno.nombre}`;
        }
        const tutorRel = alumno.tutores[0];
        if (tutorRel) tutorId = tutorRel.tutorId;
      }
    }

    // 1. Generar token criptográficamente seguro, impredecible y de un solo uso
    const token = crypto.randomBytes(32).toString('hex');

    // 2. Calcular expiración
    const durationMs = Math.max(1, Math.min(60, Number(expirationMinutes) || 5)) * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    // 3. Crear sesión en la base de datos
    const session = await prisma.firmaSesion.create({
      data: {
        token,
        estado: 'pending',
        documentoTitulo,
        tipoDocumento,
        documentoId: documentoId || null,
        alumnoId,
        tutorId,
        expiresAt,
      },
    });

    // 4. Determinar URL pública para el QR
    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const protoHeader = req.headers.get('x-forwarded-proto') || (hostHeader.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protoHeader}://${hostHeader}`;
    const signUrl = `${baseUrl}/firmar/${token}`;

    // 5. Generar código QR en formato Data URL PNG
    const qrDataUrl = await QRCode.toDataURL(signUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        token,
        signUrl,
        qrDataUrl,
        documentoTitulo,
        tipoDocumento,
        documentoId,
        expiresAt: expiresAt.toISOString(),
        durationSeconds: durationMs / 1000,
        estado: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Error al crear sesión de firma:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
