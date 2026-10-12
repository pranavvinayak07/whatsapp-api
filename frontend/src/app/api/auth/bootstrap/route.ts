import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';

    const backendRes = await fetch(`${internalApiUrl}/admin/api/auth/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Bootstrap request failed' },
      { status: 500 }
    );
  }
}
