# Changelog

## 0.2.0

The web layer now leans into the platform: default visuals, reveal motion,
and timing live in a documented CSS contract that consumer stylesheets can
override without specificity wars, and the browser's own mechanisms (top-layer
popovers with implicit anchors, CSS Anchor Positioning, discrete-transition
exits) are adopted behind per-feature capability detection with the lifecycle
kernel remaining the single source of truth. Native behavior is unchanged.

### Changed

- **Tooltips wait ~400 ms on first hover** and open instantly while any
  tooltip in the same `OverlayHost` is open or was open within the last
  ~700 ms (the delayed-then-instant model). Keyboard focus and touch stay
  instant. `timing={{ delay: false }}` restores the old open-immediately
  feel; `--overlaid-tooltip-delay` / `--overlaid-tooltip-warmth` theme the
  timing in CSS.
- **Web `exitMs` is now the floor of a safety ceiling, not the exact unmount
  time.** Exit transitions are accounted for: a consumer stylesheet may
  lengthen (or shorten) an overlay's exit and the unmount follows the real
  transition, bounded by `max(exitMs, computed CSS duration) + 100ms`.
  `onOpenChange(false)` still fires at dismissal start. Native `exitMs`
  semantics are unchanged.
- **Default visuals and reveal transitions moved from inline styles into
  `styles.css`** (cascade layers `overlaid.reset` / `overlaid.defaults` /
  `overlaid.motion`). Any unlayered consumer rule now beats the library's
  defaults. Consumer tests that asserted inline reveal styles (opacity,
  transforms) should assert the `data-overlaid-state` / `data-overlaid-phase`
  attributes and `--overlaid-*` custom properties instead — see
  `docs/STYLING.md` for the contract.
- **`styles.css` is now load-bearing on web**: it carries the default surface
  visuals, not just resets. The install step ("import once") is unchanged but
  forgetting it now shows unstyled surfaces.

### Added

- `Tooltip` `timing` prop (`{ delay?: number | false; warmth?: number | false }`).
- `OverlayHost` `styling` prop (web): `'none'` opts an app out of the
  defaults and motion layers while keeping resets.
- A documented styling contract (`docs/STYLING.md`): `data-overlaid-kind` /
  `-part` / `-state` / `-phase` / `-side` / `-dragging` / `-unstyled` /
  `-placement` attributes and the `--overlaid-*` custom-property vocabulary
  on every web surface.
- CSS Anchor Positioning as the placement engine for anchored overlays with
  `closeOnScroll={false}`, no `boundaryRef`, and a supporting browser
  (Baseline Jan 2026); Floating UI everywhere else.
- `showPopover({ source })` on supporting engines: implicit anchor, logical
  focus order, and invoker a11y metadata come from the browser.
- Close-first exits on engines with `transition-behavior: allow-discrete`
  and the CSS `overlay` property (Chromium today): dying popovers stop
  intercepting pointer events during their exit animation.

### Fixed

- Nested dialog `close`/`cancel` events re-dispatched by React through fiber
  ancestors no longer read as a browser-forced close of the ancestor overlay
  (one Escape on a dialog above a drawer was closing both in Chromium).
- Reopening an overlay while its exit is still running now re-asserts the
  platform surface after an accepted browser-initiated close, and a forced
  close landing before presentation completes no longer strands the overlay
  invisible-but-open.

## 0.1.0

Initial release: Dialog, Drawer, Sheet, Popover, and Tooltip over a shared
lifecycle kernel with layer-host arbitration; `<dialog>`/Popover API chrome
on web, RN Modal + TrueSheet on native.
