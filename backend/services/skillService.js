import { randomUUID } from 'node:crypto';
import { getRepository } from './repository.js';
import { ensureProfile } from './userService.js';
import { badRequest, conflict, notFound } from '../utils/http.js';
import { validateSkillName, MAX_SKILLS_PER_USER } from '../utils/skills.js';

const TYPES = ['teach', 'learn'];
const view = ({ skillId, type, name, createdAt, updatedAt }) => ({ skillId, type, name, createdAt, updatedAt });

export async function listMine(caller) {
  await ensureProfile(caller);
  const skills = await getRepository().listSkills(caller.id);
  return skills.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)).map(view);
}

export async function addSkill(caller, body) {
  const repo = getRepository();
  if (!TYPES.includes(body.type)) throw badRequest('Skill type must be "teach" or "learn".');
  const v = validateSkillName(body.name);
  if (!v.ok) throw badRequest(v.error);
  await ensureProfile(caller);
  const existing = await repo.listSkills(caller.id);
  if (existing.length >= MAX_SKILLS_PER_USER) throw badRequest(`You can list up to ${MAX_SKILLS_PER_USER} skills.`, 'SKILL_LIMIT');
  if (existing.some((s) => s.type === body.type && s.key === v.key)) throw conflict(`"${v.name}" is already in this list.`, 'SKILL_EXISTS');
  const now = new Date().toISOString();
  const skill = { userId: caller.id, skillId: randomUUID(), type: body.type, name: v.name, key: v.key, createdAt: now, updatedAt: now };
  await repo.putSkill(skill);
  return view(skill);
}

export async function updateSkill(caller, skillId, body) {
  const repo = getRepository();
  const skill = await repo.getSkill(caller.id, skillId); // key includes caller.id => users can only touch their own skills
  if (!skill) throw notFound('That skill could not be found.', 'SKILL_NOT_FOUND');
  const v = validateSkillName(body.name ?? skill.name);
  if (!v.ok) throw badRequest(v.error);
  const type = body.type ?? skill.type;
  if (!TYPES.includes(type)) throw badRequest('Skill type must be "teach" or "learn".');
  const all = await repo.listSkills(caller.id);
  if (all.some((s) => s.skillId !== skillId && s.type === type && s.key === v.key)) throw conflict(`"${v.name}" is already in this list.`, 'SKILL_EXISTS');
  const updated = { ...skill, name: v.name, key: v.key, type, updatedAt: new Date().toISOString() };
  await repo.putSkill(updated);
  return view(updated);
}

export async function removeSkill(caller, skillId) {
  const repo = getRepository();
  const skill = await repo.getSkill(caller.id, skillId);
  if (!skill) throw notFound('That skill could not be found.', 'SKILL_NOT_FOUND');
  await repo.deleteSkill(caller.id, skillId);
  return { skillId, deleted: true };
}
