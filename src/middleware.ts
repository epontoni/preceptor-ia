// src/middleware.ts
// Protección de acceso: toda la aplicación (páginas y API) exige usuario y contraseña (HTTP Basic Auth),
// excepto el flujo público que usa el teléfono del tutor para firmar, que está protegido por un
// token aleatorio de 256 bits, de un solo uso y con expiración.
//
// Variables de entorno: APP_AUTH_USER y APP_AUTH_PASSWORD (obligatorias en producción).
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATTERNS: RegExp[] = [
  /^\/firmar\/[A-Za-z0-9]+\/?$/, // página de firma del teléfono
  /^\/api\/firma\/sesion\/[A-Za-z0-9]+\/?$/, // el teléfono abre la sesión
  /^\/api\/firma\/completar\/?$/, // el teléfono envía la firma
  /^\/api\/firma\/notificar\/?$/, // el teléfono informa que está firmando
];

function safeEqual(a: string, b: string): boolean {
  // Comparación en tiempo constante (sin timingSafeEqual: Edge runtime)
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="preceptor-ia", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATTERNS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const expectedUser = process.env.APP_AUTH_USER;
  const expectedPass = process.env.APP_AUTH_PASSWORD;

  if (!expectedUser || !expectedPass) {
    if (process.env.NODE_ENV === 'production') {
      // Falla cerrada: sin credenciales configuradas la app NO se expone
      return new NextResponse('Servidor sin credenciales configuradas (APP_AUTH_USER / APP_AUTH_PASSWORD).', {
        status: 503,
      });
    }
    return NextResponse.next(); // desarrollo local
  }

  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return unauthorized();

  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  const okUser = safeEqual(user, expectedUser);
  const okPass = safeEqual(pass, expectedPass);
  if (!(okUser && okPass)) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Excluye solo recursos estáticos de Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

