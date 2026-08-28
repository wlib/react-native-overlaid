# Branch notes — `approach-d` (Explicit Web Escape Hatches)

Built on `approach-a` (59da00b — which implemented the report's §4
foundation and §5 Approach A; its own 12 recorded deviations all still
apply and are inherited unchanged). This branch implements the report's §8
Approach D in full, reusing §6.2–6.3's internal machinery minus automatic
resolution. **Nothing was cut.** Deliberate deviations from the report's
letter are recorded below, with reasons.

## Scope delivered

- **§8.2 public API** — typed, all-optional `web` namespaces, ignored on
  native, absence === today's behavior:
  - `PopoverWebOptions { dismissal?: 'managed' | 'browser'; positioning?: 'floating' | 'css-anchor' }`
  - `TooltipWebOptions { intent?: 'js' | 'interest'; positioning?: 'floating' | 'css-anchor' }`
  - `ModalWebOptions { dismissal?: 'managed' | 'closedby' }` on Dialog, Drawer, Sheet.
  - Types exported from the index; `publicApi` pins the namespaces per
    family and rejects cross-family combos (`@ts-expect-error` rows).
- **§8.3 / §6.2 mode resolution** — `src/components/webOptions.ts`:
  `useWebDismissChannel` = requested && capable && vetoless ? delegated :
  managed, with `warnOnce` naming every fallback reason (veto handler,
  `dismissable={false}`, missing capability), snapshotted per presentation
  like the dialog's modal/modeless mode; `resolveWebPositioning` gates
  css-anchor on capability and `boundaryRef`. Detection gates fallback
  only — it never selects a mode.
- **§6.2 core machinery** — `LayerEntry`/`StackEntrySnapshot` gain
  `channel?: 'managed' | 'platform'`; `planEscape`/`planBackButton` emit a
  non-firing `deferToPlatform` step and stop at an eligible platform entry;
  `planOutsidePress` skips platform entries but keeps walking to managed
  layers below; `planTransientDisplacement` skips them (the browser auto
  stack owns their displacement); `dispatchEscape`/`dispatchBackButton`
  report `unhandled` on a deferred plan so the root listener leaves the
  keydown unprevented (a prevented Escape would suppress the browser's own
  close request). New pinned core tests in `arbitration.test.ts` and
  `layerHost.test.ts`.
- **§6.3 delegated popover** — `popover="auto"` (still shown via
  `showPopover({source})`); `toggle(closed)` self-reports with a sniffed
  cause; the refusal re-show retires for delegated instances (kept for
  managed and hint).
- **§6.3 delegated modal** — `<dialog closedby>` `'any'`/`'closerequest'`
  by backdrop presence, snapshotted per presentation; the manual
  backdrop-press classifier, the `onCancel` interception, and the refusal
  re-show retire for the delegated instance only; `close` self-reports with
  a sniffed cause. Sheet drag/detents remain library-owned.
- **Cause sniffing** — `src/react/dismissInputRecord.ts`; the root
  listeners in `LayerHostContext` record the last `pointerdown`/Escape and
  the delegated chromes map a close within 150 ms onto it
  (`outside-press`/`backdrop-press`/`escape`, `escape` fallback).
- **Tooltip `intent: 'interest'`** — `interestfor` + canceled
  `interest`/`loseinterest` routed into the kernel; only when the
  render-prop trigger is a real `<button>`/`<a href>`/`<area>` and the
  `interestFor` capability holds (else `warnOnce` + JS engine); JS intent
  inputs stand down while active; warmth accounting unchanged (edge-based).
- **`positioning: 'css-anchor'`** (Appendix A) — per-instance `anchor-name`
  on the trigger plus the implicit `source` anchor; panel renders
  `data-overlaid-anchored="css"` / `data-overlaid-placement` and the
  variable inputs (`--overlaid-position-anchor/-area`,
  `--overlaid-anchor-offset`); the mechanism lives in a new
  `overlaid.positioning` stylesheet layer (`position-area` mapping,
  `position-try-fallbacks: flip-block, flip-inline, flip-block
flip-inline`, `position-try-order` per axis, `position-visibility:
anchors-visible`); Floating UI fallback when unsupported or `boundaryRef`
  is set.
- **Tests** — defaults matrix untouched (every pre-existing test passes
  byte-for-byte); parallel suites for the delegated paths:
  `AnchoredContainer.delegated.web` (auto attribute, kernel stand-down for
  outside press and Escape, mixed managed-veto/delegated stack, retired
  re-assert), `ModalContainer.delegated.web` (closedby mapping, inert
  classifier, unprevented cancel, sniffed causes, no re-show, nested-close
  filter), `Tooltip.interest.web`, `useAnchoredPosition.cssAnchor.web`,
  `webOptions.web` (resolution/warnings/snapshot), `dismissInputRecord`,
  new core platform-channel plans. Three new Storybook play tests run the
  options in real Chromium: delegated popover (real `popover="auto"`
  top-layer + kernel stand-down + fait-accompli close), css-anchor
  (real anchored geometry), closedby dialog.
- **Docs** — new `docs/WEB-OPTIONS.md` (per-option capability gate,
  fallback, behavioral deltas: cause fidelity, no exit transition on
  browser closes, mixed-stack ordering, no continuous shift, sub-pixel
  differences); `docs/STYLING.md` (positioning layer + new attributes/
  vars); `docs/PARITY.md` (four adoption rows, four scenario rows, stance
  updates in the support matrix); `docs/PLATFORM-DIVERGENCES.md`; README
  section + link. Three new gallery scenarios registered (delegated
  popover, css-anchor popover, closedby dialog) — they render tap-managed
  on native like any scenario.

## Deviations from the report (with reasons)

1. **`deferToPlatform` steps instead of silent planner skips.** §6.2 says
   planners "skip platform-channel entries"; a bare skip cannot tell the
   dispatcher _why_ the plan is empty, and `dispatchEscape` must then
   choose between `swallowed` (preventDefault — would suppress the
   browser's close request) and walking past the entry (would close a
   second layer for one gesture). The planners therefore emit an explicit
   non-firing, walk-stopping `deferToPlatform` step and the dispatchers
   report `unhandled`. Outside-press and displacement plans skip silently
   as the report says (no default-action interplay there).
2. **Positioning resolution lives in `components/webOptions.ts`, not in
   `useAnchoredPosition.web.ts`.** The react/ layer imports neither
   chrome/ (capabilities) nor components/ (warnOnce) anywhere else on the
   branch; the spec value arrives pre-gated through `AnchoredSpec.
positioning` and the hook trusts it. Same resolution semantics.
3. **Explicit `anchor-name` in addition to the implicit `source` anchor.**
   §6.3 relies on the implicit anchor alone, but engines shipped CSS
   Anchor Positioning (Chrome 125) before full `showPopover({source})`
   implicit-anchor wiring (137), and the portal fallback has no invoker
   relationship at all. The trigger ref additionally writes a
   per-instance `anchor-name`; the panel's `position-anchor` names it.
4. **Anchor offset as margins on both sides of the placement axis.**
   Appendix A puts the offset margin on the anchor-facing side only, but a
   `flip-block`/`flip-inline` fallback would then lose its gap (the margin
   faces away after the flip). Both sides of the gap axis get the offset;
   the outer margin only stands the panel off the viewport edge.
5. **Interest events are listened for on both the trigger and the target.**
   The explainer's event target wavered between invoker and invokee across
   iterations; listening on both (they are non-bubbling) is correct under
   either reading. Because `interestfor` requires its IDREF target to
   pre-exist while the library mounts panels on open, a hidden `<span>`
   placeholder carries the panel id while closed — the report's
   "always-rendered panel variant" (§2.2(5)) was not adopted because it
   would fork the cross-platform render tree; the placeholder achieves the
   reference without mounting the panel.
6. **Delegated closes keep the kernel's exit phase running invisibly.**
   The browser hides the surface at once, so the exit reveal cannot play;
   completing the lifecycle early (e.g. `onHostDismissed`) would race the
   `notifiedThisCycle` latch inside one commit, so the normal `exitMs`
   tail runs on a hidden surface instead. Documented as a behavioral
   delta in WEB-OPTIONS.md.
7. **Cause-sniffing window is 150 ms, not "same macrotask".** Popover
   `toggle` and dialog `close` are queued tasks, so a same-macrotask
   window can never match; 150 ms covers the queue without misattributing
   stale input. The window constant lives in `dismissInputRecord.ts`.
8. **Latent nested-dialog event bug fixed in managed mode too** (the
   approach-c implementer's warning): React re-dispatches non-delegated
   DOM events through fiber ancestors, so `ModalContainer.web`'s
   `onCancel`/`onClose` now filter `event.target === event.currentTarget`
   in both modes — a nested dialog's cancel/close previously reached the
   parent chrome's handlers (pinned by the nested-close test).
9. **Play tests drive the browser's close through the popover/dialog API,
   not through synthetic outside clicks.** Untrusted (synthetic) events
   can never trigger the UA's light dismiss or close watcher (verified
   against the Playwright Chromium directly), so the delegated plays
   assert the kernel's stand-down with synthetic input (the panel
   _survives_ what would close a managed instance) and then perform the
   platform close (`hidePopover()`/`close()`) to exercise the real
   fait-accompli reconciliation in Chromium.
10. **`data-overlaid-placement` renders only in css-anchor mode** (the
    stylesheet keys margins/try-order off it). The report's Approach-C
    harvest would add it for the floating engine too; out of D's scope.
11. **No delegated-tooltip dismissal.** §6.3's popover table row covers
    Tooltip only via `popover="hint"`, which approach-a already passes
    through; `TooltipWebOptions` deliberately has no `dismissal` member
    (the type test pins this), matching §8.2's API sketch.

## Verification

- `npx jest` — 36 suites / 274 tests green (approach-a baseline was 30
  suites / 228 tests, all inherited unchanged: +6 suites / +43 tests for
  the delegated/interest/css-anchor/resolution/sniffer paths and platform-
  channel core plans, +3 registry smoke rows for the new scenarios).
- `npm run lint`, `npm run typecheck`, `npm run build`,
  `npm run format:check` (one pre-existing warn on
  `docs/screenshots/README.md`, untouched) — clean.
- `npm run test-storybook` — 6 suites / 39 play tests green in real
  Chromium against a locally served static `storybook:build` (36 inherited
  - delegated-popover, css-anchor, closedby-dialog plays).
- Screenshot pipelines and iOS intentionally not run.
