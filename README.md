# Cycle & Symptoms

A private perimenopause tracker. An installable web app (PWA): no accounts, no server, no analytics. All data lives in the phone's own storage.

## Try it on the Mac

```bash
npm start        # serves http://localhost:8080
npm test         # pattern finder tests
```

No build step, no dependencies. Plain HTML, CSS and ES modules.

## Get it onto an iPhone

Add to Home Screen and offline mode need the app served over **HTTPS**. Any static host works (Cloudflare Pages, Netlify, GitHub Pages): upload this folder as-is. The host only serves the files; it never receives her data. Then, on her iPhone in Safari: Share, then **Add to Home Screen**.

Live site: https://gregrharvey-ai.github.io/cycle-tracker/ (GitHub Pages, served from the `main` branch; pushing to `main` updates it in about a minute).

Note: data is per device and per web address. If the site address changes later, her data does not follow, so use Export (More tab) before moving.

## What is where

| File | Purpose |
| --- | --- |
| `js/app.js` | Screens and interaction |
| `js/store.js` | Storage (localStorage), bleeds, logs, export/import/delete |
| `js/patterns.js` | Pattern finder and heads-up messages (pure functions, tested) |
| `js/tips.js` | Resource content, evidence tags, sources |
| `js/symptoms.js` | Symptom checklist from the brief |
| `sw.js` | Offline support (network first, cache fallback) |

## Decisions worth knowing

- **Reminders:** a true background notification on iPhone needs web push, which needs an online server, which the brief rules out. The app shows a reminder card and a dot on the Check-in tab when opened after her chosen time.
- **Catch-up:** past bleeds and past days can be added (More tab, or tap a day in the calendar), so her notepad history feeds the countdown and the pattern finder.
- **Pattern finder rules:** a symptom is flagged when it falls in the same window of up to 5 days of the month in at least 3 of the last 6 months (and in about 75% of the months it could be checked), and is not simply there every day. Time-of-day patterns need 5 or more quick logs.
- **Tips content:** written as a careful draft with sources. Have a clinician or pharmacist review `js/tips.js` (especially the herb safety notes) before anyone besides the first user relies on it.
