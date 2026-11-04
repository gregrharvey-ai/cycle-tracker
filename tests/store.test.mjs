import assert from 'node:assert/strict';

// Minimal localStorage stand-in so the store can run in Node.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k),
};
const store = await import('../js/store.js');

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };
const fresh = () => store.deleteAll();

test('a bleed marked "not sure" is saved but does not restart the count', () => {
  fresh();
  store.addBleed('period', '2026-01-10');
  const { bleed } = store.addBleed('spotting', '2026-03-01', false);
  assert.equal(store.lastBleed().date, '2026-01-10');
  assert.equal(store.getState().bleeds.length, 2);
  assert.deepEqual(store.unsureBleeds().map((b) => b.id), [bleed.id]);
  store.setBleedCounts(bleed.id, true);
  assert.equal(store.lastBleed().date, '2026-03-01');
  assert.equal(store.unsureBleeds().length, 0);
});

test('post-12-month flag ignores not-sure bleeds', () => {
  fresh();
  store.addBleed('period', '2025-01-10');
  const r = store.addBleed('spotting', '2026-03-01', false);
  assert.equal(r.afterMenopause, false); // not counted, so no flag
  const r2 = store.addBleed('period', '2026-03-05');
  assert.equal(r2.afterMenopause, true);
});

test('medications: add, stop, resume, remove', () => {
  fresh();
  assert.equal(store.addMed({ name: '   ' }), null);
  const m = store.addMed({ name: 'Estradiol patch', kind: 'hrt', note: '0.05 mg', start: '2026-09-01' });
  store.stopMed(m.id, '2026-10-01');
  assert.equal(store.getState().meds[0].end, '2026-10-01');
  store.stopMed(m.id, '2026-08-01'); // never before the start
  assert.equal(store.getState().meds[0].end, '2026-09-01');
  store.resumeMed(m.id);
  assert.equal(store.getState().meds[0].end, undefined);
  store.removeMed(m.id);
  assert.equal(store.getState().meds.length, 0);
});

test('backup reminder timing', () => {
  fresh();
  const DAY = 86400000;
  const t0 = Date.now();
  assert.equal(store.backupDue(t0), false); // nothing to protect
  store.addBleed('period', '2026-01-10');
  assert.equal(store.backupDue(t0 + 5 * DAY), false);
  assert.equal(store.backupDue(t0 + 15 * DAY), true); // never backed up, 14+ days of data
  store.snoozeBackup(7, t0 + 15 * DAY);
  assert.equal(store.backupDue(t0 + 16 * DAY), false);
  assert.equal(store.backupDue(t0 + 23 * DAY), true);
  store.markExported(t0 + 23 * DAY);
  assert.equal(store.backupDue(t0 + 40 * DAY), false);
  assert.equal(store.backupDue(t0 + 54 * DAY), true); // 30+ days since last backup
});

test('old backups without the new fields still import', () => {
  fresh();
  store.importData({ app: 'cycle-tracker', data: { bleeds: [{ id: 'a', date: '2026-01-01', type: 'period' }], logs: [], settings: { reminderOn: true } } });
  const s = store.getState();
  assert.equal(s.settings.mode, 'countdown');
  assert.equal(s.settings.reminderOn, true);
  assert.deepEqual(s.meds, []);
});

console.log(`\n${n} store tests passed`);
