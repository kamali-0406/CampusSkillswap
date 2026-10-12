// LOCAL DEVELOPMENT ONLY. Runs the same Lambda handlers behind Express, using the in-memory repository
// and a fake sign-in service so you can demo the whole app without any AWS account.
// It is never deployed — AWS API Gateway + Lambda + Cognito replace it.
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { getRepository } from '../services/repository.js';
import { seedDemoData } from '../services/memoryRepository.js';
import { handler as users } from '../lambdas/users/index.js';
import { handler as skills } from '../lambdas/skills/index.js';
import { handler as matching } from '../lambdas/matching/index.js';
import { handler as requests } from '../lambdas/requests/index.js';
import { handler as ratings } from '../lambdas/ratings/index.js';
import { devAuthRouter, claimsFromAuthHeader } from './devAuth.js';

process.env.DATA_STORE = process.env.DATA_STORE || 'memory';
if (process.env.DATA_STORE !== 'memory') {
  console.warn('[local-server] DATA_STORE is not "memory": this server will use DynamoDB with your local AWS credentials.');
}

const lambdas = { users, skills, matches: matching, requests, ratings };
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/dev-auth', devAuthRouter());

app.use(async (req, res) => {
  const lambda = lambdas[req.path.split('/')[1]];
  if (!lambda) return res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found.' } });
  const claims = claimsFromAuthHeader(req.headers.authorization);
  const event = {
    version: '2.0', rawPath: req.path, queryStringParameters: req.query, headers: req.headers,
    body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body ?? {}) : undefined,
    requestContext: { requestId: randomUUID(), http: { method: req.method, path: req.path }, authorizer: claims ? { jwt: { claims } } : undefined }
  };
  const result = await lambda(event);
  res.status(result.statusCode).set(result.headers).send(result.body);
});

// Malformed JSON bodies etc.
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
});

const port = Number(process.env.PORT) || 4000;
if (process.env.DATA_STORE === 'memory' && process.env.SEED_DEMO !== 'false') await seedDemoData(getRepository());
app.listen(port, () => {
  console.log(`Campus SkillSwap local API  ->  http://localhost:${port}`);
  console.log('Data store:', process.env.DATA_STORE, '(in-memory data resets when this server restarts)');
});
