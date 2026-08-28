# Branch notes — `approach-b` (Delegated Instruments)

Builds on `approach-a` (all of its notes still apply; its 12 recorded
deviations are inherited unchanged) and implements the design report's §6 —
automatic delegation of the dismissal/anchoring contract to the browser
wherever the platform can run it whole. One §6 peripheral was cut
(`interestfor` input, see Cuts); everything else shipped. Every deliberate
deviation from the report's letter is recorded below.

## Scope delivered

- **§6.2 mode resolution** — `src/react/dismissChannel.web.ts` (native pair
  is a constant `'managed'`): vetoless dismissable instances delegate per
  kind × capability (`popover` → popover cap; `tooltip` → popover + hint
  caps; dialog/drawer/sheet → `dialogClosedBy` cap); `onDismissRequest` or
  `dismissable={false}` forces managed (R2 by construction). The result is
  snapshotted once per mounted presentation in `useOverlayLifecycle`
  (mirroring the dialog's modal/modeless snapshot), registered on the
  `LayerEntry` as `channel: 'platform' | 'managed'`, and exposed to chrome
  as `OverlayContextValue.dismissChannel`.
- **Channel-aware arbitration** (`src/core`): key-dismiss plans emit a
  `delegated` stop step for platform entries — the executor fires nothing at
  or below them and the host returns `'unhandled'` (no `preventDefault`, no
  parent routing: the browser's default action IS the dismissal).
  Outside-press plans skip platform entries while still stepping managed
  layers in the same branch (the browser light-dismisses its own on the
  same pointerdown). New pinned tests in `arbitration.test.ts` and
  `layerHost.test.ts`; all pre-existing plans are byte-identical for
  managed-only stacks.
- **§6.3 popover** — delegated popovers render `popover="auto"`, shown via
  `showPopover({source})` (already in place from approach-a); the browser
  owns light dismiss, Escape, and auto-stack displacement among delegated
  popovers; `toggle(closed)` self-reports with a sniffed cause
  (`src/react/dismissInputRecord.ts`, 150 ms window — `toggle`/`close` are
  queued tasks, so a same-macrotask match can never succeed). Managed
  popovers stay `popover="manual"` under the kernel, unchanged.
- **§6.3 tooltip** — delegated tooltips ride the browser hint stack (the
  attribute was already `hint`; delegation removes the kernel's double fire
  for them). The JS hover-intent engine remains the input source
  (`interestfor` cut, below).
- **§6.3 dialog/drawer/sheet** — delegated hosts render `closedby`
  (mapping deviation 3 below); `cancel` is routed into the kernel as a
  cancelable proposal (close stays kernel-driven so the exit phase runs on
  every engine); a forced `close` is reported with a sniffed cause and no
  re-show when accepted. Sheet drag/detents stay library-owned. The manual
  backdrop classifier is retained deliberately (deviation 3).
- **§6.3 positioning** — CSS Anchor Positioning (Appendix A mapping in
  `src/react/cssAnchorPosition.ts`) is the engine when
  `anchorPositioning`+`positionTryFallbacks` caps are present, no
  `boundaryRef` is set, **and `closeOnScroll` is `false`** (decision 2
  below); `position-visibility: anchors-visible` where supported; Floating
  UI everywhere else, unchanged.
- **R3** — public API unchanged: no new props, no new exports; the
  `publicApi` snapshot is untouched. (Exported *types* gained additive
  members: `LayerEntry.channel`, `Step.delegated`,
  `StackEntrySnapshot.channel`, `DispatchOptions`,
  `OverlayContextValue.dismissChannel`, `AnchoredSpec.closeOnScroll`.)
- **§6.5 testing** — channel-aware planner/host core tests; jsdom
  reconciliation suites under capability overrides
  (`AnchoredContainer.delegated`, `ModalContainer.delegated`,
  `dismissChannel`, `useAnchoredPosition`/`cssAnchorPosition`); both mode
  mixes at the family level (`families.delegated.web.test.tsx` is the
  all-caps mix; the pre-existing `families.web.test.tsx` is the no-caps mix
  and passes untouched); new Storybook plays for mixed managed/delegated
  stacks, nested delegated popovers, dialog-with-popover across modes, a
  delegated close-request proposal, a browser-forced close in a nested
  stack, and the CSS anchor engine.

## The two §6.3 decisions (explicitly made and recorded)

1. **Displacement interop: displacement stays kernel-owned for both
   channels.** `planTransientDisplacement` deliberately ignores the channel
   and still force-fires platform entries. Rationale: displacement is a
   kernel *policy action* (type c), not a user-gesture classification — R1
   is about not double-classifying one gesture — and it must hold for
   programmatic opens, where the browser's auto stack never acts (a managed
   veto popover opening programmatically must still displace a delegated
   transient). When a pointer-initiated open doubles it with the browser's
   own same-press light dismiss, the dying-guard + notify latch absorb the
   second delivery — the report's sanctioned posture (§1.4/R1). The
   recommended per-host all-or-nothing constraint was **rejected**: it
   couples instances' channels to their neighbors' props, makes the mode
   flap as siblings mount, and is unnecessary once displacement is
   kernel-owned. This is also what makes the pinned displacement story
   deterministic (see below).
2. **Positioning: Floating UI whenever `closeOnScroll` is true** (the
   report's recommendation, adopted). With the default `closeOnScroll`,
   any page scroll dismisses the overlay, so frame-synced CSS tracking buys
   nothing and Floating UI keeps pixel parity with the fallback path. The
   CSS engine therefore runs only for `closeOnScroll={false}` instances
   with no `boundaryRef` on capable browsers. `closeOnScroll` rides along
   on `AnchoredSpec` for engine selection only.

## Deviations from the report (with reasons)

1. **Trust gate: delegation stands the kernel down for *trusted* gestures
   only.** The planners take a `trusted` flag (root listeners pass
   `event.isTrusted`); untrusted input routes platform entries through the
   kernel unchanged. Reason: real browsers never run light dismiss or close
   watchers for untrusted (synthetic) input — verified in real Chromium —
   so browser-owned-only dismissal would leave synthetic Escape/outside
   presses dead for every delegated overlay, breaking the existing pinned
   plays, jsdom suites, and every consumer test suite built on
   `userEvent`/`fireEvent`. R1 holds in both directions: for untrusted
   input the browser is provably inert; for trusted input the kernel stands
   down. This turns the prior implementers' flake warning into a
   determinism guarantee (below).
2. **Delegated key fallback (`DELEGATED_KEY_FALLBACK_MS = 200`).** When a
   key plan ends in a delegated stop, the layer host re-fires the planned
   event at that same entry 200 ms later. Verified empirically both ways:
   stock Playwright's CDP Escape *does* run the UA close-request machinery
   (bare `<dialog>`/popover probes close), but at least one real
   environment (CDP-style key injection in an embedded browser pane)
   delivers trusted Escape keydowns whose close watchers never run — pure
   browser-owned Escape is a dead key there. If the platform did act, the
   entry is dying (already-dismissing guard refuses) or unregistered by the
   time the fallback fires, so the double is absorbed by construction.
   Known micro-race, accepted: an accept-close-reopen of the *same* entry
   within the 200 ms window would eat the reopen; it requires a
   programmatic reopen inside 200 ms of a browser-accepted close.
3. **`closedby` mapping follows the host geometry, not the report's
   backdrop mapping.** The report says `'any'` (dismissable + backdrop) /
   `'closerequest'` (backdrop-less). But this library's top-layer host
   `<dialog>` spans the viewport — it IS the backdrop container — so no
   pointerdown can ever land outside the element and `'any'` light dismiss
   is dead by geometry. Top-layer hosts therefore get `'closerequest'` and
   **keep the chrome's own backdrop-press classifier for both channels**
   (single classification: the root listener already skips dialog targets,
   and the browser cannot double it). Modeless hosts are the mirror image —
   `pointer-events: none` means page presses genuinely land outside the
   element — so they get `'any'`, and the kernel's outside-press planner
   stands down for them.
4. **Delegated `cancel` routes into the kernel instead of retiring
   interception.** The report retires onCancel interception for delegated
   instances, but an unprevented cancel lets the browser run `close()`
   immediately, tearing the host out of the top layer before the exit phase
   — the mounted-through-exit architecture (report §2.2(8)) requires the
   close to stay kernel-driven. So delegated `cancel` is treated as the
   type-(a) proposal it is: `preventDefault()` + `requestDismiss('escape')`
   (cause is 'escape' directly — close requests are escape-shaped; no
   sniffing needed). The anti-abuse forced path (browser closes anyway)
   flows through the `close` handler as a reported fait accompli with no
   re-show. What *is* retired for delegated modals: the kernel's root
   keydown never fires them (planner stand-down).
5. **The popover re-assert-on-refusal is kept for delegated instances**
   (report: "the re-show path retires for them"). Refusal is indeed
   impossible while the channel snapshot holds, but a mid-presentation
   `onDismissRequest`/`dismissable` prop flip can create one (the snapshot
   deliberately does not re-wire live surfaces); without the re-assert that
   edge split-brains the surface. It is one shared branch, dead in the
   normal delegated path, and pinned by a test.
6. **Nested-event guard** (hard-won finding from the other branches,
   confirmed): React re-dispatches non-delegated DOM events (dialog
   `close`/`cancel`) through fiber ancestors, so nested overlay chrome
   receives a child's events. `onCancel`/`onClose` now filter
   `event.target === event.currentTarget` (the backdrop classifier already
   did). Pinned in jsdom and, decisively, by the
   `BrowserForcedCloseInNestedStack` play in real Chromium — `close()` on a
   still-mounted nested dialog must not close the drawer beneath it.
   Approach-a carried this latently; the delegated paths hit it for real.
7. **Reopen-mid-exit re-assert (real bug found by trusted-input QA).** The
   platform-sync effects keyed showing on `isMounted`, which never flips
   across a dismissing → presented reopen. Managed surfaces never noticed
   (the kernel hides platform surfaces only at unmount), but the *browser*
   hides a delegated surface at dismissal start, so reopening mid-exit left
   a presented overlay with a hidden popover / closed dialog. Both chromes
   now key the show branch on `isOpen` (a no-op for managed; verified
   regression tests fail against the old dependency).
8. **Delegated fait-accompli closes skip the exit animation.** A browser
   light dismiss/forced close hides the platform surface immediately; the
   kernel accepts the report and rides out its (invisible) exit budget
   rather than re-asserting the surface just to animate it. Semantics
   (`onOpenChange`, stack order, veto behavior) are identical; recorded in
   PLATFORM-DIVERGENCES. Kernel-driven closes — including all synthetic
   input under the trust gate — keep the exit transition everywhere.
9. **Explicit `anchor-name` instead of the implicit anchor from
   `showPopover({source})`** for the CSS positioning engine. The implicit
   anchor needs newer engines (Chrome 133/FF 147/Safari 26) and ties
   positioning to the popover code path; an inline `anchor-name` on the
   trigger plus `position-anchor` on the panel is Baseline-core and works
   for any future host. Known CSS-engine divergences (no continuous shift,
   containing-block overflow, numeric `insets` not honored) documented in
   PLATFORM-DIVERGENCES; `source` is still passed for a11y/focus metadata.
10. **Escape delegation closes exactly one layer per gesture.** A delegated
    stop step ends the plan; if a *managed* layer above it refuses (veto),
    the walk falls through to the delegate stop and the browser acts —
    mirroring "a dying entry refuses but the walk continues" across the two
    systems. Accepted micro-edge: while a delegated entry is dying
    (≤ its exit budget), a second trusted Escape reaches its delegate stop
    and is owned by a browser that has already acted; the key fallback
    (deviation 2) reclaims it if nothing happens.
11. **One mechanism-pinning test migrated** (sanctioned by the ground
    rules): `AnchoredContainer.popoverApi.web.test.tsx` asserted
    `popover="manual"` for a vetoless dismissable popover, which now
    auto-delegates to `"auto"`; the managed `'manual'` pin moved to the
    `dismissable={false}` instance in the same suite. Every
    semantics-pinning test passes untouched — including the full
    `families.web.test.tsx` (which doubles as the no-caps mode mix).
12. **`planBackButton` is trust-gated too**, purely for planner symmetry:
    web never dispatches back-button and native never produces platform
    channels, so the delegated branch is unreachable there today.

## The pinned displacement story, deterministic

`DisplacementVsNonDismissable` ("Displacement force-closes
dismissable=false; veto survives") mixes managed (sticky, veto) and
delegated (displacer) instances — the report's flagged likeliest flake. It
runs deterministic (6/6 consecutive green full-suite runs, real Chromium)
because the two flake sources are structurally gone:

- Every play interaction is synthetic → untrusted → the trust gate routes
  *all* of it through the kernel; the browser's light-dismiss/auto-stack
  never participates in the play at all, so there is no cross-system
  interleaving to race.
- Displacement is kernel-owned for both channels (decision 1), so even
  under real trusted input the story's outcomes don't depend on
  browser-vs-kernel ordering: the only browser-initiated channel is the
  displacer's own light dismiss, whose double delivery is absorbed by the
  dying-guard/notify latch.

## Cuts

- **`interestfor` input for tooltips** (sanctioned peripheral cut). Chrome
  142+ only, Safari formally opposed, Firefox absent; usable only for
  render-prop consumers supplying a real `<button>/<a>`; and the attribute
  requires the target panel to pre-exist in the DOM, which conflicts with
  the library's mount-on-open lifecycle (report §2.2(5) — an
  always-rendered panel variant is a real cross-platform lifecycle change).
  The JS hover-intent engine is the permanent primary path (§2.2(4));
  delegated tooltips still gain the browser hint stack. The capability
  entries (`interestFor`, `interestDelayCss`) remain in the registry for a
  future approach.

## Verification

- `npx jest` — 36 suites / 276 tests green (approach-a baseline was 228:
  +46 new channel/delegation/positioning tests, +2 registry smoke rows for
  the new scenarios).
- `npm run lint`, `npm run typecheck`, `npm run build` — clean.
- `npm run test-storybook` — 6 suites / 43 play tests green in real
  Chromium against a static `storybook:build` served locally
  (`npx http-server storybook-static -p 6006`), run six times consecutively
  with zero flakes (36 plays inherited + 7 new).
- Manual real-Chromium QA with *trusted* CDP input (the one thing plays
  cannot produce): delegated popover renders `popover="auto"` in the top
  layer; a trusted outside press closes it through the browser's light
  dismiss + `toggle` self-report while the kernel stands down; reopening
  works (found and fixed deviation 7 this way); trusted Escape closes it —
  in that environment via the key fallback (deviation 2), since its
  injected keys never reach the UA's close watchers. A stock-Playwright
  probe confirmed real CDP Escape *does* trigger close requests (popover
  light dismiss and dialog `cancel` both fire), so standard E2E suites get
  genuine browser-owned Escape.
- Screenshot pipelines intentionally not run (as on approach-a).
