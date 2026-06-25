// Configuration constants for the Hero Wars Alliance mobile landing.
// NOTE: mobile-vs-desktop routing is handled by site infrastructure, not here.

/** Base desktop URL the shared link points to. Infra serves WebGL here on desktop. */
export const DESKTOP_BASE_URL = 'https://hero-wars-alliance.com/';

/** Static acquisition-flow marker added to every shared URL. */
export const SOURCE = 'mobile_landing';

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

/** sessionStorage key under which the per-session opaque share_id is persisted. */
export const SHARE_ID_STORAGE_KEY = 'hwa_share_id';

/** Native share-sheet payload. The URL is the required part; some apps ignore title/text. */
export const SHARE_TITLE = 'Hero Wars Alliance';
export const SHARE_TEXT =
  'Play Hero Wars Alliance on your computer — no download required.';

/** User-facing copy (approved — PLAN §4). */
export const COPY = {
  fallbackSuccess:
    'Link copied. Send it to yourself and open it on your computer.',
  error: 'Couldn’t share the link. Please copy it and send it to yourself.',
};
