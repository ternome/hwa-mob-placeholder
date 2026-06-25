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
  isShareInstructionVisible,
  scheduleInstructionHide,
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
// Show the banner on pointerdown so it can paint BEFORE the native sheet opens
// (PLAN §7). Only when sharing is actually supported — otherwise no chooser
// opens and the instruction would mislead (PLAN §11).
ctaButton?.addEventListener('pointerdown', () => {
  if (shareInProgress || isShareInstructionVisible()) return;
  if (!canNativeShare(buildDesktopUrl())) return;
  showShareInstruction('pointerdown', shareAttempt + 1);
});

// Gesture abandoned (e.g. scrolled away): no click will follow, so retire the
// banner shortly after.
ctaButton?.addEventListener('pointercancel', () => {
  scheduleInstructionHide('pointer_cancel', 800);
});

ctaButton?.addEventListener('click', onShareTap);

async function onShareTap() {
  if (shareInProgress) return; // duplicate tap while sharing (PLAN §16)

  shareAttempt += 1;
  const url = buildDesktopUrl();
  const supported = canNativeShare(url);

  track(EVENTS.SHARE_TAP, {
    source: SOURCE,
    share_attempt_number: shareAttempt,
    web_share_supported: supported,
  });

  if (!supported) {
    // No banner here (it was never shown when unsupported) — go straight to the
    // existing clipboard fallback.
    await fallbackCopy(url, 'web_share_unsupported');
    return;
  }

  // Keyboard activation has no pointerdown, so ensure the banner is up before
  // calling share() within this same user-activation event.
  if (!isShareInstructionVisible()) {
    showShareInstruction('click', shareAttempt);
  }

  shareInProgress = true;
  try {
    await nativeShare({ title: SHARE_TITLE, text: SHARE_TEXT, url });
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
