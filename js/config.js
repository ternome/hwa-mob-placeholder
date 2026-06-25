// Configuration constants for the Hero Wars Alliance mobile landing.
// NOTE: mobile-vs-desktop routing is handled by site infrastructure, not here.

/** Base desktop URL the shared link points to. Infra serves WebGL here on desktop. */
export const DESKTOP_BASE_URL = 'https://hero-wars-alliance.com/';

/** Acquisition-flow marker value, sent as the `hwa-source` query param. */
export const SOURCE = 'mobile_landing';

/** Query-param key for the acquisition marker (e.g. `?hwa-source=mobile_landing`). */
export const SOURCE_PARAM = 'hwa-source';

/**
 * Incoming query params that are safe to forward into the shared URL.
 * Everything else is dropped — no blind forwarding (PLAN §7, §13).
 * Add approved internal campaign-ID keys here once they are defined.
 */
export const FORWARD_PARAM_ALLOWLIST = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

/**
 * Localized JS strings. build.py emits a per-locale JSON block (#hwa-i18n) into
 * each index.{lang}.html; we read it here. English values are the fallback so
 * the page still works if the block is missing (e.g. the raw template).
 */
function readI18n() {
  try {
    const el = document.getElementById('hwa-i18n');
    if (el && el.textContent.trim()) return JSON.parse(el.textContent);
  } catch (_) {
    /* fall through to English defaults */
  }
  return {};
}
const I18N = readI18n();

/** Native share-sheet payload. The URL is the required part; some apps ignore title/text. */
export const SHARE_TITLE = I18N.shareTitle || 'Hero Wars Alliance';
export const SHARE_TEXT =
  I18N.shareText ||
  'Play Hero Wars Alliance on your computer — no download required.';

/** User-facing copy (approved — PLAN §4). */
export const COPY = {
  fallbackSuccess:
    I18N.copyFallbackSuccess ||
    'Link copied. Send it to yourself and open it on your computer.',
  error:
    I18N.copyError ||
    'Couldn’t share the link. Please copy it and send it to yourself.',
};
