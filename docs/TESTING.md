# Testing and QA guide

This package has four layers of verification, all driven by one scenario
registry, plus an automated screenshot pipeline that documents every variant
in every state on web and iOS.

## The scenario registry

[`gallery/scenarios/`](../gallery/scenarios) is the single source of truth
for demo/QA scenarios (34 scenarios across Dialog, Sheet, Drawer, Popover,
Tooltip, and Stacking). Each scenario is a pure React Native component, so
the same code drives:

- the **web Storybook stories** ([`stories/`](../stories)), which add `play`
  interaction tests on top;
- the **native gallery** ([`gallery/OverlayGallery.tsx`](../gallery/OverlayGallery.tsx)),
  rendered by the Expo app in [`example/`](../example) for on-device QA;
- the **native smoke suite**
  ([`src/components/__tests__/scenarios.test.tsx`](../src/components/__tests__/scenarios.test.tsx)),
  which renders every scenario under jest and presses its "Open …" trigger.

Registering a scenario in `gallery/scenarios/index.ts` enrolls it in all
three automatically.

## Automated suites

```sh
npm test               # jest: core (node) + native (react-native) + web (jsdom)
npm run typecheck      # includes gallery/, stories/, .storybook/
npm run lint
npm run storybook      # dev server on :6006
npm run test-storybook # every story's play function in real Chromium
                       # (requires the storybook dev server + `npx playwright install chromium`)
```

Most stories carry `play` functions asserting the arbitration behavior they
demonstrate (escape order, displacement, veto vs force, sheet drag physics,
scroll dismissal and its inside-the-panel exemption, nested unwind). Two
timing notes are documented inline in the stories:

- synthetic pointer sequences need real inter-event delays — handlers close
  over React state that commits between events (`Sheet.stories.tsx`);
- a dismissed modal's layer-host entry unregisters one passive-effect pass
  after its DOM unmounts, and an exiting modal still swallows Escape by
  design (`Stacking.stories.tsx`).

## The example app (iOS/Android)

```sh
cd example
npm install
npx expo prebuild
npx expo run:ios        # or run:android; TrueSheet needs this dev build, not Expo Go
npx expo start          # Metro for subsequent launches
```

The example pins **Expo SDK 54 / React Native 0.81**, which builds with
Xcode 16.x. (SDK 55 / RN 0.83 requires Xcode 26 — bump the example when the
host Xcode allows.)

The gallery supports two automation channels, used by the screenshot
pipeline and available for manual QA:

- **Deep links** — `overlaid-example://scenario/<key>[?autopress=1]` and
  `overlaid-example://home`. Note `xcrun simctl openurl` triggers iOS's
  one-time "Open in app?" prompt.
- **Metro route channel (dev builds only)** — the gallery polls
  `GET /overlaid-route` on the bundler origin; the Metro config serves
  `example/.overlaid-route.json`. Writing
  `{"nonce":"…","key":"sheet-three-detents","autopress":true}` to that file
  navigates the app with no taps and no permission prompts.

With `autopress`, helper Buttons titled "Open …"/"Toggle …" press
themselves after mount — nested triggers chain, so stacked scenarios
(drawer → dialog) open fully.

## Screenshot pipeline

```sh
npm run storybook                # terminal 1 (web captures need it)
npm run screenshots:web          # 81 shots -> docs/screenshots/web/
npm run screenshots:ios          # 56 shots -> docs/screenshots/ios/ (booted sim + example app + Metro)
npm run screenshots:index        # regenerates docs/screenshots/README.md
```

Each story/scenario is captured in its resting state plus named open/driven
states (detent positions, stacked layers, displacement outcomes). Captures
are full-viewport/device because overlay chrome lives in the browser top
layer and in native OS windows, which element screenshots cannot see.

Popover and Tooltip open through anchored trigger elements (the library's
own Trigger parts), which the auto-press hook deliberately does not reach.
Their native open states are captured interactively (e.g. driving the
simulator) and merged into `docs/screenshots/ios/manifest.json`; the
automated run keeps whatever manifest entries already exist.

## Video pipeline

Motion is documented separately from stills — the clips in
[`docs/videos`](videos/README.md) cover every story on web and every
auto-pressable scenario on iOS: entry reveals, kernel-routed Escape exits,
sheet detent drags, displacement, stack unwinding, and the tooltip's
delayed-then-instant hover intent (requires `ffmpeg` on PATH):

```sh
npm run storybook:build && npx http-server storybook-static -p 6006
npm run videos:web               # every story -> docs/videos/web/*.webm + .webp
npm run videos:ios               # every auto scenario -> docs/videos/ios/*.mp4 + .webp (booted sim + example app + Metro)
npm run videos:index             # regenerates docs/videos/README.md
```

Web clips are one continuous take per story — its named states (from the
shared `scripts/lib/webStates.mjs` table the screenshot pipeline also
drives) followed by Escape rounds; blocking/veto stories deliberately end
open, since the refusal is the demo. iOS clips are `simctl io recordVideo`
captures; dismissals ride the route payload's `dismissAfter`, which escapes
the layer stack through the kernel (see `AutoDismissDriver` in
`gallery/OverlayGallery.tsx`), so exits are the real animated paths and
stacked scenarios unwind one layer at a time. Simulator recordings are
variable-frame-rate — frames are only emitted on screen changes, so static
holds compress and clips end at the last visual change.

The animated WebP files exist because GitHub's markup sanitizer strips
every inline form of committed video (verified empirically: `<video>`
tags with relative, raw, media, and release-asset URLs are all removed;
only drag-and-drop `user-attachments` uploads may embed, and those have
no API). A committed animated WebP referenced as an image plays inline,
so the gallery leads with those and links each to its full-quality clip.

## Reviewing the captures

The gallery page is only as good as the eyes on it. The capture set is
sized for a fan-out review (one reviewer per family, web + iOS together,
against `gallery/scenarios/*.tsx` as the contract); that pass has caught
real bugs that jsdom, the RN test renderer, and single-shot spot checks all
missed — see the findings tables in [PARITY.md](./PARITY.md).

## Known platform caveats found during device QA

- Escape-unwind is a web/keyboard channel and Android `back` its native
  counterpart; iOS has no equivalent input, so unwind order on iOS is
  exercised via explicit Close controls.
- On phone-width layouts some multi-trigger scenarios (forced displacement)
  anchor their first panel over the remaining triggers; exercise those
  chains on web or tablet widths.
