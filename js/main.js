import { COPY, SHARE_TITLE, SHARE_TEXT, SOURCE } from './config.js';
import { EVENTS, track } from './analytics.js';
import { deviceOs, browserName } from './env.js';
import {
  buildDesktopUrl,
  canNativeShare,
  nativeShare,
  copyToClipboard,
  isAbortError,
} from './share.js';
import {
  showShareInstruction,
  hideShareInstruction,
} from './share-instruction.js';

let shareAttempt = 0;
let shareInProgress = false; // dedup: ignore taps while a share is mid-flight

const ctaButton = document.querySelector('#cta');
const statusEl = document.querySelector('#share-status');

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.state = isError ? 'error' : 'success';
}

/** Mirror incoming utm_* params into analytics props (recording, not forwarding). */
function collectUtm() {
  const params = new URLSearchParams(window.location.search);
  const out = {};
  for (const [k, v] of params.entries()) {
    if (k.startsWith('utm_')) out[k] = v;
  }
  return out;
}

// --- 1. Landing view (fires once per page load) -----------------------------
track(EVENTS.LANDING_VIEW, {
  source: SOURCE,
  device_os: deviceOs(),
  browser: browserName(),
  viewport_width: window.innerWidth,
  viewport_height: window.innerHeight,
  referrer: document.referrer || '',
  ...collectUtm(),
});

// --- 2. Share action (user-tap initiated only) ------------------------------
ctaButton?.addEventListener('click', onShareTap);

async function onShareTap() {
  if (shareInProgress) return; // duplicate tap while sharing (PLAN §16)

  const url = buildDesktopUrl();
  const supported = canNativeShare(url);
  shareAttempt += 1;

  if (!supported) {
    track(EVENTS.SHARE_TAP, {
      source: SOURCE,
      share_attempt_number: shareAttempt,
      web_share_supported: false,
    });
    // No chooser opens, so no banner (PLAN §11) — clipboard fallback only.
    await fallbackCopy(url, 'web_share_unsupported');
    return;
  }

  // iOS Safari is strict about transient user activation: navigator.share() must
  // be invoked BEFORE any heavy DOM work in this handler. Showing the banner
  // first composites a backdrop-filter layer, and on Safari that first paint
  // pushes share() past the activation window — the call is rejected and only
  // the *second* tap (layer already warmed) opens the sheet. So invoke share()
  // first, then show the banner. This drops PLAN §7's pointerdown pre-show: a
  // valid share() call (§17, criterion 4) outranks the banner's early paint,
  // which is best-effort anyway (§2, §19).
  shareInProgress = true;
  const sharePromise = nativeShare({ title: SHARE_TITLE, text: SHARE_TEXT, url });

  showShareInstruction('click', shareAttempt);
  track(EVENTS.SHARE_TAP, {
    source: SOURCE,
    share_attempt_number: shareAttempt,
    web_share_supported: true,
  });

  try {
    await sharePromise;
    // Resolved is only a WEAK proxy — it does not prove the link was sent.
    track(EVENTS.SHARE_RESOLVED, {
      source: SOURCE,
      share_attempt_number: shareAttempt,
    });
    hideShareInstruction('share_resolved');
  } catch (err) {
    if (isAbortError(err)) {
      // User cancelled — no error UI, allow another tap.
      track(EVENTS.SHARE_CANCELLED, {
        source: SOURCE,
        share_attempt_number: shareAttempt,
        error_name: err.name || 'AbortError',
      });
      hideShareInstruction('share_cancelled');
      return;
    }
    track(EVENTS.SHARE_FAILED, {
      source: SOURCE,
      share_attempt_number: shareAttempt,
      error_name: (err && err.name) || 'Error',
    });
    hideShareInstruction('share_failed');
    await fallbackCopy(url, 'web_share_failed');
  } finally {
    shareInProgress = false;
    // Safety net — idempotent, so it's a no-op once an explicit reason above
    // already hid the banner (no duplicate hidden event; PLAN §10).
    hideShareInstruction('share_finished_fallback');
  }
}

async function fallbackCopy(url, reason) {
  const ok = await copyToClipboard(url);
  if (ok) {
    track(EVENTS.LINK_COPIED, {
      source: SOURCE,
      share_attempt_number: shareAttempt,
      fallback_reason: reason,
    });
    setStatus(COPY.fallbackSuccess, false);
  } else {
    // Both native share and clipboard failed.
    setStatus(COPY.error, true);
  }
}
