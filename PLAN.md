# PLAN.md — Hero Wars Alliance Mobile Landing

## 1. Goal

Implement a mobile-only landing page for `hero-wars-alliance.com`.

When a user opens the domain from an iOS or Android phone, they should not see the WebGL client. They should see a lightweight landing page that explains the desktop experience and lets them send the desktop link to themselves through the native iOS/Android share sheet.

The primary success event is not the share-sheet opening. It is the shared link being opened later on a desktop browser.

---

## 2. Scope

### In scope

- Mobile landing page matching the approved design.
- Responsive behavior for common iOS and Android phone sizes.
- Native sharing through the Web Share API.
- Copy-link fallback when native sharing is unavailable or fails.
- Tracking parameters in the shared URL.
- Analytics for the mobile-to-desktop funnel.
- Basic accessibility and browser compatibility.
- Desktop routing to the existing WebGL experience.

### Out of scope for V1

- Automatic account login or session transfer.
- One-time authentication tokens.
- Email or SMS collection.
- QR codes.
- App installation.
- Alternative landing-page variants.
- Tablet-specific redesign.
- Backend attribution to a known user account unless an existing safe attribution service already exists.

---

## 3. Routing behavior

### Mobile phone

Show the mobile landing page on supported handheld iOS and Android browsers.

Do not rely only on viewport width. Use the project's existing device-detection approach if one exists. Otherwise combine user-agent detection with coarse-pointer/mobile capability checks.

### Desktop

Open the existing Hero Wars Alliance WebGL experience.

The shared URL must resolve to the desktop experience when opened on a desktop browser.

### Tablet

Default V1 behavior:

- iPad and Android tablets should follow the existing product routing.
- Do not force them into the phone landing page unless the current WebGL experience is intentionally blocked there.

Keep tablet handling isolated so product can change this decision later.

---

## 4. Approved content

### Headline

```text
Play on Your
Computer
```

The line break may be responsive. Preserve the visual hierarchy from the approved mockup.

### Benefits

```text
Bigger screen
Keep your progress
No download needed
```

### CTA

```text
Send Link to Myself
```

### Supporting text

```text
Choose WhatsApp, Mail, or another app,
then open the link on your computer.
```

On very short screens, this text may move below the fold. The CTA must not.

### Fallback success message

```text
Link copied. Send it to yourself and open it on your computer.
```

### Error message

```text
Couldn’t share the link. Please copy it and send it to yourself.
```

---

## 5. Visual implementation

Follow the approved mockup rather than redesigning the page.

### Required visual elements

- Blue-to-purple background with subtle geometric shapes.
- Laptop visual showing the Hero Wars Alliance map.
- Hero Wars Alliance logo inside the laptop screen.
- Large white headline.
- Three lime-accented benefit icons.
- Large green primary CTA.
- Muted supporting text below the CTA.

### Layout priority

1. Laptop visual
2. Headline
3. Benefits
4. CTA
5. Supporting text

The CTA must remain visually dominant.

### Asset handling

- Use optimized production assets, not a screenshot of the full page.
- Export raster assets at suitable 2x resolution.
- Prefer WebP or AVIF with PNG fallback where needed.
- Keep logos and simple icons as SVG when possible.
- Add explicit dimensions to images to prevent layout shifts.
- Use `object-fit: contain`.
- Do not stretch or crop the laptop artwork.

---

## 6. Responsive behavior

The page must work in mobile Safari, Chrome, and common in-app browsers.

### Viewport requirements

Use:

```css
min-height: 100dvh;
```

Do not rely on `100vh` as the only height unit.

Respect safe areas:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### Critical acceptance viewport

At approximately `360 × 600 CSS px`:

- The entire CTA must be visible without scrolling.
- The laptop, headline, and benefits may scale down.
- Supporting text may move below the fold.
- No content may overlap.
- No horizontal scrolling may appear.

### Recommended CSS approach

Use `clamp()` for:

- headline size;
- laptop width or max-height;
- vertical gaps;
- page padding;
- CTA height.

Use height-based media queries for short screens, for example:

```css
@media (max-height: 700px) {
  /* reduce laptop size and vertical gaps */
}

@media (max-height: 620px) {
  /* preserve CTA visibility; supporting text may fall below fold */
}
```

Do not make the CTA sticky in V1 unless normal responsive compression cannot meet the acceptance viewport.

---

## 7. Sharing behavior

The share action must be initiated only by a direct user tap.

### Shared URL format

Use both a static source parameter and an opaque correlation ID:

```text
https://hero-wars-alliance.com/?source=mobile_landing&share_id=<opaque_random_id>
```

### Parameter rules

#### `source`

Use:

```text
source=mobile_landing
```

This identifies the acquisition flow.

#### `share_id`

Use a random, opaque identifier.

Recommended V1 format:

```text
crypto.randomUUID()
```

Generate it once per mobile landing session and reuse it for subsequent share attempts from the same page session.

Do not put any of the following directly into the URL:

- `user_uid`;
- email;
- phone number;
- account ID;
- session token;
- authentication token;
- any reversible personal identifier.

If attribution to a known player is required later, map the random `share_id` to internal identifiers server-side.

### Preserve incoming attribution

Preserve approved incoming campaign parameters when building the shared desktop URL, for example:

- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_content`;
- approved internal campaign IDs.

Do not blindly forward arbitrary query parameters. Use an allowlist.

The shared URL should always add or overwrite:

```text
source=mobile_landing
share_id=<opaque_random_id>
```

### Web Share API

Preferred implementation:

```js
await navigator.share({
  title: 'Hero Wars Alliance',
  text: 'Play Hero Wars Alliance on your computer — no download required.',
  url: desktopUrl,
});
```

Notes:

- Some target apps may ignore `title` or `text`.
- The URL is the required payload.
- Do not treat a resolved share promise as proof that the user sent the link.
- A user may close the share sheet without completing a share.

---

## 8. Fallback behavior

Check support before using the Web Share API:

```js
if (navigator.share && navigator.canShare?.({ url: desktopUrl }) !== false) {
  // use native share
} else {
  // copy fallback
}
```

If native sharing is unavailable or throws a non-cancellation error:

1. Copy `desktopUrl` to the clipboard.
2. Show the fallback success message.
3. Record the fallback analytics event.

Clipboard preference:

```js
await navigator.clipboard.writeText(desktopUrl);
```

Provide a legacy copy fallback only if required by the project's supported browser matrix.

Do not show an alarming error when the user simply cancels the native share sheet.

---

## 9. Analytics

Use the project's existing analytics SDK and naming conventions where available.

### Required events

#### `mobile_desktop_landing_view`

Properties:

```text
share_id
source
device_os
browser
viewport_width
viewport_height
referrer
utm_*
```

#### `mobile_desktop_share_tap`

Properties:

```text
share_id
source
share_attempt_number
web_share_supported
```

#### `mobile_desktop_share_resolved`

The native share promise resolved.

Properties:

```text
share_id
source
share_attempt_number
```

This is a weak proxy only. It does not prove that the link was sent.

#### `mobile_desktop_share_cancelled`

The share sheet was cancelled when the browser exposes a distinguishable cancellation error.

Properties:

```text
share_id
source
share_attempt_number
error_name
```

#### `mobile_desktop_share_failed`

A non-cancellation share error occurred.

Properties:

```text
share_id
source
share_attempt_number
error_name
```

Do not log the full exception if it could contain sensitive browser data.

#### `mobile_desktop_link_copied`

The fallback copied the link.

Properties:

```text
share_id
source
share_attempt_number
fallback_reason
```

#### `mobile_desktop_link_opened`

Fire when the shared URL is opened on desktop.

Properties:

```text
share_id
source
utm_*
device_os
browser
```

#### Downstream events

Where available, attach `share_id` to:

```text
login_completed
game_loaded
game_started
purchase
```

The minimum useful funnel is:

```text
mobile_desktop_landing_view
→ mobile_desktop_share_tap
→ mobile_desktop_link_opened
→ game_started
```

### Attribution limitation

If `share_id` exists only client-side and no server-side event store exists, the desktop open can still be attributed through the URL. However, linking it to a known mobile player requires a backend mapping and must not be implemented by exposing `user_uid`.

---

## 10. Accessibility

- Use a semantic `<button>` for the CTA.
- Minimum touch target: `44 × 44 CSS px`.
- Keep visible focus styles.
- CTA text must remain readable at 200% browser zoom where supported.
- Use sufficient contrast for the muted supporting text.
- Provide meaningful alt text for the laptop image, for example:

```text
Hero Wars Alliance running on a laptop
```

- Decorative background shapes should be hidden from assistive technologies.
- Do not put essential copy inside raster images.
- Respect `prefers-reduced-motion`.
- No autoplaying animation is required for V1.

---

## 11. Performance

This page should be lightweight and load faster than the WebGL client.

### Targets

- No WebGL bundle should be downloaded on the mobile landing route.
- Avoid heavy JavaScript frameworks if the host architecture does not require one.
- Lazy loading is not useful for above-the-fold hero assets; preload only the critical image if needed.
- Compress the laptop artwork aggressively without visible degradation.
- Avoid custom font downloads when an existing product font is already available.
- Prevent cumulative layout shift by reserving image dimensions.

Recommended target:

```text
Initial transferred page weight under 500 KB where practical,
excluding shared site infrastructure already required by the host.
```

---

## 12. SEO and metadata

This page is a device-specific entry state, not a separate indexed product page.

Use the same canonical product URL unless the routing architecture requires otherwise.

Suggested metadata:

```html
<title>Play Hero Wars Alliance on Your Computer</title>
<meta
  name="description"
  content="Send yourself a link and continue playing Hero Wars Alliance on a bigger screen. No download needed."
/>
```

Do not expose `share_id` in canonical URLs.

---

## 13. Security and privacy

- Never place raw `user_uid` in the shared URL.
- Never place authentication credentials in the shared URL.
- Treat `share_id` as analytics correlation, not authentication.
- Generate `share_id` using a cryptographically strong random source.
- Apply an allowlist when forwarding incoming query parameters.
- Do not render arbitrary query values into HTML without escaping.
- Do not use the shared URL to auto-login the player in V1.
- Do not store unnecessary personal data in local storage.

If automatic account handoff is added later, implement a separate one-time, short-lived, server-validated token. Do not reuse `share_id` as an authentication token.

---

## 14. Error handling

### Native share cancelled

- Keep the user on the page.
- Do not show an error toast.
- Allow another tap.

### Native share failed

- Attempt clipboard fallback.
- Show fallback success copy if clipboard succeeds.
- Show the error message only if both share and clipboard fail.

### Clipboard failed

Provide a final manual fallback, such as a small modal or field containing the URL with a `Copy link` button, only if required by the supported browser matrix.

Do not replace the primary CTA with a permanent error state.

---

## 15. Browser test matrix

At minimum test:

### iOS

- Latest Safari on a current iPhone.
- Safari on a smaller-screen iPhone.
- Chrome on iOS.
- At least one common in-app browser if traffic is expected from ads or social platforms.

### Android

- Latest Chrome on a current Android phone.
- Chrome on a smaller or lower-end Android phone.
- Samsung Internet if it has meaningful traffic.
- At least one common in-app browser if traffic is expected from ads or social platforms.

### Desktop handoff

Open a shared link on:

- Chrome on Windows.
- Safari on macOS.
- Chrome on macOS.

Verify that the desktop route loads the WebGL experience and records `mobile_desktop_link_opened`.

---

## 16. QA scenarios

1. Open the root domain on an iPhone.
2. Confirm the mobile landing appears instead of WebGL.
3. Confirm the CTA is fully visible on a short viewport.
4. Tap the CTA.
5. Confirm the native share sheet opens.
6. Share through Messages, Mail, WhatsApp, or another available app.
7. Confirm the outgoing URL includes `source=mobile_landing`.
8. Confirm the outgoing URL includes an opaque `share_id`.
9. Confirm the URL does not include `user_uid` or authentication data.
10. Open the shared URL on desktop.
11. Confirm the WebGL experience loads.
12. Confirm the desktop-open event includes the same `share_id`.
13. Cancel the share sheet and confirm no error is shown.
14. Simulate unsupported Web Share API and confirm clipboard fallback works.
15. Confirm analytics events do not fire twice from one action.
16. Confirm incoming approved UTM parameters survive into the shared URL.
17. Confirm unknown query parameters are not forwarded.
18. Confirm the layout works with browser UI expanded and collapsed.
19. Confirm there is no horizontal scroll.
20. Confirm the page remains usable with larger system text.

---

## 17. Acceptance criteria

The implementation is ready for release when all conditions below are met:

- The page visually matches the approved V1 mockup.
- Mobile users see the landing instead of downloading the WebGL client.
- Desktop users continue to receive the WebGL experience.
- The CTA is fully visible at approximately `360 × 600 CSS px`.
- Tapping the CTA opens the native share sheet on supported browsers.
- Unsupported or failed sharing falls back to copying the link.
- The shared URL contains `source=mobile_landing`.
- The shared URL contains a random opaque `share_id`.
- The shared URL contains no raw player identifier or authentication secret.
- Approved campaign parameters are preserved through an allowlist.
- A desktop open can be correlated back to the mobile landing through `share_id`.
- Required analytics events are implemented and verified.
- The page passes the agreed mobile browser test matrix.
- No WebGL bundle is loaded on the mobile landing route.
- Accessibility and safe-area requirements are satisfied.

---

## 18. Implementation order

1. Add device routing without changing desktop behavior.
2. Build the static responsive layout.
3. Implement URL construction and safe parameter forwarding.
4. Generate and persist the session-level `share_id`.
5. Implement native share.
6. Implement clipboard fallback and user feedback.
7. Add analytics.
8. Add desktop-open attribution.
9. Run responsive and browser QA.
10. Release behind a feature flag if the existing infrastructure supports it.
11. Monitor the funnel before making further visual changes.

---

## 19. Post-release metrics

Review after sufficient traffic:

- Landing view → CTA tap rate.
- CTA tap → desktop open rate.
- Desktop open → game started rate.
- Share API support rate by browser.
- Share failure rate by browser.
- Clipboard fallback usage.
- Time from mobile share to desktop open.
- Performance by incoming traffic source.

Do not optimize the design based only on CTA taps. The key metric is desktop game starts attributable to the mobile landing.
