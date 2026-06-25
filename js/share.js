import {
  DESKTOP_BASE_URL,
  SOURCE,
  FORWARD_PARAM_ALLOWLIST,
  SHARE_ID_STORAGE_KEY,
} from './config.js';

/**
 * Get (or lazily create) the opaque per-session share_id.
 * Generated once and reused for every share attempt from the same page session.
 */
export function getShareId() {
  let id = null;
  try {
    id = sessionStorage.getItem(SHARE_ID_STORAGE_KEY);
  } catch (_) {
    // sessionStorage may be blocked (private mode / in-app browser).
  }
  if (!id) {
    id = generateOpaqueId();
    try {
      sessionStorage.setItem(SHARE_ID_STORAGE_KEY, id);
    } catch (_) {
      /* keep the in-memory id for this session */
    }
  }
  return id;
}

/** Cryptographically strong, opaque, non-PII identifier. */
function generateOpaqueId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  // RFC4122 v4 from getRandomValues (older browsers without randomUUID).
  if (window.crypto && window.crypto.getRandomValues) {
    const b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h
      .slice(6, 8)
      .join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
  // Should never reach here on supported browsers.
  throw new Error('No cryptographically strong random source available');
}

/**
 * Build the desktop URL to share:
 *   - start from DESKTOP_BASE_URL
 *   - forward ONLY allowlisted incoming params
 *   - always set/overwrite source + share_id
 */
export function buildDesktopUrl(shareId, incomingSearch = window.location.search) {
  const incoming = new URLSearchParams(incomingSearch);
  const url = new URL(DESKTOP_BASE_URL);

  for (const key of FORWARD_PARAM_ALLOWLIST) {
    const value = incoming.get(key);
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  // Always added/overwritten last so they cannot be spoofed by incoming params.
  url.searchParams.set('source', SOURCE);
  url.searchParams.set('share_id', shareId);

  return url.toString();
}

/** Feature-detect native sharing for this specific URL. */
export function canNativeShare(url) {
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare === 'function') {
    try {
      return navigator.canShare({ url });
    } catch (_) {
      return false;
    }
  }
  return true;
}

export function nativeShare({ title, text, url }) {
  return navigator.share({ title, text, url });
}

/** Copy text to clipboard. Resolves true on success, false otherwise. */
export async function copyToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return legacyCopy(text);
    }
  }
  return legacyCopy(text);
}

/** execCommand fallback for older in-app browsers. */
function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

/** True when the share promise rejected because the user cancelled the sheet. */
export function isAbortError(err) {
  return !!err && (err.name === 'AbortError' || err.code === 20);
}
