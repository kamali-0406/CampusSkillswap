// LOCAL DEMO AUTH. Talks to backend/local-server/devAuth.js. Same flow as Cognito, no AWS needed.
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const KEY = 'skillswap.dev.session'; // auth session only - app data always comes from the API
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${env.apiBaseUrl}/dev-auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw Object.assign(new Error('network'), { code: 'NetworkError' });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error?.message), { code: json.error?.code, message: json.error?.message });
  return json.data;
}

export const devAuth = {
  signUp: (p) => post('signup', p),
  confirmSignUp: (p) => post('confirm', p),
  resendCode: (email) => post('resend', { email }),
  async signIn(p) {
    const data = await post('signin', p);
    sessionStorage.setItem(KEY, JSON.stringify(data));
    return data;
  },
  async getSession() { return read(); },
  async getIdToken() { return read()?.idToken ?? null; },
  async signOut() { sessionStorage.removeItem(KEY); },
  forgotPassword: (email) => post('forgot', { email }),
  resetPassword: (p) => post('reset', p)
};

export { AppError };
