import { normalizeSkill } from './skills.js';

/**
 * Skill matching — the single place to change how compatibility is scored.
 *
 * Inputs are plain objects: { teach: string[], learn: string[] }.
 *
 *   youCanLearn  = what I want to learn    ∩ what they teach
 *   theyCanLearn = what they want to learn ∩ what I teach
 *
 * Coverage (how much of each person's wish list the other can satisfy):
 *   myCoverage    = |youCanLearn|  / |my learn list|
 *   theirCoverage = |theyCanLearn| / |their learn list|
 *
 * percentage = round( (WEIGHTS.me * myCoverage + WEIGHTS.them * theirCoverage) * 100 )
 *
 *   A teaches Python, wants Java  +  B teaches Java, wants Python  => 100% (mutual)
 *   Only one direction overlaps                                    => at most 50% (partial)
 */
export const WEIGHTS = { me: 0.5, them: 0.5 };

const indexByKey = (list) => {
  const map = new Map();
  for (const name of list || []) {
    const key = normalizeSkill(name);
    if (key && !map.has(key)) map.set(key, name);
  }
  return map;
};

export function computeMatch(me, other) {
  const myTeach = indexByKey(me.teach);
  const myLearn = indexByKey(me.learn);
  const theirTeach = indexByKey(other.teach);
  const theirLearn = indexByKey(other.learn);

  const youCanLearn = [...myLearn.keys()].filter((k) => theirTeach.has(k)).map((k) => theirTeach.get(k));
  const theyCanLearn = [...theirLearn.keys()].filter((k) => myTeach.has(k)).map((k) => myTeach.get(k));

  const myCoverage = myLearn.size ? youCanLearn.length / myLearn.size : 0;
  const theirCoverage = theirLearn.size ? theyCanLearn.length / theirLearn.size : 0;
  const percentage = Math.round((WEIGHTS.me * myCoverage + WEIGHTS.them * theirCoverage) * 100);

  let type = 'none';
  if (youCanLearn.length && theyCanLearn.length) type = 'mutual';
  else if (youCanLearn.length || theyCanLearn.length) type = 'partial';

  return { percentage, type, youCanLearn, theyCanLearn };
}
