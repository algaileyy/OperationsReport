# Operations Report — Desktop

A portable Windows desktop app (Electron) that opens the `/input` page of
the hosted Operations Report as a proper application window — same pattern
as the `finfo` app: no installer, download a zip, double-click the `.exe`.

It doesn't run its own server or database. It's a thin window pointed at
whichever URL the report is deployed to (Vercel, by default) — every
teammate's app talks to the same live site, so entries show up on
`/report` immediately for everyone, same as using a browser.

## First run

On first launch (or if `config.json` next to the `.exe` is missing), the
app shows a one-time setup screen asking for the report's URL — e.g.
`https://operations-report.vercel.app`. Enter it once; it's saved to
`config.json` next to the `.exe` and remembered after that. Change it
anytime from the **File → Change Server URL...** menu.

## Building it yourself

```bash
cd desktop
npm install
npm run package
```

Output goes to `desktop/dist/Operations Report-win32-x64/`. Zip that
folder and attach it to a GitHub Release — that's the file teammates
download.

## Files

| File | Purpose |
|---|---|
| `main.js` | Electron main process — creates the window, reads/writes `config.json` |
| `preload.js` | Exposes a minimal, safe `window.desktop` API to the setup screen |
| `setup.html` | One-time "enter the server URL" screen |
