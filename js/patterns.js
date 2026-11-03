// Pattern finder. Pure functions (no DOM, no storage) so they can be tested in Node.
import { addMonths, daysBetween, monthKey, ordinal, parseDate, toDateStr } from './dates.js';
import { shortLabel } from './symptoms.js';

const WINDOW_LEN = 5; // days of the month a pattern may span
const LOOKBACK_MONTHS = 6;
const MIN_MONTHS = 3;

const dom = (dateStr) => Number(dateStr.slice(8, 10));

function lookbackMonths(today) {
  const first = today.slice(0, 8) + '01';
  const out = [];
  for (let i = LOOKBACK_MONTHS - 1; i >= 0; i--) out.push(monthKey(addMonths(first, -i)));
  return out;
}

// Finds symptoms that repeat around the same days of the month, in at least
// three months of the last six. Returns clustered patterns, e.g.
// { symptoms: ['rage','anxiety'], start: 12, end: 16, hits: 3, months: 3 }.
export function findDayPatterns(logs, today) {
  if (!logs.length) return [];
  const months = lookbackMonths(today);
  const oldest = months[0] + '-01';
  const recent = logs.filter((l) => l.date >= oldest && l.date <= today);
  if (!recent.length) return [];

  const firstDate = recent.reduce((min, l) => (l.date < min ? l.date : min), recent[0].date);
  const firstMonth = monthKey(firstDate);
  const todayMonth = monthKey(today);
  const todayDom = dom(today);
  // Days since she started logging: days with no symptom produce no log, so this is the fair denominator.
  const trackedDays = daysBetween(firstDate, today) + 1;

  const bySymptom = new Map();
  for (const l of recent) {
    if (!bySymptom.has(l.symptom)) bySymptom.set(l.symptom, new Set());
    bySymptom.get(l.symptom).add(l.date);
  }

  const found = [];
  for (const [symptom, dates] of bySymptom) {
    // A symptom that is there most days is not "a pattern", it is constant.
    if (trackedDays >= 14 && dates.size / trackedDays > 0.5) continue;

    let best = null;
    for (let s = 1; s <= 28; s++) {
      const e = Math.min(31, s + WINDOW_LEN - 1);
      const checkable = months.filter(
        (m) =>
          (m < todayMonth || todayDom >= e) && (m > firstMonth || (m === firstMonth && dom(firstDate) <= s)),
      );
      if (checkable.length < MIN_MONTHS) continue;

      const inWindow = [...dates].filter((d) => {
        const n = dom(d);
        return n >= s && n <= e && checkable.includes(monthKey(d));
      });
      const hitMonths = new Set(inWindow.map(monthKey));
      const inChecked = [...dates].filter((d) => checkable.includes(monthKey(d)));
      const needed = Math.max(MIN_MONTHS, Math.ceil(checkable.length * 0.75));
      if (hitMonths.size < needed) continue;
      const concentration = inWindow.length / inChecked.length;
      if (concentration < 0.5) continue;

      const doms = inWindow.map(dom);
      const cand = {
        symptom,
        start: Math.min(...doms),
        end: Math.max(...doms),
        hits: hitMonths.size,
        months: checkable.length,
        concentration,
      };
      if (
        !best ||
        cand.hits > best.hits ||
        (cand.hits === best.hits && cand.concentration > best.concentration)
      ) {
        best = cand;
      }
    }
    if (best) found.push(best);
  }

  // Merge symptoms whose ranges overlap into one pattern.
  found.sort((a, b) => a.start - b.start || a.end - b.end);
  const clusters = [];
  for (const f of found) {
    const last = clusters[clusters.length - 1];
    if (last && f.start <= last.end + 1) {
      last.symptoms.push(f.symptom);
      last.end = Math.max(last.end, f.end);
      last.hits = Math.min(last.hits, f.hits);
      last.months = Math.max(last.months, f.months);
    } else {
      clusters.push({ symptoms: [f.symptom], start: f.start, end: f.end, hits: f.hits, months: f.months });
    }
  }
  return clusters;
}

export const BUCKETS = [
  { id: 'morning', label: 'in the morning', test: (h) => h >= 5 && h < 12 },
  { id: 'afternoon', label: 'in the afternoon', test: (h) => h >= 12 && h < 17 },
  { id: 'evening', label: 'in the evening', test: (h) => h >= 17 && h < 22 },
  { id: 'night', label: 'at night', test: (h) => h >= 22 || h < 5 },
];

// Quick-log entries carry an exact time. Flags symptoms that mostly happen in
// one part of the day (at least 5 entries, 60% or more in the same part).
export function findTimePatterns(logs, today) {
  const oldest = addMonths(today, -LOOKBACK_MONTHS);
  const quick = logs.filter((l) => l.src === 'quick' && l.date >= oldest && l.date <= today);
  const grouped = new Map();
  for (const l of quick) {
    if (!grouped.has(l.symptom)) grouped.set(l.symptom, []);
    grouped.get(l.symptom).push(l);
  }
  const out = [];
  for (const [symptom, entries] of grouped) {
    if (entries.length < 5) continue;
    const counts = BUCKETS.map((b) => ({
      bucket: b,
      count: entries.filter((e) => b.test(new Date(e.ts).getHours())).length,
    }));
    const top = counts.sort((a, b) => b.count - a.count)[0];
    if (top.count / entries.length >= 0.6 && top.count >= 3) {
      out.push({ symptom, bucket: top.bucket, count: top.count, total: entries.length });
    }
  }
  return out;
}

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function rangePhrase(p) {
  return p.start === p.end ? `around the ${ordinal(p.start)}` : `between the ${ordinal(p.start)} and ${ordinal(p.end)}`;
}

export function describeDayPattern(p, custom = []) {
  const names = joinNames(p.symptoms.map((s) => shortLabel(s, custom)));
  const when = p.hits === p.months ? `for the last ${p.months} months` : `in ${p.hits} of the last ${p.months} months`;
  return `${cap(names)} showed up ${rangePhrase(p)} ${when}.`;
}

export function describeTimePattern(t, custom = []) {
  return `${cap(shortLabel(t.symptom, custom))} mostly showed up ${t.bucket.label} (${t.count} of ${t.total} times you logged it).`;
}

// Heads-up for patterns starting in the next couple of days, or already under way.
export function headsUps(patterns, today, leadDays = 2, custom = []) {
  const out = [];
  const todayDom = dom(today);
  for (const p of patterns) {
    const names = joinNames(p.symptoms.map((s) => shortLabel(s, custom)));
    if (todayDom >= p.start && todayDom <= p.end) {
      out.push({ pattern: p, daysUntil: 0, text: `You're in the window when ${names} tended to show up (${rangePhrase(p)}).` });
      continue;
    }
    const monthStart = today.slice(0, 8) + '01';
    let candidate = clampToMonth(monthStart, p.start);
    if (candidate <= today) candidate = clampToMonth(addMonths(monthStart, 1), p.start);
    const daysUntil = daysBetween(today, candidate);
    if (daysUntil >= 1 && daysUntil <= leadDays) {
      const when = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      out.push({ pattern: p, daysUntil, text: `Heads up: ${names} tended to show up ${rangePhrase(p)}. That window starts ${when}.` });
    }
  }
  return out;
}

function clampToMonth(monthStart, day) {
  const d = parseDate(monthStart);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), Math.min(day, last)));
}

// Counts for the doctor summary: how many days each symptom was logged.
export function symptomTally(logs, fromDate, toDate) {
  const days = new Map();
  const rough = new Map();
  for (const l of logs) {
    if (l.date < fromDate || l.date > toDate) continue;
    if (!days.has(l.symptom)) days.set(l.symptom, new Set());
    days.get(l.symptom).add(l.date);
    if (l.rating === 3) rough.set(l.symptom, (rough.get(l.symptom) ?? new Set()).add(l.date));
  }
  return [...days.entries()]
    .map(([symptom, set]) => ({ symptom, days: set.size, roughDays: rough.get(symptom)?.size ?? 0 }))
    .sort((a, b) => b.days - a.days || b.roughDays - a.roughDays);
}
