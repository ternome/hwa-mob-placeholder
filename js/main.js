import { COPY, SHARE_TITLE, SHARE_TEXT, SOURCE } from './config.js';
import { EVENTS, track } from './analytics.js';
import { deviceOs, browserName } from './env.js';
import {
  getShareId,
  buildDesktopUrl,
  canNativeShare,
  nativeShare,
  copyToClipboard,
  isAbortError,
} from './share.js';

const shareId = getShareId();
let shareAttempt = 0;

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
  share_id: shareId,
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
  shareAttempt += 1;
  const url = buildDesktopUrl(shareId);
  const supported = canNativeShare(url);

  track(EVENTS.SHARE_TAP, {
    share_id: shareId,
    source: SOURCE,
    share_attempt_number: shareAttempt,
    web_share_supported: supported,
  });

  if (!supported) {
    await fallbackCopy(url, 'web_share_unsupported');
    return;
  }

  try {
    await nativeShare({ title: SHARE_TITLE, text: SHARE_TEXT, url });
    // Resolved is only a WEAK proxy — it does not prove the link was sent.
    track(EVENTS.SHARE_RESOLVED, {
      share_id: shareId,
      source: SOURCE,
      share_attempt_number: shareAttempt,
    });
  } catch (err) {
    if (isAbortError(err)) {
      // User cancelled — no error UI, allow another tap.
      track(EVENTS.SHARE_CANCELLED, {
        share_id: shareId,
        source: SOURCE,
        share_attempt_number: shareAttempt,
        error_name: err.name || 'AbortError',
      });
      return;
    }
    track(EVENTS.SHARE_FAILED, {
      share_id: shareId,
      source: SOURCE,
      share_attempt_number: shareAttempt,
      error_name: (err && err.name) || 'Error',
    });
    await fallbackCopy(url, 'web_share_failed');
  }
}

async function fallbackCopy(url, reason) {
  const ok = await copyToClipboard(url);
  if (ok) {
    track(EVENTS.LINK_COPIED, {
      share_id: shareId,
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
