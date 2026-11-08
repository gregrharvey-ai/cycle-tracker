import * as store from './store.js';
import {
  toDateStr, parseDate, addDays, addMonths, daysBetween, monthsAndDays, monthKey,
  formatDate, formatTime, plural,
} from './dates.js';
import { GROUPS, RATINGS, allSymptoms, labelOf, colorOf } from './symptoms.js';
import {
  findDayPatterns, findTimePatterns, describeDayPattern, describeTimePattern, headsUps, symptomTally,
  cycleLengths, cycleStats,
} from './patterns.js';
import { TIPS, EVIDENCE, tipsFor } from './tips.js';

const $ = (sel) => document.querySelector(sel);
const view = $('#view');
const sheetRoot = $('#sheet-root');
const sheetEl = $('#sheet');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ratingName = (v) => RATINGS.find((r) => r.value === v)?.label ?? '';

// ---- transient UI state (not saved) ----------------------------------------
const ui = {
  ql: { rating: 2, view: 'pick', entry: null },
  checkin: { date: null, ratings: {}, note: '' },
  cal: { month: toDateStr().slice(0, 7), selected: null },
  tipsFilter: 'all',
  summaryMonths: 3,
  seed: Math.floor(Math.random() * 1000),
  pendingImport: null,
  keepCheckin: false, // set when jumping to a specific past day
};

const custom = () => store.getState().customSymptoms;
const countdownOn = () => store.getState().settings.mode !== 'symptoms';
const MED_KINDS = { hrt: 'Hormone therapy', medicine: 'Medicine', supplement: 'Supplement or herb' };

// ---- router ----------------------------------------------------------------
const ROUTES = {
  home: renderHome,
  checkin: renderCheckin,
  patterns: renderPatterns,
  tips: renderTips,
  more: renderMore,
  summary: renderSummary,
};

function route() {
  const name = location.hash.replace(/^#\/?/, '') || 'home';
  return ROUTES[name] ? name : 'home';
}

function render() {
  const name = route();
  view.innerHTML = ROUTES[name]();
  document.querySelectorAll('#tabs a').forEach((a) => {
    const active = a.dataset.tab === (name === 'summary' ? 'more' : name);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('#actions').hidden = name !== 'home';
  $('#checkin-dot').hidden = !(reminderDue() && name !== 'checkin');
}

window.addEventListener('hashchange', () => {
  closeSheet();
  if (route() === 'checkin' && !ui.keepCheckin) startCheckin(toDateStr());
  ui.keepCheckin = false;
  render();
  window.scrollTo(0, 0);
});

store.subscribe(() => render());

// ---- helpers ---------------------------------------------------------------
function reminderDue() {
  const { settings } = store.getState();
  if (!settings.reminderOn) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hhmm >= settings.reminderTime && !store.checkinFor(toDateStr()).done;
}

function patternsNow() {
  const { logs } = store.getState();
  const today = toDateStr();
  return { day: findDayPatterns(logs, today), time: findTimePatterns(logs, today) };
}

function openSheet(html) {
  sheetEl.innerHTML = html;
  sheetRoot.hidden = false;
  document.body.style.overflow = 'hidden';
  sheetEl.scrollTop = 0;
  sheetEl.querySelector('h2')?.setAttribute('tabindex', '-1');
  sheetEl.querySelector('h2')?.focus({ preventScroll: true });
}

function closeSheet() {
  sheetRoot.hidden = true;
  sheetEl.innerHTML = '';
  document.body.style.overflow = '';
}

let toastTimer;
function toast(msg, ms = 3800) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

function tag(evidence) {
  const e = EVIDENCE[evidence];
  return `<span class="tag ${evidence}" title="${esc(e.hint)}">${e.label}</span>`;
}

function tipCard(t, open = false) {
  return `<details class="tip"${open ? ' open' : ''}>
    <summary><strong>${esc(t.title)}</strong>${tag(t.evidence)}<span class="tag kind">${esc(t.kind)}</span></summary>
    <div class="body">
      <p>${esc(t.body)}</p>
      ${t.safety ? `<div class="safety"><strong>Safety:</strong> ${esc(t.safety)}</div>` : ''}
      <p class="source">Source: ${esc(t.source)}</p>
    </div>
  </details>`;
}

function symptomPills(action) {
  const st = store.getState();
  const logs = st.logs.filter((l) => l.date >= addDays(toDateStr(), -60));
  const counts = new Map();
  logs.forEach((l) => counts.set(l.symptom, (counts.get(l.symptom) ?? 0) + 1));
  const frequent = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  const btn = (id) => `<button type="button" data-action="${action}" data-id="${esc(id)}">${esc(labelOf(id, st.customSymptoms))}</button>`;
  let html = '';
  if (frequent.length) html += `<div class="group-title">Your usual</div><div class="pills">${frequent.map(btn).join('')}</div>`;
  for (const g of GROUPS) {
    html += `<div class="group-title">${g.label}</div><div class="pills">${g.symptoms.map((s) => btn(s.id)).join('')}</div>`;
  }
  if (st.customSymptoms.length) {
    html += `<div class="group-title">Your own</div><div class="pills">${st.customSymptoms.map((s) => btn(s.id)).join('')}</div>`;
  }
  return html;
}

// ---- HOME ------------------------------------------------------------------
function renderHome() {
  const st = store.getState();
  const today = toDateStr();
  const last = store.lastBleed();
  let html = `<h1>My Cycle</h1><p class="muted small">Private. Everything stays on this phone.</p>`;

  if (isIosBrowserTab() && !localStorage.getItem('hint-install-dismissed')) {
    html += `<div class="card warm"><h3>Put this on your home screen</h3>
      <p>Tap the Share button at the bottom of Safari, then <strong>Add to Home Screen</strong>. It will open full screen like a normal app and work offline.</p>
      <button class="link" data-action="dismiss-install">Got it</button></div>`;
  }

  const done = store.checkinFor(today).done;
  if (!done) {
    const due = reminderDue();
    html += `<div class="card ${due ? 'warm' : ''}"><h3>${due ? 'Time for your check-in' : "Today's check-in"}</h3>
      <p class="muted">About 30 seconds. Tap the symptoms you have today.</p>
      <a class="btn primary block" href="#/checkin">Check in</a></div>`;
  }

  if (store.backupDue()) {
    html += `<div class="card warm"><h3>Time for a backup</h3>
      <p>Your data lives only on this phone. A backup file saved to Files, iCloud Drive or emailed to yourself means it can't be lost with the phone.</p>
      <div class="row"><button class="primary" data-action="export">Back up now</button><button data-action="snooze-backup">Remind me in a week</button></div></div>`;
  }

  const patterns = patternsNow();
  for (const h of headsUps(patterns.day, today, 2, st.customSymptoms)) {
    html += `<div class="card calm"><h3>${h.daysUntil === 0 ? 'Right now' : 'Heads up'}</h3><p>${esc(h.text)}</p>
      <p class="small muted">Only you see this. It's based on what you logged, not a prediction.</p></div>`;
  }

  if (!countdownOn()) {
    html += `<div class="card calm"><h3>Symptom tracking only</h3>
      <p>The bleed countdown is off, because bleeding isn't a reliable guide for you (for example after a hysterectomy or ablation, or with a hormonal IUD, the pill or HRT). Check in on your symptoms and the pattern finder does the rest.</p>
      <button class="link" data-action="mode-countdown">Turn the countdown on</button></div>`;
  } else if (!last) {
    html += `<div class="card"><h2 style="margin-top:0">Start the clock</h2>
      <p>When was your last bleed? A best guess is fine. You can add earlier dates later in More.</p>
      <label for="setup-date">Date of last bleed</label>
      <input type="date" id="setup-date" max="${today}" value="${today}">
      <label>Was it…</label>
      <div class="row">
        <button class="primary" data-action="setup-bleed" data-type="period">Period</button>
        <button data-action="setup-bleed" data-type="spotting">Spotting</button>
      </div>
      <button class="link" style="margin-top:.7rem" data-action="mode-symptoms">Bleeding isn't a good guide for me (hysterectomy, ablation, hormonal IUD or HRT)</button></div>`;
  } else {
    const days = Math.max(0, daysBetween(last.date, today));
    const md = monthsAndDays(last.date, today);
    const mark = store.twelveMonthMark(last.date);
    const total = daysBetween(last.date, mark);
    const pct = Math.min(100, Math.round((days / total) * 100));
    const reached = md.months >= 12;
    const detail = days === 0 ? 'Bleed logged today' : md.months ? `${plural(md.months, 'month')}, ${plural(md.days, 'day')}` : '';
    const ringC = 2 * Math.PI * 52;
    const ringOff = ringC * (1 - pct / 100);
    html += `<div class="card countdown">
      <div class="ring" role="progressbar" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${Math.min(12, md.months)}" aria-label="Months without a bleed, out of 12">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="52"/><circle class="fill" cx="60" cy="60" r="52" stroke-dasharray="${ringC.toFixed(1)}" stroke-dashoffset="${ringOff.toFixed(1)}" transform="rotate(-90 60 60)"/></svg>
        <div class="ring-num"><div class="big">${days}</div><div class="ring-unit">${days === 1 ? 'day' : 'days'}</div></div>
      </div>
      <div class="unit">since last bleed</div>
      ${detail ? `<div class="detail">${esc(detail)}</div>` : ''}
      <div class="small muted">${reached ? '12 months reached' : `${md.months} of 12 months &middot; ${plural(Math.max(0, daysBetween(today, mark)), 'day')} to go (${esc(formatDate(mark, { month: 'short', day: 'numeric', year: 'numeric' }))})`}</div>
      <p class="small muted" style="margin-top:.6rem">Last bleed: ${esc(formatDate(last.date))} (${last.type})</p>
    </div>`;

    if (reached) {
      html += `<div class="card calm"><h3>12 months with no bleed</h3>
        <p>This is the medical marker for menopause. It's worth telling your doctor, who can confirm it with you.</p></div>`;
    } else if (days >= 60) {
      html += `<div class="card calm"><h3>60 days without a bleed</h3>
        <p>Going 60 days or more between bleeds is common in late perimenopause. Periods often do come back after a long gap, and when one does it isn't a step backwards. Keep logging.</p></div>`;
    }
    for (const b of store.unsureBleeds().slice(0, 2)) {
      html += `<div class="card warm"><h3>Does this bleed count?</h3>
        <p>You logged ${esc(b.type)} on ${esc(formatDate(b.date))} and marked it "not sure", so the counter has not restarted. Decide now, or leave it and ask your doctor.</p>
        <div class="row"><button class="primary" data-action="bleed-count-yes" data-id="${esc(b.id)}">Yes, restart the count</button><button data-action="bleed-count-no" data-id="${esc(b.id)}">Leave it out</button></div></div>`;
    }
    if (last.afterMenopause && !st.dismissed[last.id]) {
      html += `<div class="card warm"><h3>A note about this bleed</h3>
        <p>Going by the dates you've entered, this bleed came after 12 months with none. Bleeding after menopause should be checked by a doctor. Most causes are not serious, but it's always worth getting looked at.</p>
        <p class="small muted">If you still have older bleeds in your notepad, add them in More and this note will update.</p>
        <button class="link" data-action="dismiss-note" data-id="${esc(last.id)}">Got it</button></div>`;
    }
  }

  html += `<p class="small muted center" style="margin-top:1rem"><a href="#/more" style="color:inherit">Add past bleeds or symptoms from your notes</a></p>`;
  return html;
}

function isIosBrowserTab() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return ios && navigator.standalone !== true && !matchMedia('(display-mode: standalone)').matches;
}

// ---- BLEED SHEET -----------------------------------------------------------
function openBleedSheet(date = toDateStr()) {
  const counting = countdownOn();
  openSheet(`<h2 id="sheet-title">Log a bleed</h2>
    ${counting ? '<p class="muted">Any bleeding, even light spotting, usually restarts the 12-month count.</p>' : ''}
    <label for="bleed-date">Date</label>
    <input type="date" id="bleed-date" max="${toDateStr()}" value="${esc(date)}">
    ${counting ? `<label style="margin-bottom:0">Does this bleed restart your count?</label>
      <label class="inline"><input type="radio" name="bleed-counts" value="yes" checked> Yes, restart it</label>
      <label class="inline"><input type="radio" name="bleed-counts" value="no"> Not sure. Save it, but don't restart yet</label>
      <p class="small muted" style="margin-top:0">Light bleeding from a hormonal IUD, the pill or HRT may not mean the same thing. Not sure? Save it without restarting and ask your doctor. You can change your mind later.</p>` : ''}
    <div class="row" style="margin-top:.9rem">
      <button class="primary" data-action="bleed-save" data-type="period">Period</button>
      <button class="primary" data-action="bleed-save" data-type="spotting" style="background:var(--accent)">Spotting</button>
    </div>
    <button class="ghost block" style="margin-top:.7rem" data-action="close-sheet">Cancel</button>`);
}

function saveBleed(type, date) {
  if (!date || date > toDateStr()) return toast('Pick a date that is today or earlier.');
  const counts = !countdownOn() || ($('input[name="bleed-counts"]:checked')?.value ?? 'yes') === 'yes';
  const before = store.lastBleed();
  const { bleed, afterMenopause } = store.addBleed(type, date, counts);
  closeSheet();
  if (!countdownOn()) {
    toast(`Logged ${formatDate(date, { month: 'short', day: 'numeric' })}.`);
  } else if (!counts) {
    toast('Saved without restarting the count. You can decide later on Home.');
  } else if (!afterMenopause && before && date > before.date && daysBetween(before.date, date) >= 60) {
    openSheet(`<h2 id="sheet-title">Saved. The count has restarted.</h2>
      <p>It had been ${plural(daysBetween(before.date, date), 'day')} since the last bleed. A bleed after a long gap is common in perimenopause, and it isn't a step backwards. Many women have one or more after several months without.</p>
      <button class="primary block" data-action="close-sheet">OK</button>`);
  } else if (afterMenopause) {
    openSheet(`<h2 id="sheet-title">Saved. One gentle note.</h2>
      <p>You logged a bleed after 12 months with none. Bleeding after menopause should be checked by a doctor. Most causes are not serious, but it's always worth getting looked at.</p>
      <button class="primary block" data-action="close-sheet">OK</button>`);
  } else {
    const isLatest = store.lastBleed()?.id === bleed.id;
    toast(isLatest && date === toDateStr() ? 'Logged. Counter reset to zero.' : `Logged ${formatDate(date, { month: 'short', day: 'numeric' })}.`);
  }
}

// ---- QUICK LOG -------------------------------------------------------------
function openQuick() {
  ui.ql = { rating: ui.ql.rating || 2, view: 'pick', entry: null };
  renderQuick();
}

function renderQuick() {
  const { rating, view: v, entry } = ui.ql;
  if (v === 'saved' && entry) {
    const tips = tipsFor([entry.symptom], 3, ui.seed++);
    openSheet(`<h2 id="sheet-title">Saved</h2>
      <div class="card calm"><strong>${esc(labelOf(entry.symptom, custom()))}</strong>
        <span class="rating-tag t${entry.rating}">${ratingName(entry.rating)}</span>
        <div class="muted small">${esc(formatTime(entry.ts))}</div></div>
      <div class="row"><button data-action="ql-undo">Undo</button><button class="primary" data-action="ql-again">Log another</button></div>
      ${tips.length ? `<h2>Tips that may help</h2>${tips.map((t) => tipCard(t)).join('')}` : ''}
      <button class="ghost block" style="margin-top:.8rem" data-action="close-sheet">Done</button>`);
    return;
  }
  openSheet(`<h2 id="sheet-title">Quick log</h2>
    <p class="muted">Pick how strong it is, then tap the symptom. It saves right away with the time.</p>
    <div class="seg" role="group" aria-label="How strong">
      ${RATINGS.map((r) => `<button type="button" class="s${r.value}" data-action="ql-rating" data-v="${r.value}" aria-pressed="${rating === r.value}">${r.label}</button>`).join('')}
    </div>
    ${symptomPills('ql-pick')}
    <button class="ghost block" style="margin-top:1rem" data-action="close-sheet">Cancel</button>`);
}

// ---- CHECK-IN --------------------------------------------------------------
function startCheckin(date) {
  const cur = store.checkinFor(date);
  ui.checkin = { date, ratings: { ...cur.ratings }, note: cur.note };
}

function renderCheckin() {
  if (!ui.checkin.date) startCheckin(toDateStr());
  const { date, ratings, note } = ui.checkin;
  const today = toDateStr();
  const past = date !== today;
  const st = store.getState();
  const groups = [...GROUPS];
  if (st.customSymptoms.length) groups.push({ id: 'custom', label: 'Your own', symptoms: st.customSymptoms });
  const rows = (g) => g.symptoms.map((s) => {
    const r = ratings[s.id] ?? 0;
    return `<button type="button" class="sym r${r}" data-action="ci-cycle" data-id="${esc(s.id)}" aria-label="${esc(s.label)}: ${r ? ratingName(r) : 'not logged'}">
      <span>${esc(s.label)}</span><span class="badge">${r ? ratingName(r) : 'tap'}</span></button>`;
  }).join('');
  const dateLabel = formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' });
  return `<h1>${past ? 'Catching up' : 'Daily check-in'}</h1>
    <p class="muted" style="margin-top:0">${esc(dateLabel)}</p>
    <div class="row" style="align-items:end">
      <div style="flex:2 1 10rem"><label for="ci-date" style="margin-top:0">Day</label>
        <input type="date" id="ci-date" max="${today}" value="${esc(date)}"></div>
      <button data-action="ci-day" data-date="${today}" ${past ? '' : 'disabled style="opacity:.5"'}>Today</button>
    </div>
    <p class="small muted" style="margin-bottom:0">Tap a symptom to rate it: <span class="legend"><span class="l1">mild</span><span class="l2">medium</span><span class="l3">rough</span></span> Tap again to move up, then clear.</p>
    ${groups.map((g) => `<div class="group-title">${esc(g.label)}</div>${rows(g)}`).join('')}
    <div class="group-title">Add your own symptom</div>
    <div class="row"><input type="text" id="ci-custom" maxlength="40" placeholder="For example: burning mouth" aria-label="New symptom name" style="flex:3 1 10rem"><button data-action="ci-add-custom">Add</button></div>
    <label for="ci-note">Notes (optional)</label>
    <textarea id="ci-note" placeholder="${past ? 'Paste or type what you wrote in your notepad for this day' : 'Anything else worth remembering'}">${esc(note)}</textarea>
    <div class="savebar"><button class="primary block" data-action="ci-save">${past ? 'Save this day' : 'Save check-in'}</button></div>`;
}

function saveCheckin() {
  const { date, ratings } = ui.checkin;
  const note = $('#ci-note')?.value ?? ui.checkin.note;
  store.saveCheckin(date, ratings, note);
  const today = toDateStr();
  const rated = Object.entries(ratings).filter(([, r]) => r).sort((a, b) => b[1] - a[1]);
  if (date !== today) {
    const prev = addDays(date, -1);
    openSheet(`<h2 id="sheet-title">Saved for ${esc(formatDate(date, { month: 'long', day: 'numeric' }))}</h2>
      <p class="muted">${rated.length ? plural(rated.length, 'symptom') + ' logged.' : 'Saved with no symptoms.'}</p>
      <button class="primary block" data-action="ci-day" data-date="${prev}">Do the day before (${esc(formatDate(prev, { month: 'short', day: 'numeric' }))})</button>
      <button class="ghost block" style="margin-top:.6rem" data-action="ci-finish">Done</button>`);
    return;
  }
  const tips = rated.length ? tipsFor(rated.slice(0, 3).map(([id]) => id), 3, ui.seed++) : [];
  openSheet(`<h2 id="sheet-title">Check-in saved</h2>
    <p class="muted">${rated.length ? `${plural(rated.length, 'symptom')} logged today.` : 'No symptoms today. Good to know too.'}</p>
    ${tips.length ? `<h2>Tips that may help</h2>${tips.map((t) => tipCard(t)).join('')}` : ''}
    <button class="primary block" style="margin-top:.8rem" data-action="ci-finish">Done</button>`);
}

// ---- PATTERNS --------------------------------------------------------------
function renderPatterns() {
  const st = store.getState();
  const today = toDateStr();
  const { day, time } = patternsNow();
  const first = st.logs.reduce((m, l) => (!m || l.date < m ? l.date : m), null);
  const tracked = first ? daysBetween(first, today) + 1 : 0;

  let html = `<h1>Patterns</h1><h2 style="margin-top:.6rem">What I'm noticing</h2>`;
  if (day.length || time.length) {
    html += day.map((p) => `<div class="card calm"><p style="margin:0">${esc(describeDayPattern(p, st.customSymptoms))}</p></div>`).join('');
    html += time.map((t) => `<div class="card calm"><p style="margin:0">${esc(describeTimePattern(t, st.customSymptoms))}</p></div>`).join('');
    html += `<p class="small muted">These are things you've logged coming back around the same time. They're not predictions or a diagnosis, but they're good to bring to your doctor.</p>`;
  } else {
    const pct = Math.min(100, Math.round((tracked / 90) * 100));
    html += `<div class="card"><p style="margin-top:0">Nothing repeating yet. The pattern finder needs about 3 months of check-ins to spot symptoms that come back around the same days.</p>
      <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <p class="small muted" style="margin-bottom:0">${tracked ? `You have ${plural(tracked, 'day')} of history so far.` : 'Nothing logged yet.'} Catching up from a notepad counts: add old days in <a href="#/more">More</a>.</p></div>`;
  }
  html += cycleLengthsHtml();
  html += calendarHtml();
  html += `<a class="btn block" style="margin-top:1rem" href="#/summary">One-page summary for the doctor</a>`;
  return html;
}

function cycleLengthsHtml() {
  const lengths = cycleLengths(store.countingBleeds());
  if (!lengths.length) return '';
  const stats = cycleStats(lengths);
  const fmt = { month: 'short', day: 'numeric' };
  return `<h2>Time between periods</h2><div class="card">
    ${stats ? `<p style="margin-top:0">Your last ${stats.count} gaps ran from <strong>${stats.min}</strong> to <strong>${stats.max}</strong> days.</p>` : ''}
    <ul class="hist">${lengths.slice(0, 8).map((c) => `<li><span>${esc(formatDate(c.from, fmt))} to ${esc(formatDate(c.to, fmt))}</span><strong>${plural(c.length, 'day')}${c.length >= 60 ? ' <span class="muted small">(60+)</span>' : ''}</strong></li>`).join('')}</ul>
    <p class="small muted" style="margin-bottom:0">Start of one bleed to the start of the next. A gap of 60 days or more is a common sign of late perimenopause. This is a record, not a prediction.</p></div>`;
}

function calendarHtml() {
  const st = store.getState();
  const today = toDateStr();
  const [y, m] = ui.cal.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const dim = new Date(y, m, 0).getDate();
  const prefix = `${ui.cal.month}-`;

  const byDay = new Map();
  for (const l of st.logs) {
    if (!l.date.startsWith(prefix)) continue;
    if (!byDay.has(l.date)) byDay.set(l.date, new Set());
    byDay.get(l.date).add(l.symptom);
  }
  const bleeds = new Map(st.bleeds.filter((b) => b.date.startsWith(prefix)).map((b) => [b.date, b]));
  const monthSymptoms = new Set([...byDay.values()].flatMap((s) => [...s]));

  let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) cells += `<button class="day empty" tabindex="-1" aria-hidden="true"></button>`;
  for (let d = 1; d <= dim; d++) {
    const ds = `${prefix}${String(d).padStart(2, '0')}`;
    const syms = [...(byDay.get(ds) ?? [])];
    const dots = syms.slice(0, 4).map((s) => `<i style="background:${colorOf(s, st.customSymptoms)}"></i>`).join('')
      + (syms.length > 4 ? `<b>+${syms.length - 4}</b>` : '');
    const bl = bleeds.get(ds);
    const cls = ['day', ds === today && 'today', ds === ui.cal.selected && 'sel', ds > today && 'future'].filter(Boolean).join(' ');
    cells += `<button class="${cls}" data-action="cal-day" data-date="${ds}" aria-label="${esc(formatDate(ds, { weekday: 'long', month: 'long', day: 'numeric' }))}${syms.length ? `, ${plural(syms.length, 'symptom')}` : ''}${bl ? `, ${bl.type}` : ''}">
      <span>${d}</span><span class="dots">${dots || '&nbsp;'}</span>${bl ? `<span class="bleed ${bl.type === 'spotting' ? 'spot' : ''}"></span>` : ''}</button>`;
  }

  const key = [...monthSymptoms].map((s) => `<span><span class="swatch" style="background:${colorOf(s, st.customSymptoms)}"></span>${esc(labelOf(s, st.customSymptoms))}</span>`).join('');
  const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return `<h2>Calendar</h2><div class="card">
    <div class="cal-head"><button data-action="cal-prev" aria-label="Previous month">&lsaquo;</button><h2>${esc(title)}</h2><button data-action="cal-next" aria-label="Next month" ${ui.cal.month >= today.slice(0, 7) ? 'disabled style="opacity:.4"' : ''}>&rsaquo;</button></div>
    <div class="cal">${cells}</div>
    <div class="key">${key}<span><span class="bleed" style="display:inline-block;vertical-align:middle;margin-right:6px;width:14px;height:6px;border-radius:3px;background:var(--danger)"></span>Period</span><span><span style="display:inline-block;vertical-align:middle;margin-right:6px;width:14px;height:7px;border-radius:3px;border:2px solid var(--danger)"></span>Spotting</span></div>
  </div>${dayDetailHtml()}`;
}

function dayDetailHtml() {
  const sel = ui.cal.selected;
  if (!sel) return `<p class="muted small center">Tap a day to see or add what you logged.</p>`;
  const st = store.getState();
  const logs = st.logs.filter((l) => l.date === sel).sort((a, b) => a.ts - b.ts || a.symptom.localeCompare(b.symptom));
  const bleeds = st.bleeds.filter((b) => b.date === sel);
  const note = st.notes[sel];
  const items = [
    ...bleeds.map((b) => `<div class="entry"><span><strong>${b.type === 'spotting' ? 'Spotting' : 'Period'}</strong> <span class="muted small">bleed</span></span><button data-action="cal-del-bleed" data-id="${esc(b.id)}" aria-label="Delete this bleed">&times;</button></div>`),
    ...logs.map((l) => `<div class="entry"><span><span class="swatch" style="background:${colorOf(l.symptom, st.customSymptoms)}"></span>${esc(labelOf(l.symptom, st.customSymptoms))}<span class="rating-tag t${l.rating}">${ratingName(l.rating)}</span>${l.src === 'quick' ? `<span class="muted small"> &middot; ${esc(formatTime(l.ts))}</span>` : ''}</span><button data-action="cal-del-log" data-id="${esc(l.id)}" aria-label="Delete ${esc(labelOf(l.symptom, st.customSymptoms))}">&times;</button></div>`),
  ];
  return `<div class="card"><h3>${esc(formatDate(sel, { weekday: 'long', month: 'long', day: 'numeric' }))}</h3>
    ${items.join('') || '<p class="muted">Nothing logged this day.</p>'}
    ${note ? `<p style="border-top:1px solid var(--line);padding-top:.5rem"><span class="muted small">Note:</span> ${esc(note)}</p>` : ''}
    <div class="row" style="margin-top:.6rem">
      <button data-action="cal-edit-day" data-date="${esc(sel)}">${logs.length || note ? 'Edit this day' : 'Add symptoms'}</button>
      <button data-action="cal-add-bleed" data-date="${esc(sel)}">Add a bleed</button>
    </div></div>`;
}

// ---- TIPS ------------------------------------------------------------------
function renderTips() {
  const st = store.getState();
  const syms = allSymptoms(st.customSymptoms);
  const withTips = syms.filter((s) => TIPS.some((t) => t.symptoms.includes(s.id)));
  const f = ui.tipsFilter;
  const rank = { well: 0, some: 1, trad: 2, weak: 3 };
  const list = (f === 'all' ? TIPS : TIPS.filter((t) => t.symptoms.includes(f))).slice().sort((a, b) => rank[a.evidence] - rank[b.evidence]);
  const kinds = ['Mainstream', 'Nutrition', 'Self-care', 'Herbal'];
  let body = '';
  if (f === 'all') {
    for (const k of kinds) {
      const items = list.filter((t) => t.kind === k);
      if (items.length) body += `<div class="group-title">${k === 'Herbal' ? 'Herbs and supplements' : k}</div>${items.map((t) => tipCard(t)).join('')}`;
    }
  } else {
    body = list.map((t) => tipCard(t)).join('');
  }
  return `<h1>Tips</h1>
    <p class="muted">Both mainstream and natural options, each tagged with how well it's backed by research. This is general information, not medical advice.</p>
    <div class="card calm"><p style="margin:0"><strong>For hot flashes and night sweats,</strong> the treatments with good evidence are medical (hormone therapy and some non-hormone medicines). The Menopause Society's 2023 review does not recommend herbs, supplements, soy, or avoiding triggers for them, because trials were inconsistent. Some of those tips are still here, tagged honestly, so you can see why.</p></div>
    <div class="card"><h3>What the tags mean</h3>
      ${Object.entries(EVIDENCE).map(([k, e]) => `<p style="margin:.3rem 0">${tag(k)} <span class="small">${esc(e.hint)}</span></p>`).join('')}
    </div>
    <label for="tips-filter">Show tips for</label>
    <select id="tips-filter"><option value="all"${f === 'all' ? ' selected' : ''}>Everything</option>
      ${withTips.map((s) => `<option value="${esc(s.id)}"${f === s.id ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select>
    ${body}`;
}

// ---- MORE ------------------------------------------------------------------
function renderMore() {
  const st = store.getState();
  const bleeds = [...st.bleeds].sort((a, b) => (a.date < b.date ? 1 : -1));
  return `<h1>More</h1>
    <div class="card"><h2 style="margin-top:0">Add what you already tracked</h2>
      <p>Have notes in a notepad? Put them in here so the countdown and pattern finder have your history from day one.</p>
      <div class="stack">
        <button class="block primary" data-action="more-add-bleed">Add a past bleed</button>
        <a class="btn block" href="#/checkin" data-action="more-catchup">Add symptoms from a past day</a>
      </div>
      <p class="small muted">Start with your last few bleeds, then fill in symptom days. Each saved day offers "Do the day before" to move quickly. You can type or paste your notepad text into the notes box for each day.</p>
    </div>

    <div class="card"><h2 style="margin-top:0">Does a bleed countdown fit you?</h2>
      <label class="inline"><input type="radio" name="mode" value="countdown" ${countdownOn() ? 'checked' : ''}> Yes, count from my last bleed</label>
      <label class="inline"><input type="radio" name="mode" value="symptoms" ${countdownOn() ? '' : 'checked'}> No, just track symptoms</label>
      <p class="small muted">Choose "just track symptoms" if bleeding isn't a reliable guide for you, for example after a hysterectomy or endometrial ablation, or with a hormonal IUD, the pill or HRT. Your bleeds and symptoms are kept either way.</p>
    </div>

    <div class="card"><h2 style="margin-top:0">Medications and supplements</h2>
      ${medsHtml(st)}
      <button class="block" style="margin-top:.7rem" data-action="med-add">Add one</button>
      <p class="small muted">Hormone therapy, medicines, vitamins and herbs, with when you started and stopped. It goes on the doctor summary so changes line up with how you've felt.</p>
    </div>

    <div class="card"><h2 style="margin-top:0">Daily reminder</h2>
      <label class="inline"><input type="checkbox" id="rem-on" ${st.settings.reminderOn ? 'checked' : ''}> Remind me to check in</label>
      <label for="rem-time">Time</label>
      <input type="time" id="rem-time" value="${esc(st.settings.reminderTime)}">
      <p class="small muted">An iPhone web app can't send notifications when it's closed without an online server, and this app deliberately has none. So when you open the app after this time, a reminder card shows on Home and a dot appears on Check-in. For a real buzz, you can also set a daily alarm in the iPhone Reminders app.</p>
    </div>

    <div class="card"><h2 style="margin-top:0">Bleed history</h2>
      ${bleeds.length ? `<ul class="hist">${bleeds.map((b) => `<li><span>${esc(formatDate(b.date))} <span class="muted small">${b.type}${b.counts === false ? ', not counted' : ''}</span></span><span>${b.counts === false ? `<button class="link" data-action="bleed-count-yes" data-id="${esc(b.id)}">Count it</button>` : ''}<button class="link" data-action="remove-bleed" data-id="${esc(b.id)}" aria-label="Delete bleed on ${esc(formatDate(b.date))}">Delete</button></span></li>`).join('')}</ul>` : '<p class="muted">No bleeds logged yet.</p>'}
    </div>

    ${st.customSymptoms.length ? `<div class="card"><h2 style="margin-top:0">Your own symptoms</h2><ul class="hist">${st.customSymptoms.map((c) => `<li><span>${esc(c.label)}</span><button class="link" data-action="remove-custom" data-id="${esc(c.id)}">Remove</button></li>`).join('')}</ul><p class="small muted">Removing one only takes it off the list. Past logs stay.</p></div>` : ''}

    <div class="card"><h2 style="margin-top:0">Your data</h2>
      <div class="stack">
        <a class="btn block" href="#/summary">Printable summary for a doctor visit</a>
        <button class="block" data-action="export">Export a backup (JSON)</button>
        <button class="block" data-action="import">Restore from a backup</button>
      </div>
      <p class="small muted">Everything is stored only on this phone. No account, no server, no tracking. If you lose or reset the phone, the data goes with it, so export a backup now and then. ${st.settings.lastExport ? `Last backup: ${esc(formatDate(toDateStr(new Date(st.settings.lastExport))))}.` : 'No backup yet.'}</p>
    </div>

    <div class="card alert"><h2 style="margin-top:0">Delete all data</h2>
      <p>Erases every bleed, symptom and note from this phone.</p>
      <button class="danger block" data-action="delete-open">Delete all data</button></div>
    <p class="small muted center">General information only, not medical advice.</p>`;
}

function medsHtml(st) {
  if (!st.meds.length) return '<p class="muted" style="margin:0">None added.</p>';
  const meds = [...st.meds].sort((a, b) => (!!a.end - !!b.end) || (a.start < b.start ? 1 : -1));
  const fmt = { month: 'short', day: 'numeric', year: 'numeric' };
  return `<ul class="hist">${meds.map((m) => `<li><span><strong>${esc(m.name)}</strong>${m.note ? ` <span class="small">${esc(m.note)}</span>` : ''}<br><span class="muted small">${esc(MED_KINDS[m.kind] ?? m.kind)} &middot; ${m.end ? `${esc(formatDate(m.start, fmt))} to ${esc(formatDate(m.end, fmt))}` : `since ${esc(formatDate(m.start, fmt))}`}</span></span>
    <span>${m.end ? `<button class="link" data-action="med-resume" data-id="${esc(m.id)}">Resume</button>` : `<button class="link" data-action="med-stop" data-id="${esc(m.id)}">Stopped</button>`}<button class="link" data-action="med-remove" data-id="${esc(m.id)}" aria-label="Delete ${esc(m.name)}">Delete</button></span></li>`).join('')}</ul>`;
}

function openMedSheet() {
  openSheet(`<h2 id="sheet-title">Add a medication or supplement</h2>
    <label for="med-name">Name</label>
    <input type="text" id="med-name" maxlength="60" placeholder="For example: estradiol patch, magnesium, ashwagandha">
    <label for="med-kind">Type</label>
    <select id="med-kind">${Object.entries(MED_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
    <label for="med-note">Dose or note (optional)</label>
    <input type="text" id="med-note" maxlength="120" placeholder="For example: 0.05 mg, twice a week">
    <label for="med-start">Started</label>
    <input type="date" id="med-start" max="${toDateStr()}" value="${toDateStr()}">
    <div class="row" style="margin-top:.9rem"><button class="primary" data-action="med-save">Save</button><button class="ghost" data-action="close-sheet">Cancel</button></div>`);
}

// ---- SUMMARY ---------------------------------------------------------------
function renderSummary() {
  const st = store.getState();
  const today = toDateStr();
  const from = addMonths(today, -ui.summaryMonths);
  const last = store.lastBleed();
  const bleeds = [...st.bleeds].sort((a, b) => (a.date < b.date ? 1 : -1));
  // Bleeds inside the period, plus the one just before it so the doctor can see the gap.
  const prevIdx = bleeds.findIndex((b) => b.date < from);
  const shown = bleeds.filter((b, i) => b.date >= from || i === prevIdx);
  const tally = symptomTally(st.logs, from, today);
  const span = daysBetween(from, today) + 1;
  const { day, time } = patternsNow();
  const notes = Object.entries(st.notes).filter(([d]) => d >= from && d <= today).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const md = last ? monthsAndDays(last.date, today) : null;
  const lengths = cycleLengths(store.countingBleeds()).filter((c) => c.to >= from);
  const meds = st.meds.filter((m) => m.start <= today && (!m.end || m.end >= from)).sort((a, b) => (a.start < b.start ? -1 : 1));
  const dfmt = { month: 'short', day: 'numeric', year: 'numeric' };

  return `<div class="no-print row" style="align-items:end;margin-bottom:.6rem">
      <a class="btn" href="#/more" style="flex:0 0 auto">&lsaquo; Back</a>
      <div><label for="sum-range" style="margin-top:0">Period</label>
        <select id="sum-range">${[3, 6, 12].map((m) => `<option value="${m}"${ui.summaryMonths === m ? ' selected' : ''}>Last ${m} months</option>`).join('')}</select></div>
      <button class="primary" data-action="print">Print / save PDF</button>
    </div>
    <article class="doc">
      <h1>Cycle and symptom summary</h1>
      <p class="muted">Prepared ${esc(formatDate(today))} &middot; covers ${esc(formatDate(from))} to ${esc(formatDate(today))}. Self-reported, from the person's own tracking.</p>
      <h2>Bleeding</h2>
      ${!countdownOn() ? '<p>Bleeding is not used as a guide for this person (for example hysterectomy, ablation, or hormonal IUD, pill or HRT), so no bleed countdown is tracked.</p>' : last ? `<p><strong>Last bleed:</strong> ${esc(formatDate(last.date))} (${last.type}). <strong>${plural(daysBetween(last.date, today), 'day')}</strong> since (${md.months} months, ${md.days} days).</p>` : '<p>No bleeds logged.</p>'}
      ${shown.length ? `<table><thead><tr><th>Date</th><th>Type</th></tr></thead><tbody>${shown.map((b) => `<tr><td>${esc(formatDate(b.date))}</td><td>${b.type}${b.counts === false ? ' (unsure whether it counts)' : ''}${b.afterMenopause ? ' (after 12+ months with none)' : ''}</td></tr>`).join('')}</tbody></table>` : ''}
      ${lengths.length ? `<h2>Time between bleeds</h2><table><thead><tr><th>From</th><th>To</th><th>Days</th></tr></thead><tbody>${lengths.map((c) => `<tr><td>${esc(formatDate(c.from))}</td><td>${esc(formatDate(c.to))}</td><td>${c.length}</td></tr>`).join('')}</tbody></table>` : ''}
      ${meds.length ? `<h2>Medications and supplements</h2><table><thead><tr><th>Name</th><th>Type</th><th>Started</th><th>Stopped</th></tr></thead><tbody>${meds.map((m) => `<tr><td>${esc(m.name)}${m.note ? ` (${esc(m.note)})` : ''}</td><td>${esc(MED_KINDS[m.kind] ?? m.kind)}</td><td>${esc(formatDate(m.start, dfmt))}</td><td>${m.end ? esc(formatDate(m.end, dfmt)) : 'ongoing'}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>Most frequent symptoms</h2>
      ${tally.length ? `<table><thead><tr><th>Symptom</th><th>Days logged</th><th>Rough days</th></tr></thead><tbody>${tally.slice(0, 12).map((t) => `<tr><td>${esc(labelOf(t.symptom, st.customSymptoms))}</td><td>${t.days} of ${span}</td><td>${t.roughDays}</td></tr>`).join('')}</tbody></table>` : '<p>No symptoms logged in this period.</p>'}
      ${day.length || time.length ? `<h2>Repeating patterns</h2><ul>${day.map((p) => `<li>${esc(describeDayPattern(p, st.customSymptoms))}</li>`).join('')}${time.map((t) => `<li>${esc(describeTimePattern(t, st.customSymptoms))}</li>`).join('')}</ul>` : ''}
      ${notes.length ? `<h2>Notes</h2><table><tbody>${notes.map(([d, n]) => `<tr><td style="white-space:nowrap">${esc(formatDate(d, { month: 'short', day: 'numeric' }))}</td><td>${esc(n)}</td></tr>`).join('')}</tbody></table>` : ''}
    </article>`;
}

// ---- actions ---------------------------------------------------------------
const actions = {
  'open-quick': () => openQuick(),
  'close-sheet': () => closeSheet(),
  'dismiss-install': () => { try { localStorage.setItem('hint-install-dismissed', '1'); } catch { /* ignore */ } render(); },

  'open-bleed': () => openBleedSheet(),
  'bleed-save': (el) => saveBleed(el.dataset.type, $('#bleed-date')?.value),
  'setup-bleed': (el) => {
    const date = $('#setup-date')?.value;
    if (!date || date > toDateStr()) return toast('Pick a date that is today or earlier.');
    store.addBleed(el.dataset.type, date);
    toast('Counter started.');
  },
  'dismiss-note': (el) => store.dismissMenopauseNote(el.dataset.id),
  'mode-symptoms': () => { store.updateSettings({ mode: 'symptoms' }); toast('Countdown off. You can turn it back on in More.'); },
  'mode-countdown': () => store.updateSettings({ mode: 'countdown' }),
  'bleed-count-yes': (el) => { store.setBleedCounts(el.dataset.id, true); toast('Counted. The counter has restarted from that date.'); },
  'bleed-count-no': (el) => { store.setBleedCounts(el.dataset.id, false); toast('Left out of the count.'); },
  'snooze-backup': () => { store.snoozeBackup(7); toast("OK, I'll ask again in a week."); },

  'med-add': () => openMedSheet(),
  'med-save': () => {
    const name = $('#med-name')?.value ?? '';
    const start = $('#med-start')?.value || toDateStr();
    if (!name.trim()) return toast('Type a name first.');
    if (start > toDateStr()) return toast('Pick a start date that is today or earlier.');
    store.addMed({ name, kind: $('#med-kind')?.value, note: $('#med-note')?.value, start });
    closeSheet();
    toast('Added.');
  },
  'med-stop': (el) => store.stopMed(el.dataset.id),
  'med-resume': (el) => store.resumeMed(el.dataset.id),
  'med-remove': (el) => {
    const m = store.getState().meds.find((x) => x.id === el.dataset.id);
    if (m) confirmSheet(`Delete ${m.name} from your list?`, 'med-remove-yes', el.dataset.id);
  },
  'med-remove-yes': (el) => { closeSheet(); store.removeMed(el.dataset.id); },

  'ql-rating': (el) => { ui.ql.rating = Number(el.dataset.v); renderQuick(); },
  'ql-pick': (el) => {
    const entry = store.addQuickLog(el.dataset.id, ui.ql.rating);
    ui.ql = { ...ui.ql, view: 'saved', entry };
    renderQuick();
  },
  'ql-undo': () => {
    if (ui.ql.entry) store.removeLog(ui.ql.entry.id);
    ui.ql = { ...ui.ql, view: 'pick', entry: null };
    closeSheet();
    toast('Removed.');
  },
  'ql-again': () => { ui.ql = { ...ui.ql, view: 'pick', entry: null }; renderQuick(); },

  'ci-cycle': (el) => {
    const id = el.dataset.id;
    ui.checkin.note = $('#ci-note')?.value ?? ui.checkin.note;
    const next = ((ui.checkin.ratings[id] ?? 0) + 1) % 4;
    if (next) ui.checkin.ratings[id] = next;
    else delete ui.checkin.ratings[id];
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  },
  'ci-day': (el) => { closeSheet(); startCheckin(el.dataset.date); render(); window.scrollTo(0, 0); },
  'ci-add-custom': () => {
    const input = $('#ci-custom');
    const sym = store.addCustomSymptom(input?.value ?? '');
    if (!sym) return toast('Type a name first.');
    ui.checkin.note = $('#ci-note')?.value ?? ui.checkin.note;
    ui.checkin.ratings[sym.id] = 1;
    render();
  },
  'ci-save': () => saveCheckin(),
  'ci-finish': () => {
    closeSheet();
    startCheckin(toDateStr());
    location.hash = '#/home';
    render();
  },

  'cal-prev': () => { ui.cal.month = monthKey(addMonths(`${ui.cal.month}-01`, -1)); render(); },
  'cal-next': () => { ui.cal.month = monthKey(addMonths(`${ui.cal.month}-01`, 1)); render(); },
  'cal-day': (el) => { ui.cal.selected = ui.cal.selected === el.dataset.date ? null : el.dataset.date; render(); },
  'cal-del-log': (el) => store.removeLog(el.dataset.id),
  'cal-del-bleed': (el) => store.removeBleed(el.dataset.id),
  'cal-edit-day': (el) => { startCheckin(el.dataset.date); ui.keepCheckin = true; location.hash = '#/checkin'; },
  'cal-add-bleed': (el) => openBleedSheet(el.dataset.date),

  'more-add-bleed': () => openBleedSheet(),
  'more-catchup': () => { startCheckin(addDays(toDateStr(), -1)); ui.keepCheckin = true; },
  'remove-bleed': (el) => {
    const b = store.getState().bleeds.find((x) => x.id === el.dataset.id);
    if (b) confirmSheet(`Delete the bleed on ${formatDate(b.date)}?`, 'remove-bleed-yes', el.dataset.id);
  },
  'remove-bleed-yes': (el) => { closeSheet(); store.removeBleed(el.dataset.id); },
  'remove-custom': (el) => store.removeCustomSymptom(el.dataset.id),

  print: () => window.print(),

  export: () => exportBackup(),
  import: () => pickBackup(),
  'import-yes': () => {
    try {
      store.importData(ui.pendingImport);
      ui.pendingImport = null;
      closeSheet();
      toast('Backup restored.');
    } catch (err) {
      closeSheet();
      toast(err.message);
    }
  },
  'delete-open': () => openSheet(`<h2 id="sheet-title">Delete everything?</h2>
    <p>This erases all bleeds, symptoms and notes on this phone and cannot be undone. Export a backup first if you might want it back.</p>
    <button class="block" data-action="export">Export a backup first</button>
    <button class="danger block" style="margin-top:.6rem" data-action="delete-yes">Yes, delete everything</button>
    <button class="ghost block" style="margin-top:.6rem" data-action="close-sheet">Keep my data</button>`),
  'delete-yes': () => {
    store.deleteAll();
    ui.checkin = { date: null, ratings: {}, note: '' };
    closeSheet();
    toast('All data deleted.');
  },
};

function confirmSheet(message, yesAction, id) {
  openSheet(`<h2 id="sheet-title">${esc(message)}</h2>
    <button class="danger block" data-action="${yesAction}" data-id="${esc(id)}">Delete</button>
    <button class="ghost block" style="margin-top:.6rem" data-action="close-sheet">Cancel</button>`);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el, e);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'ci-date') {
    if (t.value && t.value <= toDateStr()) { startCheckin(t.value); render(); }
  } else if (t.id === 'tips-filter') {
    ui.tipsFilter = t.value;
    render();
  } else if (t.id === 'sum-range') {
    ui.summaryMonths = Number(t.value);
    render();
  } else if (t.name === 'mode') {
    store.updateSettings({ mode: t.value === 'symptoms' ? 'symptoms' : 'countdown' });
  } else if (t.id === 'rem-on') {
    store.updateSettings({ reminderOn: t.checked });
  } else if (t.id === 'rem-time') {
    if (t.value) store.updateSettings({ reminderTime: t.value });
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'ci-note') ui.checkin.note = e.target.value;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheetRoot.hidden) closeSheet();
});

// ---- export / import -------------------------------------------------------
async function exportBackup() {
  const json = JSON.stringify(store.exportData(), null, 2);
  const name = `cycle-backup-${toDateStr()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Cycle app backup' });
      store.markExported();
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  store.markExported();
}

function pickBackup() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      const d = parsed.data ?? parsed;
      if (!Array.isArray(d.logs) || !Array.isArray(d.bleeds)) throw new Error();
      ui.pendingImport = parsed;
      openSheet(`<h2 id="sheet-title">Restore this backup?</h2>
        <p>The backup has ${plural(d.bleeds.length, 'bleed')} and ${d.logs.length} symptom ${d.logs.length === 1 ? 'entry' : 'entries'}. Restoring <strong>replaces</strong> what's on this phone now.</p>
        <button class="primary block" data-action="import-yes">Replace with backup</button>
        <button class="ghost block" style="margin-top:.6rem" data-action="close-sheet">Cancel</button>`);
    } catch {
      toast('That file does not look like a backup from this app.');
    }
  });
  input.click();
}

// ---- boot ------------------------------------------------------------------
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();
});

navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

if (route() === 'checkin') startCheckin(toDateStr());
render();
