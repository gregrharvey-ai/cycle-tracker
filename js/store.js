// All data lives on this phone only (localStorage). No network, no account.
import { toDateStr, monthsAndDays, addMonths } from './dates.js';

const KEY = 'cycle-app.v1';

const empty = () => ({
  version: 1,
  bleeds: [], // { id, date, type: 'spotting'|'period', counts?: false (saved, but not restarting the count), afterMenopause?: bool }
  logs: [], // { id, ts, date, symptom, rating: 1-3, src: 'checkin'|'quick' }
  notes: {}, // { 'YYYY-MM-DD': 'text' }
  checkins: {}, // { 'YYYY-MM-DD': ts } days a check-in was completed
  customSymptoms: [], // { id, label }
  meds: [], // { id, name, kind: 'hrt'|'medicine'|'supplement', note, start, end? }
  settings: {
    reminderOn: false,
    reminderTime: '20:00',
    mode: 'countdown', // 'countdown' | 'symptoms' (bleeding isn't a reliable guide for her)
    dataSince: null, // ts of first saved data, for the backup reminder
    lastExport: null, // ts of last backup
    backupSnoozedUntil: null,
  },
  dismissed: {}, // { bleedId: true } for the post-menopause note
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return normalize(JSON.parse(raw));
  } catch {
    return empty();
  }
}

function normalize(data) {
  const base = empty();
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...(data.settings ?? {}) },
    bleeds: Array.isArray(data.bleeds) ? data.bleeds : [],
    logs: Array.isArray(data.logs) ? data.logs : [],
    customSymptoms: Array.isArray(data.customSymptoms) ? data.customSymptoms : [],
    meds: Array.isArray(data.meds) ? data.meds : [],
    notes: data.notes && typeof data.notes === 'object' ? data.notes : {},
    checkins: data.checkins && typeof data.checkins === 'object' ? data.checkins : {},
    dismissed: data.dismissed && typeof data.dismissed === 'object' ? data.dismissed : {},
  };
}

let saveError = null;
function save() {
  if (!state.settings.dataSince && (state.bleeds.length || state.logs.length || state.meds.length)) {
    state.settings.dataSince = Date.now();
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = null;
  } catch (err) {
    saveError = err;
  }
  listeners.forEach((fn) => fn());
}

export const getState = () => state;
export const getSaveError = () => saveError;
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---- bleeds ---------------------------------------------------------------

// Bleeds that restart the 12-month count (the default). A bleed she marked "not sure"
// is kept and shown, but is left out of the count until she decides.
export const countingBleeds = () => state.bleeds.filter((b) => b.counts !== false);

export function lastBleed() {
  return [...countingBleeds()].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

// Not-sure bleeds from after the last counting bleed, newest first.
export function unsureBleeds() {
  const last = lastBleed();
  return state.bleeds
    .filter((b) => b.counts === false && (!last || b.date > last.date))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Logs a bleed. Returns { bleed, afterMenopause } where afterMenopause is true
// when 12+ months had passed since the previous bleed.
// Past dates are allowed (backfilling from her notepad), so the flag is recomputed
// across the whole history each time.
function flagBleeds() {
  state.bleeds.sort((a, b) => (a.date < b.date ? -1 : 1));
  let prev = null;
  for (const b of state.bleeds) {
    delete b.afterMenopause;
    if (b.counts === false) continue;
    if (prev && monthsAndDays(prev.date, b.date).months >= 12) b.afterMenopause = true;
    prev = b;
  }
}

export function addBleed(type, date = toDateStr(), counts = true) {
  const bleed = { id: uid(), date, type };
  if (!counts) bleed.counts = false;
  state.bleeds.push(bleed);
  flagBleeds();
  save();
  return { bleed, afterMenopause: !!bleed.afterMenopause };
}

// Decide whether a "not sure" bleed restarts the count.
export function setBleedCounts(id, counts) {
  const b = state.bleeds.find((x) => x.id === id);
  if (!b) return null;
  if (counts) delete b.counts;
  else b.counts = false;
  flagBleeds();
  save();
  return b;
}

export function removeBleed(id) {
  state.bleeds = state.bleeds.filter((b) => b.id !== id);
  flagBleeds();
  save();
}

export function dismissMenopauseNote(id) {
  state.dismissed[id] = true;
  save();
}

// ---- symptom logs ---------------------------------------------------------

export function addQuickLog(symptom, rating, now = Date.now()) {
  const entry = { id: uid(), ts: now, date: toDateStr(new Date(now)), symptom, rating, src: 'quick' };
  state.logs.push(entry);
  save();
  return entry;
}

export function removeLog(id) {
  state.logs = state.logs.filter((l) => l.id !== id);
  save();
}

// Replaces the day's check-in ratings with the given { symptomId: rating } map.
export function saveCheckin(date, ratings, note, now = Date.now()) {
  state.logs = state.logs.filter((l) => !(l.src === 'checkin' && l.date === date));
  for (const [symptom, rating] of Object.entries(ratings)) {
    if (rating) state.logs.push({ id: uid(), ts: now, date, symptom, rating, src: 'checkin' });
  }
  const trimmed = (note ?? '').trim();
  if (trimmed) state.notes[date] = trimmed;
  else delete state.notes[date];
  state.checkins[date] = now;
  save();
}

export function checkinFor(date) {
  const ratings = {};
  for (const l of state.logs) if (l.src === 'checkin' && l.date === date) ratings[l.symptom] = l.rating;
  return { ratings, note: state.notes[date] ?? '', done: !!state.checkins[date] };
}

export function addCustomSymptom(label) {
  const clean = label.trim().slice(0, 40);
  if (!clean) return null;
  const existing = state.customSymptoms.find((c) => c.label.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  const sym = { id: `custom-${uid()}`, label: clean };
  state.customSymptoms.push(sym);
  save();
  return sym;
}

export function removeCustomSymptom(id) {
  state.customSymptoms = state.customSymptoms.filter((c) => c.id !== id);
  save();
}

// ---- medications and supplements -----------------------------------------

export function addMed({ name, kind = 'medicine', note = '', start = toDateStr() }) {
  const clean = String(name ?? '').trim().slice(0, 60);
  if (!clean) return null;
  const med = { id: uid(), name: clean, kind, note: String(note ?? '').trim().slice(0, 120), start };
  state.meds.push(med);
  save();
  return med;
}

export function stopMed(id, end = toDateStr()) {
  const m = state.meds.find((x) => x.id === id);
  if (m) {
    m.end = end < m.start ? m.start : end;
    save();
  }
}

export function resumeMed(id) {
  const m = state.meds.find((x) => x.id === id);
  if (m) {
    delete m.end;
    save();
  }
}

export function removeMed(id) {
  state.meds = state.meds.filter((m) => m.id !== id);
  save();
}

// ---- backup reminder -------------------------------------------------------

const DAY_MS = 86400000;

// True when there is data worth protecting and no backup in the last 30 days
// (or, if she has never backed up, none within 14 days of starting).
export function backupDue(now = Date.now()) {
  const s = state.settings;
  if (!state.bleeds.length && !state.logs.length && !state.meds.length) return false;
  if (s.backupSnoozedUntil && now < s.backupSnoozedUntil) return false;
  if (s.lastExport) return now - s.lastExport > 30 * DAY_MS;
  return !!s.dataSince && now - s.dataSince > 14 * DAY_MS;
}

export function markExported(now = Date.now()) {
  state.settings = { ...state.settings, lastExport: now, backupSnoozedUntil: null };
  save();
}

export function snoozeBackup(days = 7, now = Date.now()) {
  state.settings = { ...state.settings, backupSnoozedUntil: now + days * DAY_MS };
  save();
}

// ---- settings, export, import, delete ------------------------------------

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  save();
}

export function exportData() {
  return { app: 'cycle-tracker', exportedAt: new Date().toISOString(), data: state };
}

export function importData(json) {
  const payload = json && json.data ? json.data : json;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.logs) || !Array.isArray(payload.bleeds)) {
    throw new Error('That file does not look like a backup from this app.');
  }
  state = normalize(payload);
  save();
}

export function deleteAll() {
  state = empty();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

// ---- derived helpers ------------------------------------------------------

export function twelveMonthMark(bleedDate) {
  return addMonths(bleedDate, 12);
}
