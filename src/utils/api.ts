import { getCsrfToken } from './cookies';

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const attemptRequest = async (allowRetry: boolean): Promise<Response> => {
    const headers = new Headers(options.headers);
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const needsRefresh =
        response.status === 401 ||
        (response.status === 403 &&
          (await isInvalidCsrfResponse(response.clone())));

      if (needsRefresh && allowRetry) {
        const refreshed = await refreshSessionTokens();
        if (refreshed) {
          return attemptRequest(false);
        }
      }

      return response;
    } catch (error) {
      if (allowRetry) {
        const refreshed = await refreshSessionTokens();
        if (refreshed) {
          return attemptRequest(false);
        }
      }
      throw error;
    }
  };

  return attemptRequest(true);
}

async function isInvalidCsrfResponse(response: Response): Promise<boolean> {
  try {
    const data = await response.json();
    return data?.error === 'Invalid CSRF token';
  } catch {
    return false;
  }
}

async function refreshSessionTokens(): Promise<boolean> {
  try {
    const refreshResponse = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    });

    return refreshResponse.ok;
  } catch {
    return false;
  }
}


