import { env } from '../config/env';
import { auth } from './authService';
import { AppError } from '../utils/errors';

async function request(method, path, body) {
  if (!env.apiBaseUrl) throw new AppError('CONFIG_MISSING', 'The API address is not configured. Set VITE_API_BASE_URL.');
  const token = await auth.getIdToken();
  let res;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new AppError('NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }
  const json = await res.json().catch(() => null);
  if (res.status === 401) window.dispatchEvent(new Event('auth:expired'));
  if (!res.ok) {
    const fallback = res.status >= 500 ? 'The service is having trouble right now. Please try again shortly.' : 'The request could not be completed.';
    throw new AppError(json?.error?.code || json?.code || 'REQUEST_FAILED', json?.error?.message || json?.message || fallback, res.status);
  }
  return json?.data;
}

export const http = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b ?? {}),
  del: (p) => request('DELETE', p)
};
