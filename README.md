# HoK Matchup Tracker — PWA

A self-contained Progressive Web App for tracking Honor of Kings matchup win rates across all five roles (Jungle, Mid, Clash, ADC, Support). Installable to home screen on iOS and Android, works offline, data persists locally.

## What's inside

- `index.html` — main HTML shell
- `styles.css` — full HoK red/gold styling
- `app.js` — application logic
- `sw.js` — service worker (offline support)
- `manifest.webmanifest` — PWA install manifest
- `icons/` — app icons (192, 512, maskable, apple touch)

## Features

- **5 separate role contexts** (Jungle/Mid/Clash/ADC/Support) — each with its own roster and history
- **Match logger**: two dropdowns + big Win/Loss buttons. Tap once per game.
- **Live record card** for the selected matchup
- **Undo last entry** (one level)
- **Matrix view**: full color-scaled win-rate grid, with "hide unplayed matchups" toggle
- **History view**: chronological match log with search and per-row delete
- **Roster view**: add/remove heroes per role, export/import JSON, reset per-role
- **Offline**: works without internet after first load
- **Persistent**: localStorage on the device

## Installing as an "app"

### On iPhone / iPad
1. Open the app in **Safari** (not Chrome — iOS requires Safari for PWA install).
2. Tap the **Share** button (the square with the up-arrow).
3. Scroll down → **Add to Home Screen** → **Add**.
4. The icon appears on your home screen. Tap it to open fullscreen, like a real app.

### On Android (Chrome)
1. Open the app in Chrome.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Confirm.

### Where to host the files
The files need to be served over HTTPS (or `file://` for testing) so the service worker works. Easy free options:
- **GitHub Pages**: push the `app/` folder to a repo, enable Pages on the main branch. Done in 5 minutes.
- **Netlify Drop**: drag the `app/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Instant public URL.
- **Vercel**: similar to Netlify.
- **Cloudflare Pages**: also free, also quick.

All four host static files for free. Once deployed, open the URL on your phone and follow the install steps above.

## "I want an actual .apk"

Since you mentioned APK: a PWA + "Add to Home Screen" gets you 95% of the way to a native-app feel without going through an APK build. But if you want a real installable `.apk` file (sideloadable, distributable), the cleanest path is **PWABuilder** or **Bubblewrap**, both of which take an existing PWA and wrap it in a Trusted Web Activity (TWA) — which is just a thin Android wrapper around the same web code.

### Easiest: PWABuilder (no command line)
1. Deploy the app to any HTTPS host (see above).
2. Go to [pwabuilder.com](https://www.pwabuilder.com).
3. Enter your deployed URL. It validates the manifest/service worker.
4. Click **Package for Stores** → **Android**.
5. Download the generated APK.
6. Transfer to your phone, enable **Install unknown apps** for your file manager, tap the APK to install.

### Alternative: Bubblewrap CLI
If you prefer command line, install Node 18+ and:
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://your-host/manifest.webmanifest
bubblewrap build
```
Outputs a signed APK plus an Android Bundle. Requires a one-time signing key setup.

Either path produces an APK that is essentially "the PWA wrapped in Android Chrome." Updates to your hosted PWA propagate to the installed APK automatically — you don't need to re-sign and re-distribute for content changes.

## Data portability

- **Export JSON**: Roster tab → Data → "Export JSON". Saves a timestamped file with everything.
- **Import JSON**: same tab → "Import JSON". Replaces current data.
- Use this to back up or move data between devices, since each device's localStorage is isolated.

## Migrating from the spreadsheet

This app doesn't read .xlsx, but you can recreate state quickly:
1. On the Roster tab, add your heroes for each role (use the role pills at the top to switch).
2. On the Log tab, replay your match history (or just start fresh — past data is past).

If you'd like, I can write a one-off conversion script that turns the previous `hok_jungler_tracker.xlsx` into the JSON format this app expects. Ask and I'll build it.

## Quick troubleshooting

- **Service worker not registering**: must be served over HTTPS (or localhost). `file://` won't register the SW but the app still works.
- **Data disappeared**: localStorage is per-browser-per-origin. If you clear browser data or switch browsers, the data clears too. Export regularly.
- **Install option missing on iOS**: it only appears in Safari. Chrome on iOS uses Safari's engine but doesn't expose Add to Home Screen.
