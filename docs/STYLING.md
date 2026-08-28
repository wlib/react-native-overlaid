# Styling the web chrome

`react-native-overlaid/styles.css` is a required import on web and now
carries the library's **entire** web presentation: UA resets, the default
surface visuals, and every reveal/exit transition. All of it ships inside
CSS cascade layers, and the overlay chrome renders a stable machine-readable
attribute contract — so an ordinary stylesheet rule in your app restyles or
re-animates any overlay without `!important`, without specificity wars, and
without touching a prop.

```css
/* Your unlayered CSS always beats the library's layered defaults. */
.my-popover {
  background: #0b1021;
  color: #e2e8f0;
  border-radius: 4px;
}

[data-overlaid-kind='dialog'][data-overlaid-part='surface'] {
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
```

JS styling still works exactly as before: `style`/`surfaceStyle` props are
inline styles and beat everything, and `unstyled` removes the library
defaults for that instance. Native platforms are untouched by this file.

For a design system that owns _everything_, `<OverlayHost styling="none">`
stands the defaults **and motion** layers down app-wide: every chrome
element renders `data-overlaid-styling="none"` and the guarded selectors
stop matching (the reset layer always applies). Your CSS then owns all
visuals and every reveal — including the functional pieces the motion layer
normally carries: the popover/tooltip positioning transform
(`translate3d(var(--overlaid-x), var(--overlaid-y), 0)`), the drawer slide,
and the sheet's `transform`/`height` wiring from
`--overlaid-sheet-translate`/`--overlaid-sheet-height` (plus its
`[data-overlaid-dragging]` transition mute). Recreate those from the custom
properties, or keep `styling="default"` and override selectively —
per-instance `unstyled` is independent and untouched.

## Layer architecture

```css
@layer overlaid.reset, overlaid.defaults, overlaid.motion;
```

- **`overlaid.reset`** — `<dialog>` and popover UA-chrome resets. Always
  applies (even with `unstyled`).
- **`overlaid.defaults`** — the default surface visuals (backgrounds, radii,
  paddings, shadows), guarded by `:not([data-overlaid-unstyled])` where the
  family has an `unstyled` prop.
- **`overlaid.motion`** — the reveal/exit transitions, keyed on
  `data-overlaid-state`.

Cascade facts that make this work:

- **Unlayered author styles always beat layered styles**, regardless of
  specificity. Any plain rule in your app wins against library defaults.
- **Importance inverts layer order**: a layered `!important` beats an
  unlayered one. The library never uses `!important` inside a layer; its
  only `!important` is the unlayered `prefers-reduced-motion` guard, which
  is intentionally strongest.
- **Layer order is fixed at first declaration.** The `@layer` statement at
  the top of `styles.css` is canonical. If your app declares its own
  `@layer` order involving an `overlaid` layer name, import
  `react-native-overlaid/styles.css` first.

## The `data-*` contract

Every web surface and host renders these attributes (all previous
attributes — `data-overlaid-modal`, `data-overlaid-popover`,
`data-overlaid-drawer`, `data-overlaid-sheet`, `data-overlaid-phase`,
`data-overlaid-reveal` — remain for compatibility):

| Attribute                 | Values                                          | Where                                                                                                                         |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `data-overlaid-kind`      | `dialog` `drawer` `sheet` `popover` `tooltip`   | host + surface                                                                                                                |
| `data-overlaid-part`      | `host` `surface`                                | `<dialog>` hosts are `host`; panels are `surface` (the popover/tooltip panel is its own top-layer host and carries `surface`) |
| `data-overlaid-state`     | `open` `closed`                                 | `open` ⇔ lifecycle phase `presented` (Radix-compatible muscle memory)                                                         |
| `data-overlaid-phase`     | `mounting` `presented` `dismissing`             | full lifecycle fidelity                                                                                                       |
| `data-overlaid-side`      | `left` `right`                                  | drawer surface                                                                                                                |
| `data-overlaid-dragging`  | present while a sheet drag is active            | sheet surface                                                                                                                 |
| `data-overlaid-unstyled`  | present when the consumer passed `unstyled`     | surface                                                                                                                       |
| `data-overlaid-placement` | `top` `bottom-start` … (Floating UI placements) | popover/tooltip panel — resolved (post-flip) under Floating UI, the requested placement under CSS Anchor Positioning          |
| `data-overlaid-styling`   | `none` when `<OverlayHost styling="none">`      | host + surface (defaults+motion selectors stand down)                                                                         |

Entry transitions work because chromes mount with `data-overlaid-state="closed"`
and the kernel's presentation gates flip it to `"open"` in a later commit —
you can key your own entry/exit animation entirely off that attribute.

## Custom properties

**Instance inputs** — written inline by the chrome, read by the stylesheet.
Treat these as read-only values your CSS may _consume_:

| Property                                                    | Written by            | Meaning                                                                                                                                                                 |
| ----------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--overlaid-duration`                                       | every chrome          | the instance's `exitMs` (dialog 180 / drawer 200 / sheet 220 / popover 120 / tooltip 80)                                                                                |
| `--overlaid-backdrop-duration`                              | dialog host           | legacy alias of the above for the `::backdrop` transition                                                                                                               |
| `--overlaid-backdrop-color` / `--overlaid-backdrop-opacity` | dialog host           | from the `backdrop`/`scrim` slot                                                                                                                                        |
| `--overlaid-sheet-translate` / `--overlaid-sheet-height`    | sheet surface         | live drag/detent geometry, updated every frame                                                                                                                          |
| `--overlaid-x` / `--overlaid-y`                             | popover/tooltip panel | Floating UI coordinates, realized by the motion layer's `translate3d` (unset under the CSS anchor engine) — restate the `translate3d` when composing your own transform |

**Theme tokens** — defined (as fallbacks) by the stylesheet, overridable by
your CSS at `:root` or any ancestor:

| Token                       | Default(s)                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--overlaid-surface-bg`     | `#ffffff`                                                                                                           |
| `--overlaid-surface-radius` | dialog 16px / popover 12px / tooltip 8px / sheet 16px (top corners)                                                 |
| `--overlaid-surface-shadow` | per-kind soft shadow                                                                                                |
| `--overlaid-tooltip-bg`     | `#111827`                                                                                                           |
| `--overlaid-duration-enter` | falls back to `--overlaid-duration` (the instance's `exitMs`)                                                       |
| `--overlaid-duration-exit`  | falls back to `--overlaid-duration`; **read back by JS** — a longer exit token genuinely delays unmount (see below) |
| `--overlaid-tooltip-delay`  | CSS `<time>`; themes the hover-intent delay when the `timing` prop is unset (built-in 400ms)                        |
| `--overlaid-tooltip-warmth` | CSS `<time>`; themes the warm window when the `timing` prop is unset (built-in 700ms)                               |

```css
:root {
  --overlaid-surface-bg: #101418;
  --overlaid-surface-radius: 6px;
  --overlaid-duration-exit: 320ms;
  --overlaid-tooltip-delay: 250ms;
}
```

The timing tokens are not declared by the stylesheet — unset, the built-in
defaults apply. The tooltip tokens are read from the **trigger's** computed
style at first hover and cached per element (custom properties inherit, so
`:root` or any ancestor works); they must carry an explicit `s`/`ms` unit.
An explicit `timing` prop always beats the tokens. Where the browser has
`interest-delay` CSS and the render-prop trigger is a real
`<button>`/`<a href>`/`<area>`/SVG `<a>`, the resolved delay is also
forwarded onto the trigger as `interest-delay-start/-end` so any interest
invoker relationship a consumer wires up runs on the same source of truth.

Tooltip _text_ color/size stays a JS default (`textStyle` prop): the
react-native-web `Text` element paints its own `color`/`font`, so a token on
the surface cannot cascade into it.

## Timing and exit reconciliation

CSS is the source of truth for exit timing on web. During `dismissing` the
chrome counts the surface's own `transitionrun`/`transitionend`/
`transitioncancel` pairs and unmounts when they drain — or two frames in
when no transition ever starts. You can therefore **lengthen** an exit
(e.g. `--overlaid-duration-exit: 600ms`, or your own `transition` on the
surface) and unmount waits for it, and shortening still unmounts early.
`exitMs` is no longer the unmount deadline on web: it is the _floor_ of the
safety-net timer, which fires at `max(exitMs, computed exit duration) +
100ms` for exits whose CSS never completes (`display:none` ancestors,
throttled background tabs). Keyframe-based exits complete on
`animationend`. On native, `exitMs` remains the exit animation itself.

Tooltip timing resolves prop → CSS token → built-in default: the `timing`
prop stays identical across platforms, while `--overlaid-tooltip-delay`/
`-warmth` theme the web hover-intent engine from CSS.

## Positioning

Floating UI writes `--overlaid-x`/`--overlaid-y` (with inline
`top: 0; left: 0`) and the motion layer applies
`transform: translate3d(var(--overlaid-x, 0px), var(--overlaid-y, 0px), 0)`
— so your CSS can compose transforms (origin-aware scale-in keyed off
`data-overlaid-placement`) as long as it restates the `translate3d`.

When the browser supports CSS Anchor Positioning and the instance has no
`boundaryRef` and sets `closeOnScroll={false}`, the browser is the engine
instead: the trigger carries an inline instance-unique `anchor-name`, the
panel is placed inline via `position-anchor`/`position-area` with
`position-try-fallbacks`, offset as a margin on the anchor-facing side, and
`position-visibility: anchors-visible` where supported. No JS runs per
scroll frame; `--overlaid-x/-y` stay unset (the `translate3d` is a no-op).
Divergences from Floating UI: no continuous shift near viewport corners,
try-fallback flips are invisible to `data-overlaid-placement`, and
`-start`/`-end` spans map physically (LTR).

## Close-first exits (Chromium)

Inside `@supports (overlay: auto) and (transition-behavior: allow-discrete)`
the motion layer extends `transition-property` on popover/tooltip panels
(`opacity, display, overlay`) and dialog hosts (`overlay, display`) with
`transition-behavior: allow-discrete`. Where that matches, the chrome closes
the platform surface (`hidePopover()`/`dialog.close()`) at dismissal start
and these transitions keep it — `::backdrop` included — painted in the top
layer through the exit reveal. If you replace a panel's
`transition-property` wholesale in such a browser, include `display` and
`overlay` or the exit will vanish at dismissal start. Engines without
`overlay` never match the block and keep the surface platform-open through
the whole `dismissing` phase.

## `unstyled`

`unstyled` no longer merges-or-skips a JS style object on web; it renders
`data-overlaid-unstyled`, and the `overlaid.defaults` layer stands down via
`:not([data-overlaid-unstyled])`. Two consequences:

- A consumer `className` rule now beats the defaults even **without**
  `unstyled` (the defaults live in a layer).
- The drawer surface keeps an opaque background even when `unstyled`
  (matching previous behavior, where the chrome painted it outside the
  defaults); override `background-color` in your CSS to change it.

## Reduced motion

The unlayered `prefers-reduced-motion` guard zeroes every transition on
elements carrying `data-overlaid-reveal` and on the dialog `::backdrop`. If
you add your own animated overlaid chrome, put `data-overlaid-reveal` on it
to inherit the guard.
