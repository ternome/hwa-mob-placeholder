// Share instruction banner ("fake push") controller.
//
// The banner is a plain HTML element (NOT the Notifications API) shown while the
// native share flow runs, reinforcing the share-sheet steps. It cannot render
// above the OS share sheet (PLAN §2) — it's best-effort reinforcement only.
//
// This module owns the banner's visibility state. main.js drives it around the
// existing share flow; the share URL / clipboard logic is untouched.
//
// Note: the banner is shown by main.js AFTER navigator.share() is invoked, not
// before. Compositing this card's backdrop-filter layer is expensive on its
// first paint, and doing that before the share() call breaks iOS Safari's
// transient-activation window (see main.js onShareTap).

import { EVENTS, track } from './analytics.js';
import { deviceOs, browserName } from './env.js';
import { SOURCE } from './config.js';

const SHOW_TIMEOUT_MS = 20_000; // safety auto-hide (PLAN §8)

const banner = document.querySelector('[data-share-instruction]');
const closeButton = document.querySelector('[data-share-instruction-close]');

let timerId = null; // 20s safety timeout
let visible = false;
let shownAt = 0;
let currentAttempt = 0;

/**
 * Show the banner. Idempotent within a display session: a second call while
 * already visible does nothing (no duplicate timer or analytics event).
 */
export function showShareInstruction(trigger, attemptNumber) {
  if (!banner || visible) return;

  visible = true;
  shownAt = Date.now();
  currentAttempt = attemptNumber;

  banner.classList.add('is-visible');
  banner.setAttribute('aria-hidden', 'false');

  track(EVENTS.SHARE_INSTRUCTION_SHOWN, {
    source: SOURCE,
    trigger,
    share_attempt_number: attemptNumber,
    device_os: deviceOs(),
    browser: browserName(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  });

  timerId = window.setTimeout(() => hideShareInstruction('timeout'), SHOW_TIMEOUT_MS);
}

/**
 * Hide the banner. Idempotent: only the first call per display session emits the
 * hidden event, so the share-flow `finally` can call it without double-counting.
 */
export function hideShareInstruction(reason) {
  if (!banner || !visible) return;

  window.clearTimeout(timerId);
  timerId = null;
  visible = false;

  banner.classList.remove('is-visible');
  banner.setAttribute('aria-hidden', 'true');

  track(EVENTS.SHARE_INSTRUCTION_HIDDEN, {
    source: SOURCE,
    reason,
    visible_duration_ms: Date.now() - shownAt,
    share_attempt_number: currentAttempt,
    device_os: deviceOs(),
    browser: browserName(),
  });
}

// --- Dismissal (PLAN §9) ----------------------------------------------------
// A pointer tap anywhere on the card dismisses it, except on the close button
// (which has its own handler so it doesn't double-fire).
banner?.addEventListener('click', (event) => {
  if (event.target.closest('[data-share-instruction-close]')) return;
  hideShareInstruction('user_card_tap');
});

closeButton?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  hideShareInstruction('user_close_tap');
});

// Page being destroyed: clear the timer, but stay quiet — no noisy analytics on
// teardown (PLAN §16).
window.addEventListener('pagehide', () => {
  window.clearTimeout(timerId);
  timerId = null;
});
