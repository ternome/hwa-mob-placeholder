// Thin analytics abstraction. Replace the body of `emit` with the project's
// real analytics SDK call later — event names and call sites stay stable.

export const EVENTS = {
  LANDING_VIEW: 'mobile_desktop_landing_view',
  SHARE_TAP: 'mobile_desktop_share_tap',
  SHARE_RESOLVED: 'mobile_desktop_share_resolved',
  SHARE_CANCELLED: 'mobile_desktop_share_cancelled',
  SHARE_FAILED: 'mobile_desktop_share_failed',
  LINK_COPIED: 'mobile_desktop_link_copied',
  // Share instruction banner ("fake push") visibility (PLAN §12).
  SHARE_INSTRUCTION_SHOWN: 'mobile_desktop_share_instruction_shown',
  SHARE_INSTRUCTION_HIDDEN: 'mobile_desktop_share_instruction_hidden',
  // mobile_desktop_link_opened + downstream (login_completed / game_started /
  // purchase) fire on the DESKTOP side when the shared URL is opened. They are
  // out of scope for this page but share the same `share_id` correlation key.
};

function emit(event, props) {
  // Stub sink: GA-style dataLayer push + optional console for verification.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...props });
  if (window.__HWA_DEBUG__) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, props);
  }
}

/** Fire an analytics event. Never throws — analytics must not break the page. */
export function track(event, props = {}) {
  try {
    emit(event, props);
  } catch (_) {
    /* swallow */
  }
}
