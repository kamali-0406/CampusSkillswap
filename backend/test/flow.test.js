// End-to-end service flow using the in-memory repository.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATA_STORE = 'memory';
const { handler: skills } = await import('../lambdas/skills/index.js');
const { handler: matching } = await import('../lambdas/matching/index.js');
const { handler: requests } = await import('../lambdas/requests/index.js');
const { handler: ratings } = await import('../lambdas/ratings/index.js');

const call = async (fn, user, method, path, body) => {
  const r = await fn({
    rawPath: path, body: body ? JSON.stringify(body) : undefined,
    requestContext: { http: { method }, authorizer: { jwt: { claims: { sub: user, email: `${user}@x.com`, name: user.toUpperCase() } } } }
  });
  return { status: r.statusCode, ...JSON.parse(r.body) };
};
const A = 'aaa', B = 'bbb';

test('full exchange lifecycle', async () => {
  await call(skills, A, 'POST', '/skills', { type: 'teach', name: 'Python' });
  await call(skills, A, 'POST', '/skills', { type: 'learn', name: 'Java' });
  await call(skills, B, 'POST', '/skills', { type: 'teach', name: 'java' });
  await call(skills, B, 'POST', '/skills', { type: 'learn', name: 'PYTHON' });
  assert.equal((await call(skills, A, 'POST', '/skills', { type: 'teach', name: ' python ' })).status, 409);

  const m = await call(matching, A, 'GET', '/matches');
  assert.equal(m.data.length, 1);
  assert.equal(m.data[0].match.percentage, 100);
  assert.equal(m.data.some((c) => c.userId === A), false);

  assert.equal((await call(requests, A, 'POST', '/requests', { toUserId: A, requestedSkills: ['Python'] })).status, 400);
  const created = await call(requests, A, 'POST', '/requests', { toUserId: B, offeredSkills: ['Python'], requestedSkills: ['java'] });
  assert.equal(created.status, 201);
  const id = created.data.requestId;
  assert.equal((await call(requests, A, 'POST', '/requests', { toUserId: B, offeredSkills: ['Python'], requestedSkills: ['java'] })).status, 409);
  assert.equal((await call(requests, A, 'PUT', `/requests/${id}/accept`)).status, 403); // sender cannot accept
  assert.equal((await call(requests, 'ccc', 'PUT', `/requests/${id}/accept`)).status, 403); // stranger cannot accept
  assert.equal((await call(requests, B, 'PUT', `/requests/${id}/accept`)).data.status, 'Accepted');
  assert.equal((await call(requests, B, 'PUT', `/requests/${id}/reject`)).status, 409);
  assert.equal((await call(ratings, A, 'POST', '/ratings', { requestId: id, rating: 5 })).status, 400); // not completed yet
  assert.equal((await call(requests, A, 'PUT', `/requests/${id}/complete`)).data.status, 'Completed');
  assert.equal((await call(ratings, A, 'POST', '/ratings', { requestId: id, rating: 5, feedback: 'Great' })).status, 201);
  assert.equal((await call(ratings, A, 'POST', '/ratings', { requestId: id, rating: 4 })).status, 409);
  assert.equal((await call(ratings, B, 'GET', '/ratings')).data.summary.average, 5);
  assert.equal((await call(requests, A, 'GET', '/nope')).status, 404);
});
