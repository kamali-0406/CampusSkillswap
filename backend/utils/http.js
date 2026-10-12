import { logger } from './logger.js';

export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const badRequest = (message, code = 'VALIDATION_ERROR') => new AppError(400, code, message);
export const forbidden = (message = 'You are not allowed to do that.') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message, code = 'NOT_FOUND') => new AppError(404, code, message);
export const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);

const DB_UNAVAILABLE = ['ProvisionedThroughputExceededException', 'ThrottlingException', 'ServiceUnavailable',
  'InternalServerError', 'RequestLimitExceeded', 'ResourceNotFoundException', 'TimeoutError', 'CredentialsProviderError'];

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...(process.env.ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN } : {})
  },
  body: JSON.stringify(body)
});

/** Reads the caller from the Cognito JWT claims that API Gateway already validated. */
export function getCaller(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims || event.requestContext?.authorizer?.claims;
  if (!claims?.sub) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  const email = claims.email || '';
  return { id: claims.sub, email, name: claims.name || email.split('@')[0] || 'Student' };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw badRequest('Request body must be valid JSON.', 'INVALID_JSON');
  }
}

function matchRoute(pattern, path) {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('{')) params[a[i].slice(1, -1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

/**
 * Builds a Lambda handler (API Gateway HTTP API v2 or REST v1 proxy events)
 * from a route table: [{ method, path, status?, handle({caller, params, query, body}) }]
 */
export function createRouter(routes) {
  return async function handler(event) {
    const requestId = event.requestContext?.requestId;
    try {
      const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
      let path = event.rawPath || event.path || '/';
      const stage = event.requestContext?.stage;
      if (stage && stage !== '$default' && path.startsWith(`/${stage}/`)) path = path.slice(stage.length + 1);

      for (const route of routes) {
        if (route.method !== method) continue;
        const params = matchRoute(route.path, path);
        if (!params) continue;
        const caller = getCaller(event);
        const data = await route.handle({
          caller, params, query: event.queryStringParameters || {},
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? parseBody(event) : {}
        });
        return respond(route.status || 200, { data });
      }
      throw notFound('Route not found.', 'ROUTE_NOT_FOUND');
    } catch (err) {
      if (err instanceof AppError) {
        return respond(err.status, { error: { code: err.code, message: err.message } });
      }
      logger.error('Unhandled error', { requestId, name: err.name, message: err.message });
      if (DB_UNAVAILABLE.includes(err.name)) {
        return respond(503, { error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is temporarily unavailable. Please try again shortly.' } });
      }
      return respond(500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } });
    }
  };
}
