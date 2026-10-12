export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = `API Request failed with status ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      // ignore json parse error
    }

    // Auto-redirect to login with session expired banner if session expired or invalid
    if (
      res.status === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.href = '/login?expired=true';
    }

    throw new Error(errorMsg);
  }

  return res.json();
}
