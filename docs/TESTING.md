# Testing and QA guide

This package has four layers of verification, all driven by one scenario
registry, plus an automated screenshot pipeline that documents every variant
in every state on web and iOS.

## The scenario registry

[`gallery/scenarios/`](../gallery/scenarios) is the single source of truth
for demo/QA scenarios (36 scenarios across Dialog, Sheet, Drawer, Popover,
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

Two capability facts shape the web plays:

- **Capability pinning.** `.storybook/preview.ts` honors an
  `overlaid-caps` URL param (used by the screenshot pipeline) and a
  per-story `parameters.overlaidCaps` list (a set of capabilities forced
  on, everything else off) applied by a loader before each render, so a
  pinned story cannot leak into the next. Stories without either run under
  real detection.
- **Untrusted input.** Play-test events (`userEvent`, dispatched Events)
  are untrusted, and real browsers never run light dismiss or close
  watchers for untrusted input. Delegated (browser-channel) overlays
  therefore route synthetic gestures through the kernel (the trust gate),
  which is itself a pinned behavior; the *real* browser-initiated paths are
  exercised by driving the platform JS APIs (`hidePopover()`,
  `dialog.close()`, dispatching `cancel`) as fait-accompli events.

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
