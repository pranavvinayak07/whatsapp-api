import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const internalApiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';

  try {
    if (token) {
      await fetch(`${internalApiUrl}/admin/api/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `token=${token}`,
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Ignore backend logout error
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('token');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
