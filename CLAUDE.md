# Yabiz

Personal life-organizer PWA (UI in Spanish). No build step: static HTML + ES modules, Preact + htm from jsDelivr, Firebase v10 from gstatic. Hosted on GitHub Pages; data in Firestore under `users/{uid}/{collection}/{id}`.

- `js/store.js`: global state `S`, realtime subscriptions to every collection, `save/patch/remove/rawSet`, editor open/close, first-run seed, auto-charging subscriptions.
- Two backends with the same interface: `backend-firebase.js` (used when `js/config.js` has an apiKey) and `backend-local.js` (localStorage demo mode).
- Everything autosaves: `Txt` in `components.js` debounces and flushes on blur/unmount. Editors create a `draft` doc immediately; `closeEditor` deletes it if empty.
- `js/gcal.js` pushes events/routines/tasks to Google Calendar through `apps-script/Code.gs` (text/plain POST to avoid CORS preflight). Pending = `updatedAt !== gcalRev`; deletions are soft (`deleted: true`) until the calendar confirms.
- Seeded area ids used in code: `personal`, `uni`, `salud`, `wallapop`, `agencia`, `ocio`; account ids `personal`, `negocio`.
- Local test: `powershell -ExecutionPolicy Bypass -File .claude/serve.ps1` → http://localhost:5173 (launch config `yabiz`).
- Bump `CACHE` in `sw.js` isn't required (network-first), but keep CDN versions pinned.
