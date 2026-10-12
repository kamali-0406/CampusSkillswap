import { randomUUID } from 'node:crypto';
import { getRepository } from './repository.js';
import { ensureProfile } from './userService.js';
import { notify } from './notifier.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/http.js';
import { normalizeSkill } from '../utils/skills.js';

export const STATUS = { PENDING: 'Pending', ACCEPTED: 'Accepted', REJECTED: 'Rejected', COMPLETED: 'Completed' };
const MAX_SKILLS_PER_REQUEST = 10;

const cleanList = (value, label) => {
  if (!Array.isArray(value)) throw badRequest(`${label} must be a list.`);
  const seen = new Set();
  const out = [];
  for (const v of value) {
    const key = normalizeSkill(v);
    if (key && !seen.has(key)) { seen.add(key); out.push(String(v).trim().replace(/\s+/g, ' ')); }
  }
  if (out.length > MAX_SKILLS_PER_REQUEST) throw badRequest(`${label} can have at most ${MAX_SKILLS_PER_REQUEST} skills.`);
  return out;
};

const ownedKeys = (skills, type) => new Set(skills.filter((s) => s.type === type).map((s) => s.key));

export async function createRequest(caller, body) {
  const repo = getRepository();
  const toUserId = String(body.toUserId || '').trim();
  if (!toUserId) throw badRequest('Choose a student to send the request to.');
  if (toUserId === caller.id) throw badRequest('You cannot send an exchange request to yourself.', 'SELF_REQUEST');

  const me = await ensureProfile(caller);
  const recipient = await repo.getProfile(toUserId);
  if (!recipient) throw notFound('That student could not be found.', 'USER_NOT_FOUND');

  const offered = cleanList(body.offeredSkills ?? [], 'Offered skills');
  const requested = cleanList(body.requestedSkills, 'Requested skills');
  if (!requested.length) throw badRequest('Pick at least one skill you want to learn from this student.');
  const message = String(body.message || '').trim();
  if (message.length > 300) throw badRequest('Message must be 300 characters or fewer.');

  // Server-side check: offered skills must be ones I teach, requested ones must be ones they teach.
  const [mySkills, theirSkills] = await Promise.all([repo.listSkills(caller.id), repo.listSkills(toUserId)]);
  const iTeach = ownedKeys(mySkills, 'teach');
  const theyTeach = ownedKeys(theirSkills, 'teach');
  if (offered.some((s) => !iTeach.has(normalizeSkill(s)))) throw badRequest('You can only offer skills listed under "Skills I can teach".');
  if (requested.some((s) => !theyTeach.has(normalizeSkill(s)))) throw badRequest('That student does not teach one of the requested skills.');

  // Duplicate protection: an open request already exists between these two students.
  const [sent, received] = await Promise.all([repo.listSentRequests(caller.id), repo.listReceivedRequests(caller.id)]);
  const open = [STATUS.PENDING, STATUS.ACCEPTED];
  if (sent.some((r) => r.toUserId === toUserId && open.includes(r.status))) {
    throw conflict('You already have an open request with this student.', 'REQUEST_EXISTS');
  }
  if (received.some((r) => r.fromUserId === toUserId && open.includes(r.status))) {
    throw conflict('This student already sent you a request. Check your incoming requests.', 'REQUEST_EXISTS');
  }

  const now = new Date().toISOString();
  const request = {
    requestId: randomUUID(), fromUserId: caller.id, fromName: me.name, toUserId, toName: recipient.name,
    offeredSkills: offered, requestedSkills: requested, message, status: STATUS.PENDING, createdAt: now, updatedAt: now
  };
  await repo.putRequest(request);
  await notify('REQUEST_CREATED', { requestId: request.requestId, recipientUserId: toUserId, fromName: me.name, requestedSkills: requested });
  return request;
}

export const listSent = (caller) => getRepository().listSentRequests(caller.id);
export const listReceived = (caller) => getRepository().listReceivedRequests(caller.id);

async function respond(caller, requestId, status, eventType) {
  const repo = getRepository();
  const req = await repo.getRequest(requestId);
  if (!req) throw notFound('That request could not be found.', 'REQUEST_NOT_FOUND');
  if (req.toUserId !== caller.id) throw forbidden('Only the student who received this request can respond to it.');
  const now = new Date().toISOString();
  const updated = await repo.transitionRequest(requestId, [STATUS.PENDING], { status, updatedAt: now, respondedAt: now });
  if (!updated) throw conflict(`This request has already been ${req.status.toLowerCase()}.`, 'REQUEST_NOT_PENDING');
  await notify(eventType, { requestId, recipientUserId: req.fromUserId, byName: req.toName });
  return updated;
}
export const acceptRequest = (caller, id) => respond(caller, id, STATUS.ACCEPTED, 'REQUEST_ACCEPTED');
export const rejectRequest = (caller, id) => respond(caller, id, STATUS.REJECTED, 'REQUEST_REJECTED');

/** Either participant can mark an accepted exchange as completed (unlocks ratings). */
export async function completeRequest(caller, requestId) {
  const repo = getRepository();
  const req = await repo.getRequest(requestId);
  if (!req) throw notFound('That request could not be found.', 'REQUEST_NOT_FOUND');
  if (![req.fromUserId, req.toUserId].includes(caller.id)) throw forbidden('You are not part of this exchange.');
  const now = new Date().toISOString();
  const updated = await repo.transitionRequest(requestId, [STATUS.ACCEPTED], { status: STATUS.COMPLETED, updatedAt: now, completedAt: now });
  if (!updated) throw conflict('Only accepted exchanges can be marked as completed.', 'REQUEST_NOT_ACCEPTED');
  const other = caller.id === req.fromUserId ? req.toUserId : req.fromUserId;
  await notify('EXCHANGE_COMPLETED', { requestId, recipientUserId: other });
  return updated;
}
