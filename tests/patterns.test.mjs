import assert from 'node:assert/strict';
import {
  findDayPatterns, findTimePatterns, describeDayPattern, describeTimePattern, headsUps, symptomTally,
} from '../js/patterns.js';
import { monthsAndDays, addMonths, daysBetween, addDays } from '../js/dates.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

let id = 0;
const log = (date, symptom, extra = {}) => ({
  id: String(++id), date, symptom, rating: 2, src: 'checkin', ts: new Date(date + 'T12:00:00').getTime(), ...extra,
});

test('dates: months and days', () => {
  assert.deepEqual(monthsAndDays('2026-01-15', '2026-03-20'), { months: 2, days: 5 });
  assert.deepEqual(monthsAndDays('2026-01-31', '2026-02-28'), { months: 1, days: 0 });
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(daysBetween('2026-03-01', '2026-03-31'), 30);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('finds the 12th–16th rage + anxiety example (3 months)', () => {
  const logs = [];
  for (const m of ['2026-08', '2026-09', '2026-10']) {
    for (const d of ['12', '13', '15', '16']) {
      logs.push(log(`${m}-${d}`, 'rage'), log(`${m}-${d}`, 'anxiety'));
    }
  }
  // unrelated noise: a few other days with other symptoms
  logs.push(log('2026-08-03', 'fatigue'), log('2026-09-22', 'fatigue'), log('2026-10-05', 'fatigue'));
  const found = findDayPatterns(logs, '2026-11-03');
  const p = found.find((x) => x.symptoms.includes('rage'));
  assert.ok(p, 'pattern found');
  assert.deepEqual([...p.symptoms].sort(), ['anxiety', 'rage']);
  assert.equal(p.start, 12);
  assert.equal(p.end, 16);
  assert.match(describeDayPattern(p), /Irritability or rage and anxiety showed up between the 12th and 16th for the last 3 months\./);
});

test('does not flag with only two months of data', () => {
  const logs = [];
  for (const m of ['2026-09', '2026-10']) for (const d of ['12', '14']) logs.push(log(`${m}-${d}`, 'rage'));
  assert.equal(findDayPatterns(logs, '2026-11-03').length, 0);
});

test('does not flag a symptom that is there nearly every day', () => {
  const logs = [];
  for (let i = 0; i < 90; i++) logs.push(log(addDays('2026-08-05', i), 'fatigue'));
  assert.equal(findDayPatterns(logs, '2026-11-03').length, 0);
});

test('does not flag random scatter', () => {
  const days = ['2026-08-02', '2026-08-19', '2026-09-08', '2026-09-27', '2026-10-13', '2026-10-30'];
  assert.equal(findDayPatterns(days.map((d) => log(d, 'cramps')), '2026-11-03').length, 0);
});

test('current month counts only once the window has passed', () => {
  const logs = [];
  for (const m of ['2026-08', '2026-09', '2026-10']) logs.push(log(`${m}-15`, 'sadness'), log(`${m}-16`, 'sadness'));
  // On Nov 3 the 15th hasn't happened yet: 3 of 3 completed months.
  const early = findDayPatterns(logs, '2026-11-03');
  assert.equal(early[0].months, 3);
  // On Nov 20 the window passed with no log: 3 of 4.
  const late = findDayPatterns(logs, '2026-11-20');
  assert.equal(late.length, 1);
  assert.equal(late[0].hits, 3);
  assert.equal(late[0].months, 4);
});

test('heads-up two days before, and during the window', () => {
  const p = { symptoms: ['rage', 'anxiety'], start: 12, end: 16, hits: 3, months: 3 };
  assert.equal(headsUps([p], '2026-11-10').length, 1);
  assert.match(headsUps([p], '2026-11-10')[0].text, /starts in 2 days/);
  assert.match(headsUps([p], '2026-11-11')[0].text, /starts tomorrow/);
  assert.equal(headsUps([p], '2026-11-08').length, 0);
  assert.match(headsUps([p], '2026-11-14')[0].text, /in the window/);
  assert.equal(headsUps([p], '2026-11-20').length, 0);
  // month rollover: window starts on the 1st, today is the 30th
  const q = { symptoms: ['cramps'], start: 1, end: 3, hits: 3, months: 3 };
  assert.match(headsUps([q], '2026-11-29')[0].text, /in 2 days/);
});

test('time-of-day pattern', () => {
  const at = (d, h) => log(d, 'hot-flashes', { src: 'quick', ts: new Date(`${d}T${String(h).padStart(2, '0')}:10:00`).getTime() });
  const logs = [at('2026-10-01', 15), at('2026-10-04', 16), at('2026-10-09', 14), at('2026-10-12', 15), at('2026-10-20', 8), at('2026-10-25', 15)];
  const t = findTimePatterns(logs, '2026-11-03');
  assert.equal(t.length, 1);
  assert.equal(t[0].bucket.id, 'afternoon');
  assert.match(describeTimePattern(t[0]), /Hot flashes mostly showed up in the afternoon \(5 of 6/);
});

test('tally counts days not entries', () => {
  const logs = [log('2026-10-01', 'cramps'), log('2026-10-01', 'cramps', { src: 'quick' }), log('2026-10-02', 'cramps', { rating: 3 })];
  const t = symptomTally(logs, '2026-10-01', '2026-10-31');
  assert.deepEqual(t, [{ symptom: 'cramps', days: 2, roughDays: 1 }]);
});

console.log(`\n${n} tests passed`);
