// src/lib/signature/session-events.ts
import { EventEmitter } from 'events';

// Usar una instancia en globalThis para persistencia entre invocaciones de Route Handlers en desarrollo
const globalForEvents = globalThis as unknown as {
  signatureEventEmitter?: EventEmitter;
};

export const signatureEvents = globalForEvents.signatureEventEmitter ?? new EventEmitter();
signatureEvents.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.signatureEventEmitter = signatureEvents;
}

export interface SessionStatusEvent {
  type: 'status' | 'completed' | 'cancelled' | 'expired';
  estado: 'pending' | 'opened' | 'signing' | 'completed' | 'cancelled' | 'expired';
  token: string;
  data?: any;
  timestamp: string;
}

/**
 * Notifica a los suscriptores (ej. clientes SSE en la PC) sobre un cambio en la sesión de firma.
 */
export function emitSessionEvent(token: string, payload: Omit<SessionStatusEvent, 'token' | 'timestamp'>) {
  const fullEvent: SessionStatusEvent = {
    ...payload,
    token,
    timestamp: new Date().toISOString(),
  };
  signatureEvents.emit(`session:${token}`, fullEvent);
}

/**
 * Suscribe un callback a los eventos de una sesión específica.
 * Retorna la función de desuscripción.
 */
export function onSessionEvent(token: string, callback: (event: SessionStatusEvent) => void): () => void {
  const eventName = `session:${token}`;
  signatureEvents.on(eventName, callback);
  return () => {
    signatureEvents.off(eventName, callback);
  };
}
