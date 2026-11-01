// All ORBIT civil dates use the journal's existing Asia/Jakarta day boundary.
export const DAY_MS = 86_400_000;
export const ORBIT_TIMEZONE = 'Asia/Jakarta';
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ORBIT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function civilTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return NaN;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day ? date.getTime() : NaN;
}

export const validDateKey = value => Number.isFinite(civilTimestamp(value));

export function todayKey(now = new Date()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year.padStart(4,'0')}-${parts.month}-${parts.day}`;
}

// V5 backups contain ISO timestamps; V6 stores civil YYYY-MM-DD strings.
export function dateKey(value, now = new Date()) {
  const text = String(value || '');
  if (validDateKey(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && !validDateKey(text.slice(0, 10))) return todayKey(now);
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? todayKey(new Date(timestamp)) : todayKey(now);
}

export function addCivilDays(value, amount) {
  const timestamp = civilTimestamp(value);
  if (!Number.isFinite(timestamp) || !Number.isInteger(amount)) return '';
  const date = new Date(timestamp + amount * DAY_MS);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return '';
  return date.toISOString().slice(0, 10);
}

export function dateLabel(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const timestamp = civilTimestamp(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(timestamp)
    : '';
}
