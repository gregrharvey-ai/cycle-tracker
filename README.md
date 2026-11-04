# Cycle & Symptoms

A private perimenopause tracker. An installable web app (PWA): no accounts, no server, no analytics. All data lives in the phone's own storage.

## Try it on the Mac

```bash
npm start        # serves http://localhost:8080
npm test         # pattern finder and store tests
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
- **Does a bleed count?** Logging a bleed asks whether it restarts the 12-month count. "Not sure" saves it without restarting, and Home asks again until she decides.
- **Symptom-only mode:** for hysterectomy, ablation, hormonal IUD, the pill or HRT, where bleeding is not a reliable guide. Turns the countdown off; everything else works.
- **Time between periods:** start-to-start gaps shown as a plain list (no prediction), also on the doctor summary. Bleed days within 7 days of each other count as one period.
- **Medications and supplements:** a simple start/stop log, printed on the doctor summary.
- **Backup nudge:** Home asks for a backup after 14 days with none, then every 30 days. Snooze is 7 days.
- **Evidence tags:** four levels. "Studied, not shown to work" is used where trials were negative or inconsistent and The Menopause Society (2023) does not recommend the option for hot flashes (black cohosh, soy, flax, red clover, evening primrose, trigger avoidance).
- **Tips content:** written as a careful draft with sources. Have a clinician or pharmacist review `js/tips.js` (especially the herb safety notes) before anyone besides the first user relies on it.
