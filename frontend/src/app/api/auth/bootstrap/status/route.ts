import { NextResponse, type NextRequest } from 'next/server';

export async function GET() {
  try {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';
    const backendRes = await fetch(`${internalApiUrl}/admin/api/auth/bootstrap/status`, {
      cache: 'no-store',
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { bootstrapNeeded: false, error: err?.message },
      { status: 500 }
    );
  }
}
