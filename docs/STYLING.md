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

## Layer architecture

```css
@layer overlaid.reset, overlaid.positioning, overlaid.defaults, overlaid.motion;
```

- **`overlaid.reset`** — `<dialog>` and popover UA-chrome resets. Always
  applies (even with `unstyled`).
- **`overlaid.positioning`** — the CSS Anchor Positioning engine for
  panels that opted into `web.positioning='css-anchor'` (see
  [WEB-OPTIONS.md](./WEB-OPTIONS.md)), keyed on `data-overlaid-anchored`.
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

| Attribute                 | Values                                             | Where                                                                                                                         |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `data-overlaid-kind`      | `dialog` `drawer` `sheet` `popover` `tooltip`      | host + surface                                                                                                                |
| `data-overlaid-part`      | `host` `surface`                                   | `<dialog>` hosts are `host`; panels are `surface` (the popover/tooltip panel is its own top-layer host and carries `surface`) |
| `data-overlaid-state`     | `open` `closed`                                    | `open` ⇔ lifecycle phase `presented` (Radix-compatible muscle memory)                                                         |
| `data-overlaid-phase`     | `mounting` `presented` `dismissing`                | full lifecycle fidelity                                                                                                       |
| `data-overlaid-side`      | `left` `right`                                     | drawer surface                                                                                                                |
| `data-overlaid-dragging`  | present while a sheet drag is active               | sheet surface                                                                                                                 |
| `data-overlaid-unstyled`  | present when the consumer passed `unstyled`        | surface                                                                                                                       |
| `data-overlaid-anchored`  | `css` when `web.positioning='css-anchor'` resolved | popover/tooltip surface                                                                                                       |
| `data-overlaid-placement` | the resolved `placement` (e.g. `bottom-start`)     | popover/tooltip surface, css-anchor mode only                                                                                 |

Entry transitions work because chromes mount with `data-overlaid-state="closed"`
and the kernel's presentation gates flip it to `"open"` in a later commit —
you can key your own entry/exit animation entirely off that attribute.

## Custom properties

**Instance inputs** — written inline by the chrome, read by the stylesheet.
Treat these as read-only values your CSS may _consume_:

| Property                                                                               | Written by         | Meaning                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `--overlaid-duration`                                                                  | every chrome       | the instance's `exitMs` (dialog 180 / drawer 200 / sheet 220 / popover 120 / tooltip 80)                                 |
| `--overlaid-backdrop-duration`                                                         | dialog host        | legacy alias of the above for the `::backdrop` transition                                                                |
| `--overlaid-backdrop-color` / `--overlaid-backdrop-opacity`                            | dialog host        | from the `backdrop`/`scrim` slot                                                                                         |
| `--overlaid-sheet-translate` / `--overlaid-sheet-height`                               | sheet surface      | live drag/detent geometry, updated every frame                                                                           |
| `--overlaid-position-anchor` / `--overlaid-position-area` / `--overlaid-anchor-offset` | css-anchored panel | inputs to the `overlaid.positioning` layer (per-instance `anchor-name`, mapped `position-area`, the `offset` prop in px) |

**Theme tokens** — defined (as fallbacks) by the stylesheet, overridable by
your CSS at `:root` or any ancestor:

| Token                       | Default(s)                                                          |
| --------------------------- | ------------------------------------------------------------------- |
| `--overlaid-surface-bg`     | `#ffffff`                                                           |
| `--overlaid-surface-radius` | dialog 16px / popover 12px / tooltip 8px / sheet 16px (top corners) |
| `--overlaid-surface-shadow` | per-kind soft shadow                                                |
| `--overlaid-tooltip-bg`     | `#111827`                                                           |

```css
:root {
  --overlaid-surface-bg: #101418;
  --overlaid-surface-radius: 6px;
}
```

Tooltip _text_ color/size stays a JS default (`textStyle` prop): the
react-native-web `Text` element paints its own `color`/`font`, so a token on
the surface cannot cascade into it.

## Timing and exit reconciliation

- Slowing a reveal down in CSS animates for as long as you like **on entry**;
  on exit the unmount still happens at the instance's `exitMs` budget (the
  chrome must not hold `<dialog>`s open indefinitely). Speeding an exit up
  works fully: the chrome listens for your `transitionend`/`animationend` on
  the surface and unmounts early.
- Tooltip open/warmth timing is a prop (`timing={{ delay, warmth }}`), not a
  CSS token, so it stays identical across platforms.

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
