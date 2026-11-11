// src/app/firmar/[token]/page.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Loader2,
  FileText,
  Lock,
  Smartphone,
  Check,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Point {
  x: number;
  y: number;
  time?: number;
}

interface Stroke {
  points: Point[];
}

interface SessionData {
  token: string;
  estado: string;
  documentoTitulo: string;
  tipoDocumento?: string;
  expiresAt: string;
  alumno?: { nombre: string; apellido: string; dni: string } | null;
  tutor?: { nombre: string; apellido: string; dni: string } | null;
}

export default function MobileSigningPage({ params }: { params: { token: string } }) {
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Referencias para el Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const hasNotifiedSigningRef = useRef(false);

  // 1. Cargar y validar la sesión al abrir la página
  const fetchSession = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/firma/sesion/${token}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (data.success && data.data) {
        setSession(data.data);
      } else {
        setErrorCode(data.code || 'ERROR');
        setErrorMessage(data.error || 'No se pudo acceder a la sesión de firma.');
      }
    } catch (err: any) {
      setErrorCode('NETWORK_ERROR');
      setErrorMessage('Error de conexión. Verificá tu conexión a Internet y volvé a intentar.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // 2. Redibujar trazos en el canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    // Limpiar canvas a transparente (sin fondo blanco opaco, ni líneas ni texto quemados en el canvas)
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // Dibujar todos los trazos guardados con tinta oscura nítida

    // Dibujar todos los trazos guardados
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) {
      const pts = stroke.points;
      if (!pts || pts.length === 0) continue;

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  // 3. Ajustar tamaño del canvas con soporte para alta resolución (Retina/DPI)
  const adjustCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Dimensiones en CSS
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(180, Math.min(320, Math.floor(rect.height || width * 0.58)));

    // Configurar resolución interna escalada por dpr para trazo suave
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!session || isSuccess || errorCode) return;

    adjustCanvasSize();

    const handleResize = () => adjustCanvasSize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [session, isSuccess, errorCode, adjustCanvasSize]);

  // Helper para obtener coordenadas relativas exactas del evento
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
    };
  };

  // Notificar al backend que el usuario comenzó a firmar (solo una vez)
  const notifySigning = async () => {
    if (hasNotifiedSigningRef.current) return;
    hasNotifiedSigningRef.current = true;
    try {
      await fetch('/api/firma/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, estado: 'signing' }),
      });
    } catch {}
  };

  // 4. Manejadores de eventos Pointer (touch / stylus / mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isDrawingRef.current = true;
    setHasDrawn(true);
    setValidationWarning(null);

    const pt = getCanvasCoordinates(e);
    const newStroke: Stroke = { points: [pt] };
    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    setStrokeCount(strokesRef.current.length);

    redrawCanvas();
    notifySigning();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getCanvasCoordinates(e);
    (currentStrokeRef.current as Stroke).points.push(pt);

    // Contar puntos para saber si dibujó
    const totalPoints = strokesRef.current.reduce((acc, s) => acc + s.points.length, 0);
    if (totalPoints > 1 && !hasDrawn) {
      setHasDrawn(true);
    }

    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      isDrawingRef.current = false;
      currentStrokeRef.current = null;

      const totalPoints = strokesRef.current.reduce((acc, s) => acc + s.points.length, 0);
      setHasDrawn(totalPoints >= 1);
      setStrokeCount(strokesRef.current.length);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerUp(e);
  };

  // 5. Limpiar el canvas
  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasDrawn(false);
    setStrokeCount(0);
    setValidationWarning(null);
    redrawCanvas();
  };

/**
 * Exporta EXCLUSIVAMENTE los trazos manuscritos a una imagen PNG en base64 con fondo 100% transparente.
 * - NO incluye fondo blanco ni opaco.
 * - NO incluye líneas inferiores ni líneas de base.
 * - NO incluye ningún texto ni indicación ("Firme sobre la línea...", etc.).
 * - Recorta con precisión matemática a los límites del trazo (bounding box) más un margen de respiración.
 * - Renderiza a resolución Retina (2x) para nitidez vectorial al estampar en documentos PDF.
 */
function renderStrokesToCleanTransparentPng(strokes: Stroke[]): string {
  if (!strokes || strokes.length === 0) return '';

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    if (!stroke.points) continue;
    for (const pt of stroke.points) {
      if (typeof pt.x === 'number' && typeof pt.y === 'number') {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
  }

  const rawWidth = maxX - minX;
  const rawHeight = maxY - minY;

  if (rawWidth <= 0 || rawHeight <= 0 || !isFinite(rawWidth) || !isFinite(rawHeight)) {
    return '';
  }

  // Padding de respiración y escala 2x para máxima calidad en PDF impreso
  const padding = 16;
  const scale = 2;
  const targetWidth = Math.max(40, Math.ceil((rawWidth + padding * 2) * scale));
  const targetHeight = Math.max(30, Math.ceil((rawHeight + padding * 2) * scale));

  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;

  const ctx = offscreen.getContext('2d');
  if (!ctx) return '';

  // Por especificación del estándar HTML5 Canvas 2D, el buffer recién creado
  // es 100% transparente (RGBA: 0, 0, 0, 0).
  // NO se ejecuta ningún fillRect, ni líneas de guía, ni textos de ayuda.
  ctx.scale(scale, scale);
  ctx.translate(-minX + padding, -minY + padding);

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) continue;

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  return offscreen.toDataURL('image/png');
}

  // 6. Confirmar y enviar la firma al backend
  const handleConfirmSignature = async () => {
    setValidationWarning(null);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Validación de contenido en canvas
    const strokes = strokesRef.current;
    const totalPoints = strokes.reduce((acc, s) => acc + s.points.length, 0);

    if (strokes.length === 0 || totalPoints < 3) {
      setValidationWarning('Por favor, dibuje su firma en el recuadro antes de confirmar.');
      return;
    }

    setSubmitting(true);

    try {
      // Exportar con absoluta certeza SOLO el trazo en PNG con fondo 100% transparente
      let pngDataUrl = renderStrokesToCleanTransparentPng(strokes);
      if (!pngDataUrl) {
        pngDataUrl = canvas.toDataURL('image/png');
      }

      const res = await fetch('/api/firma/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          strokes,
          pngDataUrl,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        if (data.code === 'ALREADY_COMPLETED') {
          setErrorCode('ALREADY_COMPLETED');
          setErrorMessage('Esta sesión de firma ya fue utilizada.');
        } else if (data.code === 'EXPIRED') {
          setErrorCode('EXPIRED');
          setErrorMessage('El tiempo límite para firmar este documento ha expirado.');
        } else if (data.code === 'CANCELLED') {
          setErrorCode('CANCELLED');
          setErrorMessage('La sesión fue cancelada desde la computadora.');
        } else {
          setValidationWarning(data.error || 'Ocurrió un error al registrar la firma.');
        }
      }
    } catch (err: any) {
      setValidationWarning('Error de conexión al enviar la firma. Por favor, reintente.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // VISTA: CARGANDO
  // =========================================================================
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Conectando con la sesión...</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Verificando la validez del código QR y preparando el área de firma.
        </p>
      </div>
    );
  }

  // =========================================================================
  // VISTA: ÉXITO (FIRMA ENVIADA)
  // =========================================================================
  if (isSuccess) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg text-center p-6 space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              ¡Firma Enviada con Éxito!
            </h2>
            <p className="text-sm text-muted-foreground">
              La firma manuscrita fue recibida por el sistema y vinculada al documento oficial del IPETYM 256.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background border text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Documento:</span>
              <span className="font-semibold text-foreground">{session?.documentoTitulo || 'Oficial'}</span>
            </div>
            {session?.tutor && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Firmante (Tutor):</span>
                <span className="font-semibold text-foreground">
                  {session.tutor.apellido}, {session.tutor.nombre}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Estado:</span>
              <Badge variant="success" className="text-[10px]">
                Completado & Verificado
              </Badge>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Ya podés cerrar esta pestaña en tu teléfono. La computadora continuará automáticamente con el trámite.
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VISTA: ERRORES (EXPIRADO, YA USADO, CANCELADO, INVÁLIDO)
  // =========================================================================
  if (errorCode) {
    const isUsed = errorCode === 'ALREADY_COMPLETED';
    const isExpired = errorCode === 'EXPIRED';
    const isCancelled = errorCode === 'CANCELLED';

    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30 shadow-md text-center p-6 space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
            {isUsed ? (
              <CheckCircle2 className="w-9 h-9" />
            ) : isExpired ? (
              <Clock className="w-9 h-9" />
            ) : (
              <XCircle className="w-9 h-9" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              {isUsed
                ? 'Esta sesión de firma ya fue utilizada'
                : isExpired
                ? 'El código QR ha expirado'
                : isCancelled
                ? 'Sesión de firma cancelada'
                : 'Enlace no disponible'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'No es posible interactuar con esta sesión de firma.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border text-xs text-muted-foreground">
            {isUsed && (
              <p>Por motivos de seguridad, los tokens de firma son de <strong>un solo uso</strong>. Una vez confirmada la firma, el enlace queda invalidado permanentemente.</p>
            )}
            {isExpired && (
              <p>Las sesiones de firma tienen un tiempo límite de seguridad (5 minutos). Solicitá a la persona que genere un nuevo código QR en la computadora.</p>
            )}
            {isCancelled && (
              <p>La solicitud de firma fue cancelada desde la pantalla principal de la preceptoría.</p>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={fetchSession}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reintentar verificación
          </Button>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VISTA PRINCIPAL: ÁREA DE FIRMA MANUSCRITA
  // =========================================================================
  return (
    <div className="min-h-[92vh] max-w-lg mx-auto flex flex-col justify-between py-2 px-2 sm:px-4 select-none">
      {/* Cabecera Móvil */}
      <div className="space-y-3 mb-2">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Firma Digital
              </h1>
              <span className="text-[10px] text-muted-foreground">IPETYM Nº 256 &bull; Preceptoría</span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 py-0.5 border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
            <Lock className="w-2.5 h-2.5" /> Sesión Segura
          </Badge>
        </div>

        {/* Identificación del Documento y Tutor */}
        <div className="p-3 rounded-xl bg-card border shadow-2xs space-y-1">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Documento a Firmar:
              </span>
              <p className="text-xs font-bold text-foreground truncate">
                {session?.documentoTitulo || 'Documento Oficial de Matrícula'}
              </p>
            </div>
          </div>

          {(session?.tutor || session?.alumno) && (
            <div className="pt-1 border-t text-[11px] text-muted-foreground flex justify-between">
              {session.tutor && (
                <span>
                  Tutor: <strong>{session.tutor.apellido}, {session.tutor.nombre}</strong>
                </span>
              )}
              {session.alumno && (
                <span>
                  Alumno: <strong>{session.alumno.apellido}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de validación si presionó confirmar sin firmar */}
      {validationWarning && (
        <Alert variant="destructive" className="py-2 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-xs font-bold">Atención</AlertTitle>
          <AlertDescription className="text-xs">{validationWarning}</AlertDescription>
        </Alert>
      )}

      {/* Recuadro de Firma con Canvas */}
      <div className="flex-1 flex flex-col justify-center my-1">
        <div
          ref={containerRef}
          className="relative w-full h-[240px] sm:h-[280px] rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner overflow-hidden flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          {/* Indicador de ayuda inicial centrado y sutil que desaparece al dibujar */}
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 select-none transition-opacity duration-200">
              <PenTool className="w-8 h-8 mb-2 opacity-30 animate-pulse text-primary" />
              <p className="text-xs font-medium tracking-wide">
                Dibuje su firma aquí
              </p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair relative z-10 bg-transparent"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 mt-1.5">
          <span>{hasDrawn ? '✓ Trazo detectado' : 'Dibuje con el dedo o lápiz óptico'}</span>
          <span className="font-mono">Trazos: {strokeCount}</span>
        </div>
      </div>

      {/* Botonera de Acción */}
      <div className="pt-3 border-t space-y-2 mt-auto">
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={submitting || !hasDrawn}
            onClick={handleClear}
            className="h-12 text-sm font-semibold border-slate-300 dark:border-slate-700 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Borrar
          </Button>

          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={submitting}
            onClick={handleConfirmSignature}
            className="h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar firma
              </>
            )}
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Al confirmar, su firma manuscrita será vinculada legalmente a la documentación escolar del IPETYM 256.
        </p>
      </div>
    </div>
  );
}
