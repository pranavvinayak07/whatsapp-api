import { NextResponse, type NextRequest } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET || 'vivegaa_session_secret_default_32chars';

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function base64UrlToUint8Array(str: string): Uint8Array {
  const bin = base64UrlDecode(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function verifyToken(token: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlToUint8Array(signatureB64);
    const dataBytes = enc.encode(`${headerB64}.${payloadB64}`);
    const isSigValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      dataBytes
    );

    if (!isSigValid) return { valid: false };

    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    // Check expiration timestamp
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  const authResult = token ? await verifyToken(token) : { valid: false };
  const isAuthenticated = authResult.valid;

  // Handle Root URL: GET /
  if (pathname === '/') {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = isAuthenticated ? '/dashboard' : '/login';
    const res = NextResponse.redirect(targetUrl);
    if (!isAuthenticated && token) {
      res.cookies.delete('token');
    }
    return addSecurityHeaders(res);
  }

  // Handle Login URL: GET /login
  if (pathname === '/login') {
    if (isAuthenticated) {
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = '/dashboard';
      return addSecurityHeaders(NextResponse.redirect(targetUrl));
    }
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  // For all protected routes (dashboard, connections, inbox, settings, etc.)
  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Preserve intended redirect if not default
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    }
    const res = NextResponse.redirect(loginUrl);
    if (token) {
      res.cookies.delete('token');
    }
    return addSecurityHeaders(res);
  }

  // Authenticated user accessing protected routes
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Intercept all paths except Next.js internals, API proxy, and static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
