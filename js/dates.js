// Local-date helpers. Dates are 'YYYY-MM-DD' strings in the phone's local time zone.

const pad = (n) => String(n).padStart(2, '0');

export function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function addMonths(s, n) {
  const d = parseDate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateStr(d);
}

// Whole days from a to b (b - a). Uses UTC to dodge daylight-saving shifts.
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// Calendar months and leftover days from a to b (b >= a).
export function monthsAndDays(a, b) {
  let months = 0;
  while (addMonths(a, months + 1) <= b) months++;
  return { months, days: daysBetween(addMonths(a, months), b) };
}

export function monthKey(s) {
  return s.slice(0, 7);
}

export function formatDate(s, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return parseDate(s).toLocaleDateString(undefined, opts);
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
