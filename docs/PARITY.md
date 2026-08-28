# Reference parity matrix

The prototype's scenario registry is the minimum behavioral inventory. A row
is complete only when the behavior is represented by an automated test or an
explicitly named manual/platform check. Visual geometry that jsdom and the RN
test renderer cannot validate honestly stays identified as manual evidence.

Evidence names below are relative to `src/`: `families` and `families.web` are
the native and browser family integrations in `components/__tests__/`;
`sheet-native` is `components/__tests__/Sheet.test.tsx`; and `popover-api` is
`chrome/__tests__/AnchoredContainer.popoverApi.web.test.tsx`.

| Family   | Scenario            | Required contract                                               | Evidence                                                                                               | Status   |
| -------- | ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| Dialog   | Basic               | modal host, Escape/backdrop dismissal, title/description naming | `families`, `families.web`, `chrome/__tests__/ModalContainer.web.test.tsx`                             | complete |
| Dialog   | Non-dismissable     | refuses user dismissal, explicit close remains                  | `families` veto/programmatic precedence; `core/__tests__/behaviorPolicy.test.ts`                       | complete |
| Dialog   | Scrollable          | max-height bounds and internal scrolling                        | `families.web` max-height surface assertion; `examples/basic-overlays.tsx` manual overflow check       | complete |
| Dialog   | Styled              | surface and backdrop slot overrides                             | `families.web` custom surface/backdrop/class assertions                                                | complete |
| Dialog   | Compound            | Root/Content/Title/Description/Close share preset behavior      | `families`; `examples/compound-dialog.tsx`                                                             | complete |
| Sheet    | Content-sized       | intrinsic native auto and measured web content detent           | `sheet-native` intrinsic `auto`; `families.web` measured surface                                       | complete |
| Sheet    | Three detents       | sort/dedupe/remap plus drag snap ladder                         | `sheet-native`; `core/__tests__/detents.test.ts`; `core/__tests__/sheetGestures.test.ts`               | complete |
| Sheet    | Scrolling           | inner scrolling arbitrates against sheet drag                   | `sheet-native` nested scroll; `core/__tests__/sheetGestures.test.ts`; web manual drag check            | complete |
| Sheet    | Non-dismissable     | swipe/Escape/backdrop refusal without freezing detent resize    | `sheet-native` dismissible/veto/back routing and detent presentation                                   | complete |
| Sheet    | No scrim            | disables dimming consistently                                   | `sheet-native` `dimmed=false`; `families.web` transparent scrim remains modal                          | complete |
| Sheet    | Styled/narrow       | web surface/layout styling; native OS chrome remains owned      | `families.web` width/surface structure; `docs/PLATFORM-DIVERGENCES.md`                                 | complete |
| Drawer   | Right               | right-edge slide and modal dismissal                            | `families`/`families.web` shared modal policy; `examples/basic-overlays.tsx` manual right-edge check   | complete |
| Drawer   | Left                | left-edge slide and modal dismissal                             | `families` and `families.web` left-edge assertions                                                     | complete |
| Drawer   | Fixed width         | fixed width and scrolling content with pinned close             | `families.web` 320px width; `families` explicit close                                                  | complete |
| Drawer   | Non-dismissable     | refusal with explicit programmatic close                        | `core/__tests__/behaviorPolicy.test.ts`; `families` close action                                       | complete |
| Drawer   | No backdrop         | web inspector keeps page interactive; native removes underlay   | `families` no underlay; `families.web` modeless dialog mode; documented RN Modal limitation            | complete |
| Drawer   | Styled              | surface/backdrop overrides and additive insets                  | `families` style plus exact additive inset assertions                                                  | complete |
| Popover  | Basic               | controlled/uncontrolled trigger toggle and render-prop close    | `families`; `react/__tests__/useControllableState.test.tsx`                                            | complete |
| Popover  | Displacement        | opening auto force-closes unrelated eligible transients         | `families`; `core/__tests__/arbitration.test.ts`                                                       | complete |
| Popover  | Outside press       | capture/underlay dismissal                                      | `families` native underlay; `core/__tests__/layerHost.test.ts` structural containment                  | complete |
| Popover  | Placements          | flip/shift and configurable offset                              | `react/__tests__/anchoredPosition.test.ts`; `examples/basic-overlays.tsx` manual edge flip/shift check | complete |
| Popover  | Non-dismissable     | refuses outside/Escape but accepts explicit close               | `families` forced/veto matrix; `core/__tests__/behaviorPolicy.test.ts`                                 | complete |
| Popover  | Close on scroll     | page/anchor movement dismisses                                  | `react/__tests__/useAnchorScrollDismiss.test.tsx` and `.web.test.tsx`; `families.web`                  | complete |
| Popover  | Scroll inside       | panel scrolling is exempt                                       | `families.web`; `react/__tests__/useAnchorScrollDismiss.web.test.tsx`                                  | complete |
| Popover  | Force vs veto       | force bypasses dismissable; veto outranks force                 | `families`; `react/__tests__/useOverlayLifecycle.test.tsx`                                             | complete |
| Tooltip  | Hover/focus/tap     | web hover/focus, touch/native tap behavior                      | `families` and `families.web`                                                                          | complete |
| Tooltip  | Escape              | WCAG keyboard dismissal; Android back remains unconsumed        | `families.web`; `core/__tests__/behaviorPolicy.test.ts`                                                | complete |
| Tooltip  | Hint vs auto        | opening hint never displaces deliberate popover                 | `families` and `families.web`                                                                          | complete |
| Tooltip  | Boundary            | explicit boundary controls flip/shift                           | typed consumer in `components/__tests__/publicApi.test.tsx`; manual boundary check                     | complete |
| Tooltip  | Render prop         | consumer element receives typed trigger props                   | `families`, `families.web`, `components/__tests__/publicApi.test.tsx`                                  | complete |
| Stacking | Popover in dialog   | nested transient unwinds before modal; ancestor spared          | `families` and `families.web` consecutive back/Escape                                                  | complete |
| Stacking | Dialog above drawer | modal layers unwind top-down                                    | `core/__tests__/layerHost.test.ts` stack ordering; manual composed modal check                         | complete |
| Stacking | Tooltip in sheet    | anchored content renders in sheet window/host                   | `sheet-native` local-host back route; `families` native portal/context bridge                          | complete |
| Stacking | Three deep          | tooltip -> popover -> dialog dismissal order                    | `core/__tests__/arbitration.test.ts`/`layerHost.test.ts`; manual three-deep check                      | complete |

## Cross-cutting checks

| Area            | Required contract                                                                       | Evidence                                                                                                     | Status   |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| Lifecycle       | all presentation gates, early close, timer completion, real completion, reopen mid-exit | `core/__tests__/lifecycle.test.ts`, `react/__tests__/useOverlayLifecycle.test.tsx`, `sheet-native`           | complete |
| Host shell      | refusal walks, blocker swallowing, child-host delegation, closeAll snapshots            | `core/__tests__/layerHost.test.ts`, `families`, `sheet-native`                                               | complete |
| Browser sync    | StrictMode show guards, forced dialog close resync, Popover toggle resync               | `popover-api`, `chrome/__tests__/ModalContainer.web.test.tsx`                                                | complete |
| Focus           | dialog and popover restore focus when removed                                           | web chrome tests for `ModalContainer` and `AnchoredContainer`                                                | complete |
| Accessibility   | role-bearing element named; native modal semantics/actions; tooltip hints               | `families`, `families.web`, web chrome tests                                                                 | complete |
| Coordinates     | page-space measurement, host-origin subtraction, safe-area clipping                     | `react/__tests__/measurement.test.tsx`, `anchoredPosition.test.ts`, native portal manual geometry check      | complete |
| Async safety    | stale measure/position results ignored after close/unmount                              | `react/__tests__/measurement.test.tsx`, lifecycle stale-completion tests                                     | complete |
| Packaging       | clean install, build outputs, declarations, CSS export, tarball contents                | `pack:check` builds/packs, installs isolated web/native consumers, inspects files/graphs, and compiles types | complete |
| Public API      | export/type snapshot and representative consumer compilation                            | `components/__tests__/publicApi.test.tsx`; `npm run typecheck`                                               | complete |
| Code boundaries | core has no React/DOM/RN imports; platform-specific code stays in chrome                | import-boundary review plus core Node project                                                                | complete |

## Intended improvements verified

| Improvement                                                                     | Evidence                                                                                 | Status   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Invalid portable layout and detent inputs produce development diagnostics       | `components/__tests__/diagnostics.test.tsx`                                              | complete |
| Reduced motion preserves lifecycle direction with zero-duration native reveal   | `chrome/__tests__/useRevealStyle.test.tsx`                                               | complete |
| Public render-prop and style types remain discoverable and finite               | `components/__tests__/publicApi.test.tsx`; declaration build and consumer smoke check    | complete |
| Runtime consumers resolve built code/declarations rather than source by default | `pack:check` walks isolated web/native built graphs and compiles the packed declarations | complete |

## Device/browser QA findings (2026-08-26 session)

Issues found by driving the real Storybook (Chromium) and the example app
(iOS simulator) that the jsdom/test-renderer suites could not see, all fixed
with regressions added:

| Finding                                                                           | Fix and evidence                                                                                                    | Status |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| Web dialog title/description rendered inline (RNW Text is `display:inline`)       | `DialogSurface.web` now carries RN View flex-column parity; visible in `docs/screenshots/web`                       | fixed  |
| Unmounting a presented native Sheet leaked the OS presentation and blocked modals | Layout-effect unmount dismissal in `SheetSurface`; `Sheet.test.tsx` unmount cases                                   | fixed  |
| On device, a tap on a tooltip trigger dismissed an open popover via the underlay  | Trigger registry carries `behavior`; `DismissUnderlay` resolves the hit before dismissing; `families` underlay test | fixed  |

A second pass — six parallel reviewers reading every capture in
`docs/screenshots/` against the scenario contracts, plus interactive
simulator testing — found and fixed another round, all with regressions
where the suites can express them:

| Finding                                                                              | Fix                                                                                                   | Status |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------ |
| iOS: scrim taps and swipes went dead while a tooltip/popover was open inside a Sheet | nested-layer non-dismissibility is now Android-only (back routing); iOS keeps the OS channels         | fixed  |
| Web: tooltip padding vanished (`paddingHorizontal/Vertical` dropped on DOM)          | `flattenToCss` expands RN-only shorthands; unit-tested                                                | fixed  |
| iOS: Dialog ignored `layout.maxHeight` — tall content ran off-screen, uncentered     | native surface clips to the wrapper bound and scrolls its content                                     | fixed  |
| iOS: Drawer had no scroll container (content unreachable) and clipped its shadow     | preset scrolls consumer content with the close pinned outside; `overflow:'hidden'` removed from panel | fixed  |
| Web: Drawer rendered `requested width + 2x padding`                                  | `box-sizing: border-box` on the panel                                                                 | fixed  |
| iOS: Tooltip anchored to a stretched full-width trigger wrapper                      | default trigger Pressable hugs content (`alignSelf:'flex-start'`)                                     | fixed  |
| iOS: sheet grabber drew over the first content row                                   | 16pt top clearance on the surface when `handle` is on                                                 | fixed  |
| iOS: styled sheet surface stopped above the bottom safe-area band (two-tone)         | a surface `backgroundColor` now routes to TrueSheet's own background                                  | fixed  |
| Both: default ✕ close target was ~14x20                                              | 32px centered target (+ existing hitSlop)                                                             | fixed  |
| Gallery: stacked drawer scenario missed `insets` — close button under the status bar | scenario passes gallery insets                                                                        | fixed  |

Documented as platform divergences rather than fought: TrueSheet sizes
fraction detents against the safe-area-adjusted height (sheets measure
`fraction + bottom inset` tall), native sheet dim strength and `scrim`
color/opacity remain OS-owned, and an iOS scrim tap with nested layers open
dismisses the sheet (taking the nested layers with it) rather than
unwinding one layer at a time — iOS has no cancellable backdrop-press
callback to route through the layer host.

Full manual/automated QA workflow, including the screenshot pipeline that
produced `docs/screenshots/`, is documented in [TESTING.md](./TESTING.md).
