import { randomUUID } from 'node:crypto';
import { getRepository } from './repository.js';
import { ensureProfile } from './userService.js';
import { STATUS } from './requestService.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/http.js';

export async function listRatings(caller) {
  const repo = getRepository();
  const [received, given] = await Promise.all([repo.listRatingsReceived(caller.id), repo.listRatingsGiven(caller.id)]);
  const count = received.length;
  const average = count ? Math.round((received.reduce((n, r) => n + r.rating, 0) / count) * 10) / 10 : null;
  return { received, given, summary: { average, count } };
}

export async function createRating(caller, body) {
  const repo = getRepository();
  const rating = Number(body.rating);
  const feedback = String(body.feedback || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Rating must be a whole number from 1 to 5.');
  if (feedback.length > 500) throw badRequest('Feedback must be 500 characters or fewer.');
  if (!body.requestId) throw badRequest('Choose the exchange you want to rate.');

  const me = await ensureProfile(caller);
  const req = await repo.getRequest(String(body.requestId));
  if (!req) throw notFound('That exchange could not be found.', 'REQUEST_NOT_FOUND');
  if (![req.fromUserId, req.toUserId].includes(caller.id)) throw forbidden('You can only rate exchanges you took part in.');
  if (req.status !== STATUS.COMPLETED) throw badRequest('You can rate an exchange after it is marked as completed.', 'REQUEST_NOT_COMPLETED');

  const given = await repo.listRatingsGiven(caller.id);
  if (given.some((r) => r.requestId === req.requestId)) throw conflict('You already rated this exchange.', 'ALREADY_RATED');

  const toUserId = caller.id === req.fromUserId ? req.toUserId : req.fromUserId;
  const toName = caller.id === req.fromUserId ? req.toName : req.fromName;
  const record = {
    ratingId: randomUUID(), requestId: req.requestId, fromUserId: caller.id, fromName: me.name,
    toUserId, toName, rating, feedback, createdAt: new Date().toISOString()
  };
  await repo.putRating(record);
  return record;
}
