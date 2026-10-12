// Skill normalisation + validation. Matching treats "Python", "python " and "PYTHON" as one skill.
export const MAX_SKILL_LENGTH = 60;
export const MAX_SKILLS_PER_USER = 40;
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N} .+#&/()'-]*$/u;

/** Trim, collapse inner whitespace, keep the user's capitalisation for display. */
export function displaySkill(raw) {
  return String(raw ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

/** Canonical comparison key. */
export function normalizeSkill(raw) {
  return displaySkill(raw).toLowerCase();
}

export function validateSkillName(raw) {
  const name = displaySkill(raw);
  if (!name) return { ok: false, error: 'Skill name is required.' };
  if (name.length > MAX_SKILL_LENGTH) return { ok: false, error: `Skill name must be ${MAX_SKILL_LENGTH} characters or fewer.` };
  if (!ALLOWED.test(name)) return { ok: false, error: "Skill names may contain letters, numbers, spaces and . + # & / ( ) ' - only." };
  return { ok: true, name, key: name.toLowerCase() };
}
