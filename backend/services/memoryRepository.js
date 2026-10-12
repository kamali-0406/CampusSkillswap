// DEV / TEST ONLY. Data lives in process memory and disappears on restart.
// Deployed environments must use DATA_STORE=dynamodb.
const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
const clone = (x) => (x ? structuredClone(x) : x);

export function createMemoryRepository() {
  const profiles = new Map();
  const skills = new Map(); // `${userId}#${skillId}`
  const requests = new Map();
  const ratings = new Map();

  return {
    async getProfile(id) { return clone(profiles.get(id)); },
    async putProfile(p) { profiles.set(p.userId, clone(p)); return p; },
    async listProfiles() { return [...profiles.values()].map(clone); },

    async listSkills(userId) { return [...skills.values()].filter((s) => s.userId === userId).map(clone); },
    async getSkill(userId, skillId) { return clone(skills.get(`${userId}#${skillId}`)); },
    async putSkill(s) { skills.set(`${s.userId}#${s.skillId}`, clone(s)); return s; },
    async deleteSkill(userId, skillId) { skills.delete(`${userId}#${skillId}`); },
    async listAllSkills() { return [...skills.values()].map(clone); },

    async putRequest(r) { requests.set(r.requestId, clone(r)); return r; },
    async getRequest(id) { return clone(requests.get(id)); },
    async transitionRequest(id, allowedFrom, patch) {
      const cur = requests.get(id);
      if (!cur || !allowedFrom.includes(cur.status)) return null;
      const next = { ...cur, ...patch };
      requests.set(id, next);
      return clone(next);
    },
    async listSentRequests(userId) { return [...requests.values()].filter((r) => r.fromUserId === userId).sort(byNewest).map(clone); },
    async listReceivedRequests(userId) { return [...requests.values()].filter((r) => r.toUserId === userId).sort(byNewest).map(clone); },

    async putRating(r) { ratings.set(r.ratingId, clone(r)); return r; },
    async listRatingsReceived(userId) { return [...ratings.values()].filter((r) => r.toUserId === userId).sort(byNewest).map(clone); },
    async listRatingsGiven(userId) { return [...ratings.values()].filter((r) => r.fromUserId === userId).sort(byNewest).map(clone); }
  };
}

/** Demo students so Find Skills is not empty in local development. */
export async function seedDemoData(repo) {
  const now = new Date().toISOString();
  const demo = [
    ['demo-aisha', 'Aisha Rahman', 'Final-year CS student who loves backend work.', ['Java', 'Agile'], ['Python', 'Video Editing']],
    ['demo-ravi', 'Ravi Kumar', 'Design student building a portfolio.', ['Graphic Design', 'Photography'], ['Video Editing', 'Excel']],
    ['demo-meera', 'Meera Nair', 'Marketing major and event organiser.', ['Video Editing', 'Public Speaking'], ['Graphic Design', 'Digital Marketing']],
    ['demo-daniel', 'Daniel Okafor', 'Data enthusiast and part-time tutor.', ['Python', 'Machine Learning', 'Excel'], ['Cloud Computing', 'Software Testing']]
  ];
  for (const [userId, name, bio, teach, learn] of demo) {
    await repo.putProfile({ userId, name, email: `${userId}@demo.local`, studentId: '', bio, createdAt: now, updatedAt: now });
    for (const [type, list] of [['teach', teach], ['learn', learn]]) {
      for (const skillName of list) {
        const skillId = `${userId}-${type}-${skillName.toLowerCase().replace(/\W+/g, '')}`;
        await repo.putSkill({ userId, skillId, type, name: skillName, key: skillName.toLowerCase(), createdAt: now, updatedAt: now });
      }
    }
  }
}
