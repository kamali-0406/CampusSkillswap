// Structured JSON logs — CloudWatch Logs Insights can query these fields directly.
const log = (level, message, extra = {}) =>
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({ level, message, ...extra, ts: new Date().toISOString() }));

export const logger = {
  info: (m, e) => log('info', m, e),
  warn: (m, e) => log('warn', m, e),
  error: (m, e) => log('error', m, e)
};
