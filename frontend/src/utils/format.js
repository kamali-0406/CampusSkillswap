export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const units = [[60, 'min'], [3600, 'hour'], [86400, 'day'], [604800, 'week']];
  let out = `${Math.round(s / 604800)} wk`;
  if (s < 3600) out = `${Math.floor(s / 60)} min ago`;
  else if (s < 86400) { const h = Math.floor(s / 3600); out = `${h} hour${h > 1 ? 's' : ''} ago`; }
  else if (s < 604800) { const d = Math.floor(s / 86400); out = `${d} day${d > 1 ? 's' : ''} ago`; }
  else out = new Date(iso).toLocaleDateString();
  return out;
}

export const joinSkills = (list) => (list && list.length ? list.join(', ') : 'nothing specific');
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
