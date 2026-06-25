import {
  DESKTOP_BASE_URL,
  SOURCE,
  SOURCE_PARAM,
  FORWARD_PARAM_ALLOWLIST,
} from './config.js';

/**
 * Build the desktop URL to share:
 *   - start from DESKTOP_BASE_URL
 *   - forward ONLY allowlisted incoming params
 *   - always set/overwrite the acquisition marker (?hwa-source=mobile_landing)
 */
export function buildDesktopUrl(incomingSearch = window.location.search) {
  const incoming = new URLSearchParams(incomingSearch);
  const url = new URL(DESKTOP_BASE_URL);

  for (const key of FORWARD_PARAM_ALLOWLIST) {
    const value = incoming.get(key);
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  // Added/overwritten last so it cannot be spoofed by an incoming param.
  url.searchParams.set(SOURCE_PARAM, SOURCE);

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
