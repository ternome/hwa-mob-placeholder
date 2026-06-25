#!/usr/bin/env python3
"""
i18n build for the Hero Wars Alliance mobile placeholder landing.

Pipeline:
  1. Read src/index.template.html (the only HTML source).
  2. Validate every locales/{lang}.json against locales/_schema.json.
  3. Per locale: substitute {{key}} → value, inject the computed canonical URL
     and the JS-strings JSON block, then write index.html (en) / index.{lang}.html.
  4. Generate sitemap.xml (with hreflang alternates) + robots.txt.

CSS/JS are loaded as external files (css/styles.css, js/*.js) — no bundling or
minification here; the template references them directly.

Usage:
    python3 build.py

Vercel runs this as the `buildCommand`. Locally, run it after editing the
template or any locale, then reload the page. Output files are gitignored — the
source of truth is src/ + locales/.
"""
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).parent
TEMPLATE = BASE / "src" / "index.template.html"
LOCALES = BASE / "locales"
SCHEMA = LOCALES / "_schema.json"
SITEMAP_OUT = BASE / "sitemap.xml"
ROBOTS_OUT = BASE / "robots.txt"

SITE_BASE = "https://hwa-mob-placeholder.vercel.app"

# locale stem (= file name / URL slug) → hreflang tag for sitemap alternates.
HREFLANG_MAP = {
    "en": "en", "ru": "ru", "de": "de", "fr": "fr",
    "es": "es", "pt": "pt-BR", "it": "it", "pl": "pl",
    "ja": "ja", "ko": "ko", "zh-hans": "zh-Hans", "zh-hant": "zh-Hant",
}

# Locale keys whose values are consumed by JS (not placed in HTML markup).
# Surfaced to the page as a JSON <script> block and read by js/config.js.
JS_KEYS = {
    "share_title": "shareTitle",
    "share_text": "shareText",
    "copy_fallback_success": "copyFallbackSuccess",
    "copy_error": "copyError",
}


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def read(path):
    if not path.exists():
        die(f"missing file: {path}")
    return path.read_text(encoding="utf-8")


# Every locale (including en) is index.<stem>.html — deliberately NO plain
# index.html. Vercel serves a physical index.html for "/" BEFORE applying
# rewrites, which would bypass the Accept-Language routing entirely; with no
# index.html, "/" falls through to the rewrites in vercel.json.
def out_path(stem):
    return BASE / f"index.{stem}.html"


def url_path(stem):
    return f"/index.{stem}.html"


def validate_locale(stem, data, required_keys):
    actual, required = set(data.keys()), set(required_keys)
    missing, extra = required - actual, actual - required
    if missing or extra:
        msg = [f"locale '{stem}' schema mismatch:"]
        if missing:
            msg.append(f"  missing keys: {sorted(missing)}")
        if extra:
            msg.append(f"  extra keys:   {sorted(extra)}")
        die("\n".join(msg))


def build():
    template = read(TEMPLATE)
    schema = json.loads(read(SCHEMA))
    required_keys = schema["required_keys"]

    locale_files = sorted(f for f in LOCALES.glob("*.json") if not f.stem.startswith("_"))
    if not locale_files:
        die(f"no locale files in {LOCALES}")

    generated = []
    for lf in locale_files:
        stem = lf.stem
        data = json.loads(read(lf))
        validate_locale(stem, data, required_keys)

        result = template
        for key, value in data.items():
            result = result.replace(f"{{{{{key}}}}}", value)

        # Computed (non-translated) placeholders.
        canonical = SITE_BASE + url_path(stem)
        result = result.replace("{{canonical_url}}", canonical)

        i18n = {js_name: data[key] for key, js_name in JS_KEYS.items()}
        # ensure_ascii=False keeps CJK readable; escape </ so the value can't
        # close the <script> block early.
        i18n_json = json.dumps(i18n, ensure_ascii=False).replace("</", "<\\/")
        result = result.replace("{{i18n_json}}", i18n_json)

        remaining = re.findall(r"\{\{[^}]+\}\}", result)
        if remaining:
            die(f"[{stem}] unresolved placeholders: {sorted(set(remaining))}")

        dest = out_path(stem)
        dest.write_text(result, encoding="utf-8")
        generated.append(dest.name)
        print(f"  {dest.name:<22} {dest.stat().st_size // 1024} KB")

    write_sitemap()
    write_robots()
    print(f"\n{len(generated)} page(s) + sitemap.xml + robots.txt generated")
    return generated


def write_sitemap():
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for stem in HREFLANG_MAP:
        lines.append("  <url>")
        lines.append(f"    <loc>{SITE_BASE}{url_path(stem)}</loc>")
        for alt in HREFLANG_MAP:
            lines.append(
                f'    <xhtml:link rel="alternate" hreflang="{HREFLANG_MAP[alt]}" '
                f'href="{SITE_BASE}{url_path(alt)}" />'
            )
        lines.append(
            f'    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE_BASE}{url_path("en")}" />'
        )
        lines.append("    <changefreq>weekly</changefreq>")
        lines.append(f'    <priority>{"1.0" if stem == "en" else "0.9"}</priority>')
        lines.append("  </url>")
    lines.append("</urlset>")
    SITEMAP_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_robots():
    ROBOTS_OUT.write_text(
        "# Hero Wars Alliance — mobile placeholder landing\n"
        "User-agent: *\n"
        "Allow: /\n"
        f"\nSitemap: {SITE_BASE}/sitemap.xml\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    print("Building from src/index.template.html …")
    build()
