# Platform divergences

`react-native-overlaid` shares lifecycle and dismissal policy across platforms,
not rendering machinery. Web and native deliberately use different hosts,
geometry, animation, and input channels.

For the concrete trees, see [RENDER-TREES.md](./RENDER-TREES.md).

## Top layer and native windows

On web, surfaces with a backdrop call `showModal()` on a `<dialog>` and
anchored surfaces use the HTML Popover API when available. Those APIs promote
elements into the browser top layer, above ordinary stacking contexts. No
application `z-index` can provide the same guarantee. A backdrop-free Dialog
or Drawer instead calls modeless `dialog.show()` so the document stays
interactive; it remains in ordinary document paint order. A Sheet stays modal
even with `scrim={false}` because the scrim flag controls dimming, not sheet
modality. Modal versus modeless host selection is snapshotted for a
presentation; close and reopen after changing `backdrop` across `false`.

React Native has no document top layer. An RN `Modal` and a TrueSheet each
create a platform-owned window above the app window. Consequently every native
window receives its own layer host and portal host. A popover opened inside a
dialog or sheet portals into that window rather than underneath it.

## Layout values and styling

Yoga and CSS accept different units. Public `layout` values therefore use the
portable subset: finite numbers (device-independent pixels on native, CSS
pixels on web) or percentage strings such as `'85%'`. Do not pass `rem`, `vh`,
`calc()`, or arbitrary CSS strings through `layout`.

Slot styles accept React Native style values and web CSS properties. Registered
styles and arrays are flattened for DOM surfaces. Native-only properties such
as `elevation` and `shadowColor` have no web meaning; put platform-specific
effects in platform-specific files. A slot's `className` is web-only.

Import `react-native-overlaid/styles.css` once on web. It resets `<dialog>` and
Popover API chrome, animates backdrops, applies browser safe-area environment
variables, and honors `prefers-reduced-motion`.

## Anchored geometry

Web delegates Popover and Tooltip placement to one of two engines. Floating
UI is the default: it continuously updates `--overlaid-x`/`--overlaid-y`
custom properties (realized by a motion-layer `translate3d`) while the
reference or floating element changes. When the browser supports CSS Anchor
Positioning AND the instance has no `boundaryRef` AND `closeOnScroll` is
`false`, the browser itself becomes the engine: the trigger carries an
inline `anchor-name`, the panel is placed via `position-area` with
`position-try-fallbacks`, and no JS runs per scroll frame. The engine is
chosen once per mount; `data-overlaid-placement` reflects the resolved
placement under Floating UI but the _requested_ one under CSS anchoring
(whose fallbacks flip without telling JS). Known engine divergences: CSS
anchoring has no continuous shift (panels near viewport corners can
overhang where Floating UI would slide) and its `-start`/`-end` spans map
physically (LTR), see `docs/STYLING.md`.

Native measurement is asynchronous. The package uses `measure()`'s
`pageX/pageY`, which agrees with responder event coordinates on Android
edge-to-edge. A portaled panel subtracts the nearest portal host's measured
page origin; this matters inside an OS sheet, whose content origin is not the
window origin. Stale measurements are ignored after close or a newer request.

Tooltip's explicit `boundaryRef` replaces the window boundary. Numeric
`insets` shrink the implicit native window or web viewport boundary; an
explicit boundary wins over those window insets.

## Dismissal channels

Web installs one capture-phase `pointerdown` listener and one Escape listener
at the root host. `<dialog onCancel>` only prevents the browser's duplicate
close. Chrome can still force-close a dialog under its close-request rules, so
the `close` event reconciles browser state with the kernel and reopens a
refused dialog. The Popover API's `toggle` event is reconciled similarly.

Native has no global outside-press channel. An anchored surface renders a
window-sized invisible underlay. If that underlay covers another registered
overlay trigger, the package dismisses the current transient and replays the
new trigger so switching popovers takes one tap.

Android back starts at the deepest attached native host. An RN `Modal` routes
`onRequestClose` through overlays in its own window before delegating to its
owning dialog or drawer. While a native sheet contains nested layers, TrueSheet
is made temporarily non-dismissible so its back callback can perform the same
deepest-first routing. Tooltips intentionally answer Escape on web but do not
consume Android back.

## Animation and lifecycle

CSS owns web transitions, React Native `Animated` owns native dialog/drawer/
anchored transitions, and the operating system owns TrueSheet animation.

`exitMs` means different things per platform — a deliberate divergence. On
native it is the exit animation's duration and the unmount ceiling. On web,
transition accounting is the primary exit truth: the chrome counts the
surface's own `transitionrun`/`transitionend`/`transitioncancel` pairs
during `dismissing` and unmounts when they drain (immediately, two frames
in, when no transition ever starts). `exitMs` demotes to the _floor of the
safety net_: the fallback timer fires at `max(exitMs, computed exit
duration) + 100ms`, so consumer CSS can lengthen an exit
(`--overlaid-duration-exit`) as well as shorten it. Chrome that knows its
real completion, notably TrueSheet, still reports it directly.

Where the browser supports discrete transitions and the CSS `overlay`
property (Chromium), anchored-overlay exits are additionally close-first:
`hidePopover()` runs at dismissal start and the stylesheet's
`allow-discrete`/`overlay` transition keeps the panel painted in the top
layer through the exit — so a dying popover stops intercepting pointer
events. Dialog/drawer/sheet hosts never close first: their exit reveal
animates on the surface child, and Chromium completes a discrete-only
`overlay`/`display` transition instantly, so the `<dialog>` host stays
platform-open through `dismissing` on every engine.

Reopening during exit reuses the mounted platform surface and carries already
satisfied presentation gates. Consumers should render from their `open` state;
they should not delay `onOpenChange(false)` to match an animation.

## Sheets

Native Sheet is a real TrueSheet (`UISheetPresentationController`/Material
bottom sheet). The OS owns presentation, detents, dimming, gestures, and much
of its visual chrome. Web uses a bottom-pinned `<dialog>` panel with pointer
drag, snap, rubber-band, and nested-scroll arbitration.

On web, touch and pen drag initiation is limited to the handle so scrolling
content does not accidentally move the sheet. Mouse drag may start on the
panel body when nested-scroll arbitration does not claim the gesture.

The shared detent contract sorts by height, deduplicates equivalent values,
caps the result at three, and remaps `initialDetent` from the caller's input
order. A lone `'content'` becomes TrueSheet's intrinsic `auto` detent; in a
mixed list it maps to the package's medium-height representation. Both current
implementations snapshot `detents` and `initialDetent` when opening. To change
them portably, close the sheet and reopen it.

`scrim={false}` disables dimming on both platforms. `scrim.color`,
`scrim.opacity`, and `scrim.className` style only the web backdrop; native
dimming remains OS-owned. Native `surface` styling affects sheet content, not
the system sheet's outer material or corners.

TrueSheet does not provide a pre-dismiss callback with which JavaScript can
approve a native swipe/backdrop close. If `onDismissRequest` is present, the
native chrome sets the sheet non-dismissible so an OS event cannot bypass the
veto. Android back still routes through the layer host and interceptor. This
means a handler that would allow `swipe-down` on web cannot opt a native sheet
back into OS swipe dismissal; confirm and close programmatically instead.

Use `Sheet.ScrollView` for scrolling sheet bodies. It provides finite sizing
for an intrinsic native detent, enables Android nested scroll, and adds the
sheet's bottom inset.

## Accessibility and focus

Web modal surfaces rely on `<dialog>` for modality, focus trapping, and focus
restoration. They close while still connected so the browser can restore focus.
Anchored surfaces restore focus to their trigger if focus remained in the
panel. A backdrop-free web Dialog/Drawer is intentionally modeless: it neither
traps focus nor makes the page inert. The same prop on native still uses an RN
`Modal` window and cannot promise page touch-through.

Native dialog/drawer surfaces carry dialog semantics and
`accessibilityViewIsModal`; the role-bearing surface owns the accessible name.
A web Tooltip describes its trigger while open. Native exposes tooltip text as
the trigger's `accessibilityHint`, because a transient portal view is not a
reliable source of screen-reader context.

Web Tooltip opens for mouse hover and keyboard focus and toggles for touch or
pen. Native Tooltip is tap-to-toggle. The `timing` prop (hover-intent
`delay`/`warmth`) is therefore web-only, like `closeOnScroll` nuances:
native has no hover channel for the timers to govern, and focus/tap opens
stay instant on both platforms. On web, an unset `timing` member also
consults the `--overlaid-tooltip-delay`/`--overlaid-tooltip-warmth` CSS
tokens on the trigger (read at first hover, cached per element) before the
built-in defaults; native reads no stylesheet, so CSS-themed timing is
web-only too.

## Safe areas

Native overlays live in windows that an app-window `SafeAreaView` cannot pad.
Read numeric insets at the app root (for example with
`react-native-safe-area-context`) and pass `insets={{ top, bottom }}` to each
overlay. The package intentionally does not depend on a safe-area library.

- Dialog keeps a tall native panel inside the top and bottom safe zones.
- Drawer adds the insets to its content padding.
- `Sheet.ScrollView` applies the bottom inset; the OS owns the sheet's top.
- Native Popover and Tooltip shrink their implicit placement boundary.
- Web modal CSS, Drawer, and Sheet use `env(safe-area-inset-*)`. Dialog,
  Drawer, Sheet, and anchored placement also honor the supplied numeric edges.

## Web capability fallback

Without the HTML Popover API, anchored web surfaces portal into
`#rno-overlay-root`. React context is preserved, but this ordinary DOM node
cannot paint above an open modal `<dialog>` backdrop. Browsers lacking Popover
API support therefore cannot guarantee a Popover or Tooltip above a web modal.
