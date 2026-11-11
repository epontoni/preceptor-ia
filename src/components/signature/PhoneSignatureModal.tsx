// src/components/signature/PhoneSignatureModal.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileText,
  UserCheck,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface PhoneSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId?: string;
  alumnoId?: string;
  tutorId?: string;
  documentoTitulo?: string;
  tipoDocumento?: string;
  onSignatureCompleted?: (data: {
    token: string;
    pngUrl: string;
    signedAt: string;
    documentoId?: string;
    tutorNombre?: string;
  }) => void;
}

export type SignatureSessionState = 'pending' | 'opened' | 'signing' | 'completed' | 'expired' | 'cancelled';

export default function PhoneSignatureModal({
  open,
  onOpenChange,
  documentoId,
  alumnoId,
  tutorId,
  documentoTitulo,
  tipoDocumento,
  onSignatureCompleted,
}: PhoneSignatureModalProps) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<string>(documentoTitulo || 'Documento Escolar');
  const [estado, setEstado] = useState<SignatureSessionState>('pending');
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [tutorNombre, setTutorNombre] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTokenRef = useRef<string | null>(null);

  // 1. Limpieza de conexiones y timers
  const cleanupListeners = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // 2. Iniciar nueva sesión de firma
  const initSession = useCallback(async () => {
    cleanupListeners();
    setLoading(true);
    setErrorMsg(null);
    setEstado('pending');
    setSignaturePreview(null);
    setToken(null);
    setQrDataUrl(null);

    try {
      const res = await fetch('/api/firma/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentoId,
          alumnoId,
          tutorId,
          documentoTitulo,
          tipoDocumento,
          expirationMinutes: 5,
        }),
      });

      const json = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error || 'No se pudo crear la sesión de firma');
      }

      const { token: newToken, qrDataUrl: newQr, signUrl: newUrl, documentoTitulo: docTitle, expiresAt } = json.data;

      setToken(newToken);
      currentTokenRef.current = newToken;
      setQrDataUrl(newQr);
      setSignUrl(newUrl);
      if (docTitle) setTitulo(docTitle);

      // Calcular segundos para expiración
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));

      // Iniciar timer de cuenta regresiva
      countdownTimerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setEstado('expired');
            cleanupListeners();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 3. Conectar a SSE para actualizaciones en tiempo real
      setupSSE(newToken);

      // 4. Iniciar Polling de respaldo cada 3 segundos
      setupPollingFallback(newToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [cleanupListeners, documentoId, alumnoId, tutorId, documentoTitulo, tipoDocumento]);

  // Manejo de firma completada
  const handleCompleted = useCallback(
    (data: any) => {
      setEstado('completed');
      cleanupListeners();

      const previewUrl = data?.pngUrl || `/api/firma/archivo/${currentTokenRef.current}`;
      setSignaturePreview(previewUrl);
      setSignedAt(data?.signedAt || new Date().toISOString());
      if (data?.tutorNombre) setTutorNombre(data.tutorNombre);

      if (onSignatureCompleted && currentTokenRef.current) {
        onSignatureCompleted({
          token: currentTokenRef.current,
          pngUrl: previewUrl,
          signedAt: data?.signedAt || new Date().toISOString(),
          documentoId,
          tutorNombre: data?.tutorNombre,
        });
      }
    },
    [cleanupListeners, documentoId, onSignatureCompleted]
  );

  // Configuración de SSE
  const setupSSE = (targetToken: string) => {
    try {
      const es = new EventSource(`/api/firma/sse/${targetToken}`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'ping') return;

          if (event.estado === 'opened') {
            setEstado('opened');
          } else if (event.estado === 'signing') {
            setEstado('signing');
          } else if (event.estado === 'completed') {
            handleCompleted(event.data);
          } else if (event.estado === 'expired') {
            setEstado('expired');
            cleanupListeners();
          } else if (event.estado === 'cancelled') {
            setEstado('cancelled');
            cleanupListeners();
          }
        } catch {}
      };

      es.onerror = () => {
        // En caso de fallo o timeout de SSE, el polling de respaldo sigue activo
      };
    } catch {}
  };

  // Configuración de Polling de respaldo
  const setupPollingFallback = (targetToken: string) => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/firma/status/${targetToken}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          const status = json.data.estado;
          if (status === 'completed') {
            handleCompleted({
              pngUrl: json.data.pngUrl,
              signedAt: json.data.signedAt,
              tutorNombre: json.data.tutorNombre,
            });
          } else if (status === 'opened') {
            setEstado('opened');
          } else if (status === 'signing') {
            setEstado('signing');
          } else if (status === 'expired') {
            setEstado('expired');
            cleanupListeners();
          } else if (status === 'cancelled') {
            setEstado('cancelled');
            cleanupListeners();
          }
        }
      } catch {}
    }, 3000);
  };

  // Efecto al abrir/cerrar modal
  useEffect(() => {
    if (open) {
      initSession();
    } else {
      cleanupListeners();
      // Si se cierra mientras estaba pendiente/abierta, cancelar en backend
      if (currentTokenRef.current && (estado === 'pending' || estado === 'opened' || estado === 'signing')) {
        fetch('/api/firma/cancelar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentTokenRef.current }),
        }).catch(() => {});
      }
    }

    return () => {
      cleanupListeners();
    };
  }, [open, initSession, cleanupListeners]);

  // Copiar enlace al portapapeles
  const handleCopyLink = () => {
    if (!signUrl) return;
    navigator.clipboard.writeText(signUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formato mm:ss del cronómetro
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-xs">
            {estado === 'completed' ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Smartphone className="w-6 h-6" />
            )}
          </div>
          <DialogTitle className="text-xl font-black tracking-tight text-foreground">
            {estado === 'completed' ? 'Firma Digital Recibida' : 'Firmar con Teléfono Celular'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            {titulo}
          </DialogDescription>
        </DialogHeader>

        {/* 1. ESTADO DE CARGA */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">
              Generando sesión criptográfica temporal y código QR...
            </p>
          </div>
        )}

        {/* 2. ERROR AL CREAR */}
        {!loading && errorMsg && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <p className="text-xs text-destructive font-medium">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={initSession}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
            </Button>
          </div>
        )}

        {/* 3. FLUJO ACTIVO: QR Y ESPERA DE FIRMA */}
        {!loading && !errorMsg && estado !== 'completed' && (
          <div className="space-y-4">
            {/* Contenedor del Código QR */}
            <div className="relative mx-auto w-64 h-64 p-3 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center group">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Código QR para firmar"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <QrCode className="w-20 h-20 text-slate-300" />
              )}

              {/* Overlay de estado si el teléfono está conectado o expirado */}
              {estado === 'opened' && (
                <div className="absolute inset-0 bg-primary/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-primary-foreground p-4 text-center animate-in fade-in duration-300">
                  <Smartphone className="w-10 h-10 mb-2 animate-bounce" />
                  <span className="font-bold text-sm">📱 Teléfono conectado</span>
                  <span className="text-[11px] opacity-90 mt-1">
                    El usuario tiene abierta el área de firma en su pantalla
                  </span>
                </div>
              )}

              {estado === 'signing' && (
                <div className="absolute inset-0 bg-indigo-600/85 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-white p-4 text-center animate-in fade-in duration-300">
                  <Loader2 className="w-10 h-10 mb-2 animate-spin" />
                  <span className="font-bold text-sm">✍️ Dibujando firma...</span>
                  <span className="text-[11px] opacity-90 mt-1">
                    Capturando trazos manuscritos en tiempo real
                  </span>
                </div>
              )}

              {estado === 'expired' && (
                <div className="absolute inset-0 bg-destructive/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-white p-4 text-center animate-in fade-in duration-300">
                  <Clock className="w-10 h-10 mb-2" />
                  <span className="font-bold text-sm">Sesión Expirada</span>
                  <span className="text-[11px] opacity-90 mt-1">Superó los 5 minutos de validez</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 text-xs font-semibold"
                    onClick={initSession}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Generar Nuevo QR
                  </Button>
                </div>
              )}
            </div>

            {/* Píldora de Estado en Tiempo Real */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 border text-xs">
              <div className="flex items-center gap-2">
                {estado === 'pending' && (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span className="text-muted-foreground font-medium">Esperando escaneo con la cámara...</span>
                  </>
                )}
                {estado === 'opened' && (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    <span className="text-primary font-semibold">Teléfono conectado</span>
                  </>
                )}
                {estado === 'signing' && (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Dibujando trazo manuscrito</span>
                  </>
                )}
              </div>

              {/* Cronómetro de expiración */}
              <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground" title="Tiempo de expiración">
                <Clock className="w-3.5 h-3.5" />
                <span>{timeFormatted}</span>
              </div>
            </div>

            {/* Acciones de Enlace: Copiar o Probar */}
            {signUrl && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1 h-8 text-[11px] font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> ¡Enlace Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Enlace
                    </>
                  )}
                </Button>

                <a
                  href={signUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-md text-[11px] font-medium border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Abrir en otra pestaña para simular teléfono celular"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar en pestaña</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* 4. ESTADO: FIRMA COMPLETADA EXITOSAMENTE */}
        {!loading && estado === 'completed' && (
          <div className="space-y-4 py-2 animate-in fade-in zoom-in-95">
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Firma recibida exitosamente</span>
              </div>

              {/* Vista previa de la firma */}
              {signaturePreview && (
                <div className="bg-white rounded-xl p-3 border shadow-xs max-w-[280px] mx-auto">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">
                    Vista previa de la firma capturada:
                  </span>
                  <div className="w-full h-24 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signaturePreview}
                      alt="Firma del tutor capturada"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  {tutorNombre && (
                    <span className="text-[11px] font-medium text-foreground block mt-1">
                      Aclaración: {tutorNombre}
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                La firma manuscrita fue estampada en el PDF y asociada al legajo del estudiante en el sistema.
              </p>
            </div>

            <Button
              type="button"
              variant="brand"
              className="w-full h-10 font-bold"
              onClick={() => onOpenChange(false)}
            >
              Continuar con el Trámite
            </Button>
          </div>
        )}

        {/* Footer con botón de cancelar */}
        {estado !== 'completed' && (
          <DialogFooter className="sm:justify-between pt-2 border-t mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar solicitud
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
