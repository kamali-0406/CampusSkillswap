const e = import.meta.env;
const hasPool = Boolean(e.VITE_COGNITO_USER_POOL_ID && e.VITE_COGNITO_CLIENT_ID && e.VITE_AWS_REGION);

export const env = {
  // 'cognito' = real AWS Cognito. 'dev' = fake local auth served by backend/local-server (never in production builds).
  authMode: e.VITE_AUTH_MODE || (hasPool ? 'cognito' : e.DEV ? 'dev' : 'cognito'),
  region: e.VITE_AWS_REGION || '',
  userPoolId: e.VITE_COGNITO_USER_POOL_ID || '',
  clientId: e.VITE_COGNITO_CLIENT_ID || '',
  apiBaseUrl: (e.VITE_API_BASE_URL || (e.DEV ? 'http://localhost:4000' : '')).replace(/\/$/, '')
};

export const isDevAuth = env.authMode === 'dev';
export const missingConfig = [
  ['VITE_AWS_REGION', env.region], ['VITE_COGNITO_USER_POOL_ID', env.userPoolId],
  ['VITE_COGNITO_CLIENT_ID', env.clientId], ['VITE_API_BASE_URL', env.apiBaseUrl]
].filter(([, v]) => !v).map(([k]) => k).filter((k) => !(isDevAuth && k !== 'VITE_API_BASE_URL'));
