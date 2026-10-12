import { getRepository } from './repository.js';
import { badRequest, notFound } from '../utils/http.js';

const groupSkills = (skills) => {
  const sorted = [...skills].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const pick = (type) => sorted.filter((s) => s.type === type).map((s) => ({ skillId: s.skillId, name: s.name }));
  return { teach: pick('teach'), learn: pick('learn') };
};

/** First sign-in creates the profile from the Cognito claims. */
export async function ensureProfile(caller) {
  const repo = getRepository();
  let profile = await repo.getProfile(caller.id);
  if (!profile) {
    const now = new Date().toISOString();
    profile = { userId: caller.id, name: caller.name, email: caller.email, studentId: '', bio: '', createdAt: now, updatedAt: now };
    await repo.putProfile(profile);
  }
  return profile;
}

export async function getMe(caller) {
  const profile = await ensureProfile(caller);
  const skills = await getRepository().listSkills(caller.id);
  return { ...profile, skills: groupSkills(skills) };
}

export async function updateMe(caller, body) {
  const profile = await ensureProfile(caller);
  const name = String(body.name ?? profile.name).trim();
  const studentId = String(body.studentId ?? profile.studentId ?? '').trim();
  const bio = String(body.bio ?? profile.bio ?? '').trim();
  if (name.length < 2 || name.length > 80) throw badRequest('Name must be between 2 and 80 characters.');
  if (studentId.length > 30 || !/^[\w\- /]*$/.test(studentId)) throw badRequest('Student ID can contain letters, numbers, dashes and slashes (30 characters max).');
  if (bio.length > 300) throw badRequest('Bio must be 300 characters or fewer.');
  const updated = { ...profile, name, studentId, bio, updatedAt: new Date().toISOString() };
  await getRepository().putProfile(updated);
  const skills = await getRepository().listSkills(caller.id);
  return { ...updated, skills: groupSkills(skills) };
}

/** Public directory — never exposes email addresses. */
export async function listUsers(caller) {
  const profiles = await getRepository().listProfiles();
  return profiles
    .filter((p) => p.userId !== caller.id)
    .map((p) => ({ userId: p.userId, name: p.name, bio: p.bio }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUser(caller, userId) {
  if (userId === caller.id) return getMe(caller);
  const repo = getRepository();
  const profile = await repo.getProfile(userId);
  if (!profile) throw notFound('That student could not be found.', 'USER_NOT_FOUND');
  const skills = await repo.listSkills(userId);
  return { userId: profile.userId, name: profile.name, bio: profile.bio, studentId: profile.studentId, skills: groupSkills(skills) };
}
