// src/app/api/firma/sse/[token]/route.ts
import { prisma } from '@/lib/prisma';
import { onSessionEvent, SessionStatusEvent } from '@/lib/signature/session-events';
import { getSignatureDataUrl } from '@/lib/signature/crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;

  if (!token) {
    return new Response('Token no provisto', { status: 400 });
  }

  const session = await prisma.firmaSesion.findUnique({
    where: { token },
  });

  if (!session) {
    return new Response('Sesión de firma no encontrada', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const safeEnqueue = (payload: string) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            isClosed = true;
          }
        }
      };

      // 1. Enviar estado inicial actual de la sesión
      const initialPayload = JSON.stringify({
        type: 'status',
        estado: session.estado,
        token: session.token,
        documentoTitulo: session.documentoTitulo,
        expiresAt: session.expiresAt.toISOString(),
        signature: session.estado === 'completed' ? { pngUrl: getSignatureDataUrl(session) } : null,
      });
      safeEnqueue(`data: ${initialPayload}\n\n`);

      // Si la sesión ya culminó, cerrar la conexión
      if (session.estado === 'completed' || session.estado === 'cancelled' || session.estado === 'expired') {
        isClosed = true;
        try {
          controller.close();
        } catch {}
        return;
      }

      // 2. Suscribir a eventos en tiempo real
      const unsubscribe = onSessionEvent(token, (event: SessionStatusEvent) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);

        if (event.estado === 'completed' || event.estado === 'cancelled' || event.estado === 'expired') {
          cleanup();
        }
      });

      // 3. Heartbeat cada 15 segundos para evitar desconexiones por timeout de red
      const heartbeatTimer = setInterval(() => {
        safeEnqueue(`: heartbeat\n\n`);
      }, 15000);

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeatTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      // 4. Limpiar si el cliente aborta la conexión
      req.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
