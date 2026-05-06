# Logo and Haptics Investigation Notes

## Haptics browser support

Can I Use shows the Web Vibration API as limited availability. The visible support table indicates Android Chrome and Samsung Internet support it, while Safari on iOS is marked unsupported across current versions.

MDN states that `navigator.vibrate()` pulses device vibration hardware only if such hardware and browser support exist. It has no effect where unsupported, requires user interaction/sticky activation, may return false for invalid patterns, and device settings such as Silent Mode or Do Not Disturb can prevent vibration.

## App implementation observations

The app already has `client/src/lib/haptics.ts`, which checks `navigator.vibrate` before calling it and returns false if unavailable. `Home.tsx` wraps this with `pulse()` and `hapticFallback()`, so Android browsers that support the API should vibrate on direct taps. iPhone Safari is the likely reason haptics do not physically vibrate, because web vibration is not supported there.

## Logo observations so far

The brand logo currently uses `/manus-storage/six-plus-one-reference-palette-logo-transparent_9ff37cae.png` directly in `Home.tsx` and `Register.tsx`. The server includes a proxy route for both `/api/storage-image/*` and `/manus-storage/*`, so the path should work if the deployed storage asset exists and the route is reachable. The next check should verify the deployed HTTP status for this exact asset path and compare it with the proxy path.

## Logo HTTP checks

The deployed homepage responds with HTTP 200. The current direct logo path `/manus-storage/six-plus-one-reference-palette-logo-transparent_9ff37cae.png` responds with HTTP 307 and redirects to a signed CloudFront URL. The proxy path `/api/storage-image/six-plus-one-reference-palette-logo-transparent_9ff37cae.png` responds with HTTP 200, `content-type: image/png`, and `content-length: 4560477`.

Local asset inspection shows the currently referenced transparent PNG is 4,560,477 bytes at 2752×1536. A local optimized WebP version exists at 76,634 bytes and 1400×781, but the deployed storage proxy returns HTTP 502 for `/api/storage-image/six-plus-one-reference-palette-logo-transparent-optimized.webp`, which means that optimized file is not currently uploaded to storage under that key.

## Current likely logo cause

The most likely mobile issue is not a React rendering problem; it is the chosen asset delivery path. The app is loading a very large 4.56 MB transparent PNG through a `/manus-storage` URL that first redirects to a signed CloudFront URL. On mobile, especially on slower connections or stricter browsers, that can appear as a broken image or fail intermittently. The safer fix is to upload the existing optimized WebP asset to webdev storage, reference that returned `/manus-storage/...webp` URL or the same-origin `/api/storage-image/...webp` proxy, and keep a small text/SVG fallback if the image fails.
