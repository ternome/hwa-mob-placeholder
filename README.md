# Hero Wars Alliance — Mobile Placeholder Landing

Lightweight mobile landing for `hero-wars-alliance.com`. Shown to phone users
instead of the WebGL client; lets them send the desktop link to themselves via
the native share sheet. See [`PLAN.md`](PLAN.md) for the full spec.

## Run locally

No build step — it's static. Serve the folder over HTTP (the Web Share API and
ES modules need an origin, not `file://`):

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

> Native sharing (`navigator.share`) only appears on mobile browsers; on desktop
> the page falls back to copying the link.

## Structure

```
index.html        # markup + inline benefit/CTA icons + meta
css/styles.css    # responsive layout (100dvh, safe-area, clamp, height MQs)
js/
  config.js       # constants, allowlist, approved copy
  analytics.js    # track() abstraction + EVENTS (stub sink: window.dataLayer)
  env.js          # device_os / browser labels (analytics only — never routing)
  share.js        # share_id, URL construction, Web Share, clipboard fallback
  main.js         # wiring: view event, tap handler, fallback feedback
assets/           # bg.webp, laptop.webp (device+map+logo), icon-share.svg — from Figma
```

## Decisions (per intake)

- **Format:** vanilla HTML/CSS/JS, no framework, no bundler.
- **Routing:** mobile-vs-desktop detection is handled by site infrastructure,
  **not** in this repo. This page assumes it is only served to phones.
- **Assets:** exported from Figma (node `6483:9883`) and compressed to WebP —
  `laptop.webp` (~37 KB), `bg.webp` (~2 KB), inline share SVG. WebP-only (no PNG
  fallback) since the target browser matrix all support it; total image weight
  well under the 500 KB budget.
- **Fonts:** Roboto Condensed (headline + benefits) and Inter (CTA + support),
  loaded from Google Fonts with `display=swap`.

## Out of scope here (live elsewhere)

- Device routing / serving WebGL to desktop.
- `mobile_desktop_link_opened` and downstream events — fire on the **desktop**
  side when the shared URL is opened; they reuse the same `share_id`.
- Analytics SDK — `track()` currently pushes to `window.dataLayer`; swap the
  `emit()` body in `js/analytics.js` for the real SDK.

## Debug

Set `window.__HWA_DEBUG__ = true` before load to log every analytics event.
