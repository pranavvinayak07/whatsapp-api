import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    const backendRes = await fetch(`${internalApiUrl}/admin/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': clientIp,
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    const token = data.token;
    const maxAge = body.rememberMe
      ? 30 * 24 * 60 * 60 // 30 days
      : 7 * 24 * 60 * 60; // 7 days

    const response = NextResponse.json({
      success: true,
      user: data.user,
      sessionId: data.sessionId,
    });

    if (token) {
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}
