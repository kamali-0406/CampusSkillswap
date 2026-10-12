import { getRepository } from './repository.js';
import { ensureProfile } from './userService.js';
import { computeMatch } from '../utils/matching.js';
import { notFound } from '../utils/http.js';

/** Loads every student with their teach/learn skill names. */
export async function loadDirectory() {
  const repo = getRepository();
  const [profiles, skills] = await Promise.all([repo.listProfiles(), repo.listAllSkills()]);
  const map = new Map(profiles.map((p) => [p.userId, { profile: p, teach: [], learn: [] }]));
  for (const s of skills.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))) {
    map.get(s.userId)?.[s.type]?.push(s.name);
  }
  return map;
}

const toCard = (entry, match) => ({
  userId: entry.profile.userId, name: entry.profile.name, bio: entry.profile.bio,
  teach: entry.teach, learn: entry.learn, match
});

/** All students with a non-zero match, best first. Never includes the caller. */
export async function getMatches(caller) {
  await ensureProfile(caller);
  const dir = await loadDirectory();
  const me = dir.get(caller.id) || { teach: [], learn: [] };
  return [...dir.values()]
    .filter((e) => e.profile.userId !== caller.id)
    .map((e) => toCard(e, computeMatch(me, e)))
    .filter((c) => c.match.percentage > 0)
    .sort((a, b) => b.match.percentage - a.match.percentage || a.name.localeCompare(b.name));
}

export async function getMatchWith(caller, userId) {
  await ensureProfile(caller);
  const dir = await loadDirectory();
  const other = dir.get(userId);
  if (!other || userId === caller.id) throw notFound('That student could not be found.', 'USER_NOT_FOUND');
  return toCard(other, computeMatch(dir.get(caller.id), other));
}
