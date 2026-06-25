// Lightweight environment labels for ANALYTICS ONLY — never used for routing.

export function deviceOs() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac OS X/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  return 'other';
}

export function browserName() {
  const ua = navigator.userAgent || '';
  if (/CriOS/i.test(ua)) return 'chrome_ios';
  if (/FxiOS/i.test(ua)) return 'firefox_ios';
  if (/EdgiOS/i.test(ua)) return 'edge_ios';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Chrome\//i.test(ua)) return 'chrome';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/Safari\//i.test(ua)) return 'safari';
  return 'other';
}
