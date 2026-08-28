# Branch notes — `approach-a` (Layered Chrome)

Implements the design report's §4 shared foundation (F1–F4) and §5 Approach A
in full. Nothing was cut. Every deliberate deviation from the report's letter
is recorded below, with reasons.

## Scope delivered

- **F1** `src/chrome/webCapabilities.ts` — lazy, memoized registry with
  `setWebCapabilityOverrides` as the only mutation point;
  `AnchoredContainer.web` migrated off the module-scope `SUPPORTS_POPOVER`
  const; both chrome web suites pin branches via overrides.
- **F2/F3** `styles.css` restructured into `@layer overlaid.reset, .defaults,
.motion`; the `data-overlaid-kind/-part/-state/-phase/-side/-dragging/
-unstyled` contract renders on every web host/surface; defaults drained
  from `defaultStyles.web.ts` into the defaults layer; reveal transitions
  drained from inline styles into the motion layer; sheet drag numbers become
  `--overlaid-sheet-translate/-height` inputs; documented in `docs/STYLING.md`.
- **§5.3.3** `src/chrome/useExitTransition.web.ts` — `transitionend`/
  `animationend` (target-filtered) completes an exit early; `exitMs` remains
  the unmount ceiling.
- **§5.3.4** `src/react/useHoverIntent.ts` + host-scoped warmth registry;
  `Tooltip` gains `timing?: { delay?: number | false; warmth?: number | false }`
  (defaults 400/700; grace stays 150). Focus/touch remain instant.
- **§5.3.5** `showPopover({ source: trigger })` passed unconditionally,
  including on the toggle-refusal re-assert path.
- **F4/§5.6** new suites: `webCapabilities.web.test.tsx`,
  `useExitTransition.web.test.tsx`, `useHoverIntent.web.test.tsx` (fake
  timers: cold delay, warm instant, warmth expiry, warmth:false, sibling-open
  instant, host isolation, grace close, focus/blur instant, cancel, unmount
  accounting); a two-tooltip `DelayedThenInstant` play test (real timers,
  generous windows); `overlaid-caps` query-param hook in
  `.storybook/preview.ts`; fallback pass (`overlaid-caps=none`, curated
  subset, `--caps-none` suffix) in `scripts/screenshots-web.mjs` —
  implemented but **not executed** per instructions, so no caps-none PNGs
  exist under `docs/screenshots/` yet.
- Docs: `docs/STYLING.md` (new, README-linked), `docs/PARITY.md` (support
  matrix + capability-adoption table + new evidence rows),
  `docs/PLATFORM-DIVERGENCES.md` (timing is web-only), README (timing prop,
  stylesheet now load-bearing, troubleshooting entries).

## Deviations from the report (with reasons)

1. **Text part styles stay in JS** (`tooltipText`, `dialogTitle`,
   `dialogDescription` in `defaultStyles.web.ts`). §5.3.2 says the module
   "shrinks to an empty shim", but react-native-web's `Text` paints `color`
   and `font` directly on the element (verified in RNW 0.21's Text reset:
   `color: 'black', font: '14px System'`), so surface-level CSS cannot
   cascade into RNW text. Only the four _surface_ styles drained to CSS.
   Consequence: the F2 token list ships without `--overlaid-tooltip-fg`
   (tokens kept: `--overlaid-surface-bg/-radius/-shadow`,
   `--overlaid-tooltip-bg`); tooltip text color remains the `textStyle` prop.
2. **Drawer background under `unstyled`.** The old chrome hard-coded
   `backgroundColor:'#ffffff'` on the web drawer panel _outside_ the
   defaults, so an unstyled drawer was still opaque. To avoid a visible
   behavior change, the drawer surface background lives in the defaults
   layer **unguarded** by `:not([data-overlaid-unstyled])` (padding/shadow
   are guarded). Consumer CSS still beats it (it is layered).
3. **`useHoverIntent` signature** is
   `(host, isOpen, config, callbacks)` — the report's sketch omitted an
   `isOpen` argument while also requiring "the hook observes isOpen
   falling"; the explicit parameter is that observation. The warmth registry
   lives inside `useHoverIntent.ts` keyed by LayerHost identity;
   `LayerHostContext.tsx` needed no change (the report's "warmth registry
   accessor only" is satisfied by the existing `useOptionalLayerHost`).
4. **Escape-cancels-pending wiring.** The report's "onDismissRequest-adjacent
   path" is unspecified, and a pending (not yet mounted) tooltip is not in
   the layer stack, so kernel Escape routing cannot reach it. `Tooltip`
   installs a web-only capture `keydown` listener that calls
   `intent.cancel()` on Escape — cancel clears only the pending open timer,
   so it cannot interfere with kernel dismissal of visible overlays.
5. **popoverApi jsdom suite keeps its prototype mocks.** F4 says the suites
   "switch from prototype-patching to overrides"; branch _selection_ did
   switch to `setWebCapabilityOverrides`, but jsdom has no popover
   implementation at all, so the mock `showPopover`/`hidePopover`/`toggle`
   behavior on the prototype remains — it provides the platform being
   reconciled against, not the capability signal.
6. **`useExitTransition` has an unsuffixed native pair** (`useExitTransition.ts`,
   a documented no-op). The report names only the `.web.ts` file; the pair
   follows the repo's platform-module convention and keeps `tsc` (which has
   no `.web` suffix resolution here) checking web importers against a real
   module. Native never bundles it.
7. **`--overlaid-backdrop-duration` still written** alongside the new
   generalized `--overlaid-duration` (F2 says the latter "generalizes" the
   former); the backdrop CSS reads the legacy name first so pre-contract
   consumer overrides keep working.
8. **Registry is not public API.** `webCapabilities` is imported by chrome
   and by `.storybook/preview.ts` from source, but not exported from
   `src/index.ts` — the report does not ask for a public export and the
   `publicApi` snapshot stays untouched.
9. **`showPopover` options cast.** TS 5.9's lib.dom still types
   `showPopover()` as zero-arg; the options bag is passed through a local
   typed cast in `AnchoredContainer.web.tsx`.
10. **No CHANGELOG file exists in the repo**, so the report's "call the
    tooltip delay out prominently in the changelog" landed as the README
    troubleshooting entry and the Tooltip prop docs instead.
11. **Sheet story/jsdom assertions migrated** from `panel.style.height` to
    `--overlaid-sheet-height`, and two Popover story assertions from
    `style.opacity` to `data-overlaid-state` — exactly the §5.6-sanctioned
    churn (grep found no other inline-reveal assertions; the report's
    "~10 call sites" estimate covered sites that turned out to assert
    geometry, which stayed inline by design).
12. **Panel part naming.** The popover/tooltip panel is a single element
    serving as both its own top-layer host and the visual surface; it
    carries `data-overlaid-part="surface"` (documented in STYLING.md), so
    the motion selectors in the report's §5.3.1 sketch gained the `-part`
    qualifier for consistency with the defaults layer.

## Verification

- `npx jest` — 30 suites / 228 tests green (baseline was 209 tests: +18 new
  unit/contract tests, +1 registry smoke row for the new tooltip scenario).
- `npm run lint`, `npm run typecheck`, `npm run build` — clean.
- `npm run test-storybook` — 6 suites / 36 play tests green in real Chromium
  (static `storybook:build` served locally), including the new
  delayed-then-instant tooltip play.
- Manual Chromium spot-checks against the same build: `overlaid-caps=none`
  renders the portal fallback (no `popover` attribute, `z-index` 9999,
  parented under `#rno-overlay-root`); default detection renders
  `popover="manual"` in the top layer with the 120 ms opacity reveal
  settling at 1; dialog/drawer/sheet/tooltip surfaces all carry their CSS
  defaults (bg/radius/padding/shadow) and reveal state; the sheet's computed
  `height` tracks `--overlaid-sheet-height`; the tooltip first-hover delay
  is observable (~400 ms before mount).
- Screenshot pipelines intentionally not run.
