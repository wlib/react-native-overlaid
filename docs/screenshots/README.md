# Screenshot gallery

Generated — do not edit by hand. Regenerate with:

```sh
npm run storybook                    # terminal 1
node scripts/screenshots-web.mjs     # web captures
node scripts/screenshots-ios.mjs     # iOS captures (booted sim + example app)
node scripts/screenshots-index.mjs   # this page
```

Each entry shows every captured state: web (Storybook, Chromium) on top,
iOS (example app, simulator) below. Popover/Tooltip open states on iOS
are captured interactively (their triggers are anchored elements, not
auto-pressable buttons) and may be absent from automated runs.

## Dialog

### Overlays/Dialog — Basic

**Web**

<p>
<img src="web/overlays-dialog--basic--closed.png" alt="overlays-dialog--basic--closed.png" width="320">
<img src="web/overlays-dialog--basic--open.png" alt="overlays-dialog--basic--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/dialog-basic--closed.png" alt="dialog-basic--closed.png" width="200">
<img src="ios/dialog-basic--open.png" alt="dialog-basic--open.png" width="200">
</p>

### Overlays/Dialog — Non Dismissable

**Web**

<p>
<img src="web/overlays-dialog--non-dismissable--closed.png" alt="overlays-dialog--non-dismissable--closed.png" width="320">
<img src="web/overlays-dialog--non-dismissable--open.png" alt="overlays-dialog--non-dismissable--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/dialog-non-dismissable--closed.png" alt="dialog-non-dismissable--closed.png" width="200">
<img src="ios/dialog-non-dismissable--open.png" alt="dialog-non-dismissable--open.png" width="200">
</p>

### Overlays/Dialog — Scrollable Content

**Web**

<p>
<img src="web/overlays-dialog--scrollable-content--closed.png" alt="overlays-dialog--scrollable-content--closed.png" width="320">
<img src="web/overlays-dialog--scrollable-content--open.png" alt="overlays-dialog--scrollable-content--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/dialog-scrollable--closed.png" alt="dialog-scrollable--closed.png" width="200">
<img src="ios/dialog-scrollable--open.png" alt="dialog-scrollable--open.png" width="200">
</p>

### Overlays/Dialog — Styled Surface And Backdrop

**Web**

<p>
<img src="web/overlays-dialog--styled-surface-and-backdrop--closed.png" alt="overlays-dialog--styled-surface-and-backdrop--closed.png" width="320">
<img src="web/overlays-dialog--styled-surface-and-backdrop--open.png" alt="overlays-dialog--styled-surface-and-backdrop--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/dialog-styled--closed.png" alt="dialog-styled--closed.png" width="200">
<img src="ios/dialog-styled--open.png" alt="dialog-styled--open.png" width="200">
</p>

### Overlays/Dialog — Compound Parts

**Web**

<p>
<img src="web/overlays-dialog--compound-parts--closed.png" alt="overlays-dialog--compound-parts--closed.png" width="320">
<img src="web/overlays-dialog--compound-parts--open.png" alt="overlays-dialog--compound-parts--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/dialog-compound--closed.png" alt="dialog-compound--closed.png" width="200">
<img src="ios/dialog-compound--open.png" alt="dialog-compound--open.png" width="200">
</p>

## Sheet

### Overlays/Sheet — Content Sized

**Web**

<p>
<img src="web/overlays-sheet--content-sized--closed.png" alt="overlays-sheet--content-sized--closed.png" width="320">
<img src="web/overlays-sheet--content-sized--open.png" alt="overlays-sheet--content-sized--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/sheet-content-sized--closed.png" alt="sheet-content-sized--closed.png" width="200">
<img src="ios/sheet-content-sized--open.png" alt="sheet-content-sized--open.png" width="200">
</p>

### Overlays/Sheet — Three Detents

**Web**

<p>
<img src="web/overlays-sheet--three-detents--closed.png" alt="overlays-sheet--three-detents--closed.png" width="320">
<img src="web/overlays-sheet--three-detents--middle-detent.png" alt="overlays-sheet--three-detents--middle-detent.png" width="320">
<img src="web/overlays-sheet--three-detents--low-detent.png" alt="overlays-sheet--three-detents--low-detent.png" width="320">
</p>

**iOS**

<p>
<img src="ios/sheet-three-detents--closed.png" alt="sheet-three-detents--closed.png" width="200">
<img src="ios/sheet-three-detents--open.png" alt="sheet-three-detents--open.png" width="200">
</p>

### Overlays/Sheet — Scroll inside vs drag-to-dismiss arbitration

**Web**

<p>
<img src="web/overlays-sheet--scrolling-content--closed.png" alt="overlays-sheet--scrolling-content--closed.png" width="320">
<img src="web/overlays-sheet--scrolling-content--open.png" alt="overlays-sheet--scrolling-content--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/sheet-scrolling--closed.png" alt="sheet-scrolling--closed.png" width="200">
<img src="ios/sheet-scrolling--open.png" alt="sheet-scrolling--open.png" width="200">
</p>

### Overlays/Sheet — Non Dismissable

**Web**

<p>
<img src="web/overlays-sheet--non-dismissable--closed.png" alt="overlays-sheet--non-dismissable--closed.png" width="320">
<img src="web/overlays-sheet--non-dismissable--open.png" alt="overlays-sheet--non-dismissable--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/sheet-non-dismissable--closed.png" alt="sheet-non-dismissable--closed.png" width="200">
<img src="ios/sheet-non-dismissable--open.png" alt="sheet-non-dismissable--open.png" width="200">
</p>

### Overlays/Sheet — No Scrim

**Web**

<p>
<img src="web/overlays-sheet--no-scrim--closed.png" alt="overlays-sheet--no-scrim--closed.png" width="320">
<img src="web/overlays-sheet--no-scrim--open.png" alt="overlays-sheet--no-scrim--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/sheet-no-scrim--closed.png" alt="sheet-no-scrim--closed.png" width="200">
<img src="ios/sheet-no-scrim--open.png" alt="sheet-no-scrim--open.png" width="200">
</p>

### Overlays/Sheet — Styled And Narrow

**Web**

<p>
<img src="web/overlays-sheet--styled-and-narrow--closed.png" alt="overlays-sheet--styled-and-narrow--closed.png" width="320">
<img src="web/overlays-sheet--styled-and-narrow--open.png" alt="overlays-sheet--styled-and-narrow--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/sheet-styled--closed.png" alt="sheet-styled--closed.png" width="200">
<img src="ios/sheet-styled--open.png" alt="sheet-styled--open.png" width="200">
</p>

## Drawer

### Overlays/Drawer — Right Side

**Web**

<p>
<img src="web/overlays-drawer--right-side--closed.png" alt="overlays-drawer--right-side--closed.png" width="320">
<img src="web/overlays-drawer--right-side--open.png" alt="overlays-drawer--right-side--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/drawer-right--closed.png" alt="drawer-right--closed.png" width="200">
<img src="ios/drawer-right--open.png" alt="drawer-right--open.png" width="200">
</p>

### Overlays/Drawer — Left Side

**Web**

<p>
<img src="web/overlays-drawer--left-side--closed.png" alt="overlays-drawer--left-side--closed.png" width="320">
<img src="web/overlays-drawer--left-side--open.png" alt="overlays-drawer--left-side--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/drawer-left--closed.png" alt="drawer-left--closed.png" width="200">
<img src="ios/drawer-left--open.png" alt="drawer-left--open.png" width="200">
</p>

### Overlays/Drawer — Fixed Width Scrolling

**Web**

<p>
<img src="web/overlays-drawer--fixed-width-scrolling--closed.png" alt="overlays-drawer--fixed-width-scrolling--closed.png" width="320">
<img src="web/overlays-drawer--fixed-width-scrolling--open.png" alt="overlays-drawer--fixed-width-scrolling--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/drawer-fixed-width--closed.png" alt="drawer-fixed-width--closed.png" width="200">
<img src="ios/drawer-fixed-width--open.png" alt="drawer-fixed-width--open.png" width="200">
</p>

### Overlays/Drawer — Non Dismissable

**Web**

<p>
<img src="web/overlays-drawer--non-dismissable--closed.png" alt="overlays-drawer--non-dismissable--closed.png" width="320">
<img src="web/overlays-drawer--non-dismissable--open.png" alt="overlays-drawer--non-dismissable--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/drawer-non-dismissable--closed.png" alt="drawer-non-dismissable--closed.png" width="200">
<img src="ios/drawer-non-dismissable--open.png" alt="drawer-non-dismissable--open.png" width="200">
</p>

### Overlays/Drawer — No Backdrop

**Web**

<p>
<img src="web/overlays-drawer--no-backdrop--closed.png" alt="overlays-drawer--no-backdrop--closed.png" width="320">
<img src="web/overlays-drawer--no-backdrop--open.png" alt="overlays-drawer--no-backdrop--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/drawer-no-backdrop--closed.png" alt="drawer-no-backdrop--closed.png" width="200">
<img src="ios/drawer-no-backdrop--open.png" alt="drawer-no-backdrop--open.png" width="200">
</p>

### Overlays/Drawer — Styled Surface

**Web**

<p>
<img src="web/overlays-drawer--styled-surface--closed.png" alt="overlays-drawer--styled-surface--closed.png" width="320">
<img src="web/overlays-drawer--styled-surface--open.png" alt="overlays-drawer--styled-surface--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/drawer-styled--closed.png" alt="drawer-styled--closed.png" width="200">
<img src="ios/drawer-styled--open.png" alt="drawer-styled--open.png" width="200">
</p>

## Popover

### Overlays/Popover — Basic

**Web**

<p>
<img src="web/overlays-popover--basic--closed.png" alt="overlays-popover--basic--closed.png" width="320">
<img src="web/overlays-popover--basic--open.png" alt="overlays-popover--basic--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-basic--closed.png" alt="popover-basic--closed.png" width="200">
<img src="ios/popover-basic--open.png" alt="popover-basic--open.png" width="200">
</p>

### Overlays/Popover — Opening one popover closes the other (auto displaces auto)

**Web**

<p>
<img src="web/overlays-popover--displaces-other-popover--closed.png" alt="overlays-popover--displaces-other-popover--closed.png" width="320">
<img src="web/overlays-popover--displaces-other-popover--first-open.png" alt="overlays-popover--displaces-other-popover--first-open.png" width="320">
<img src="web/overlays-popover--displaces-other-popover--second-displaces-first.png" alt="overlays-popover--displaces-other-popover--second-displaces-first.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-displacement--closed.png" alt="popover-displacement--closed.png" width="200">
<img src="ios/popover-displacement--first-open.png" alt="popover-displacement--first-open.png" width="200">
<img src="ios/popover-displacement--second-displaces-first.png" alt="popover-displacement--second-displaces-first.png" width="200">
</p>

### Overlays/Popover — Outside Press Dismisses

**Web**

<p>
<img src="web/overlays-popover--outside-press-dismisses--closed.png" alt="overlays-popover--outside-press-dismisses--closed.png" width="320">
<img src="web/overlays-popover--outside-press-dismisses--open.png" alt="overlays-popover--outside-press-dismisses--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-outside-press--closed.png" alt="popover-outside-press--closed.png" width="200">
<img src="ios/popover-outside-press--open.png" alt="popover-outside-press--open.png" width="200">
</p>

### Overlays/Popover — Placements

**Web**

<p>
<img src="web/overlays-popover--placements--closed.png" alt="overlays-popover--placements--closed.png" width="320">
<img src="web/overlays-popover--placements--top.png" alt="overlays-popover--placements--top.png" width="320">
<img src="web/overlays-popover--placements--bottom.png" alt="overlays-popover--placements--bottom.png" width="320">
<img src="web/overlays-popover--placements--left.png" alt="overlays-popover--placements--left.png" width="320">
<img src="web/overlays-popover--placements--right.png" alt="overlays-popover--placements--right.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-placements--closed.png" alt="popover-placements--closed.png" width="200">
<img src="ios/popover-placements--top.png" alt="popover-placements--top.png" width="200">
<img src="ios/popover-placements--bottom.png" alt="popover-placements--bottom.png" width="200">
<img src="ios/popover-placements--left.png" alt="popover-placements--left.png" width="200">
<img src="ios/popover-placements--right.png" alt="popover-placements--right.png" width="200">
</p>

### Overlays/Popover — Non Dismissable

**Web**

<p>
<img src="web/overlays-popover--non-dismissable--closed.png" alt="overlays-popover--non-dismissable--closed.png" width="320">
<img src="web/overlays-popover--non-dismissable--open.png" alt="overlays-popover--non-dismissable--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-non-dismissable--closed.png" alt="popover-non-dismissable--closed.png" width="200">
<img src="ios/popover-non-dismissable--open.png" alt="popover-non-dismissable--open.png" width="200">
</p>

### Overlays/Popover — closeOnScroll (default) — page scroll dismisses

**Web**

<p>
<img src="web/overlays-popover--close-on-scroll--closed.png" alt="overlays-popover--close-on-scroll--closed.png" width="320">
<img src="web/overlays-popover--close-on-scroll--open.png" alt="overlays-popover--close-on-scroll--open.png" width="320">
<img src="web/overlays-popover--close-on-scroll--dismissed-after-scroll.png" alt="overlays-popover--close-on-scroll--dismissed-after-scroll.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-close-on-scroll--closed.png" alt="popover-close-on-scroll--closed.png" width="200">
</p>

### Overlays/Popover — closeOnScroll exemption — scrolling inside the panel

**Web**

<p>
<img src="web/overlays-popover--scroll-inside-panel-does-not-dismiss--closed.png" alt="overlays-popover--scroll-inside-panel-does-not-dismiss--closed.png" width="320">
<img src="web/overlays-popover--scroll-inside-panel-does-not-dismiss--open.png" alt="overlays-popover--scroll-inside-panel-does-not-dismiss--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-scroll-inside--closed.png" alt="popover-scroll-inside--closed.png" width="200">
<img src="ios/popover-scroll-inside--open.png" alt="popover-scroll-inside--open.png" width="200">
</p>

### Overlays/Popover — Displacement force-closes dismissable=false; veto survives

**Web**

<p>
<img src="web/overlays-popover--displacement-vs-non-dismissable--closed.png" alt="overlays-popover--displacement-vs-non-dismissable--closed.png" width="320">
<img src="web/overlays-popover--displacement-vs-non-dismissable--sticky-open.png" alt="overlays-popover--displacement-vs-non-dismissable--sticky-open.png" width="320">
<img src="web/overlays-popover--displacement-vs-non-dismissable--veto-survives-displacement.png" alt="overlays-popover--displacement-vs-non-dismissable--veto-survives-displacement.png" width="320">
</p>

**iOS**

<p>
<img src="ios/popover-forced-displacement--closed.png" alt="popover-forced-displacement--closed.png" width="200">
<img src="ios/popover-forced-displacement--sticky-open.png" alt="popover-forced-displacement--sticky-open.png" width="200">
</p>

## Tooltip

### Overlays/Tooltip — Hover And Focus

**Web**

<p>
<img src="web/overlays-tooltip--hover-and-focus--closed.png" alt="overlays-tooltip--hover-and-focus--closed.png" width="320">
<img src="web/overlays-tooltip--hover-and-focus--open.png" alt="overlays-tooltip--hover-and-focus--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/tooltip-hover-focus--closed.png" alt="tooltip-hover-focus--closed.png" width="200">
<img src="ios/tooltip-hover-focus--open.png" alt="tooltip-hover-focus--open.png" width="200">
</p>

### Overlays/Tooltip — Escape dismisses (WCAG 1.4.13)

**Web**

<p>
<img src="web/overlays-tooltip--escape-dismisses-hint--closed.png" alt="overlays-tooltip--escape-dismisses-hint--closed.png" width="320">
<img src="web/overlays-tooltip--escape-dismisses-hint--open.png" alt="overlays-tooltip--escape-dismisses-hint--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/tooltip-escape--closed.png" alt="tooltip-escape--closed.png" width="200">
<img src="ios/tooltip-escape--open.png" alt="tooltip-escape--open.png" width="200">
</p>

### Overlays/Tooltip — Hovering a tooltip never closes an open popover

**Web**

<p>
<img src="web/overlays-tooltip--hint-does-not-displace-auto--closed.png" alt="overlays-tooltip--hint-does-not-displace-auto--closed.png" width="320">
<img src="web/overlays-tooltip--hint-does-not-displace-auto--popover-plus-tooltip.png" alt="overlays-tooltip--hint-does-not-displace-auto--popover-plus-tooltip.png" width="320">
</p>

**iOS**

<p>
<img src="ios/tooltip-hint-vs-auto--closed.png" alt="tooltip-hint-vs-auto--closed.png" width="200">
<img src="ios/tooltip-hint-vs-auto--popover-plus-tooltip.png" alt="tooltip-hint-vs-auto--popover-plus-tooltip.png" width="200">
</p>

### Overlays/Tooltip — With Boundary

**Web**

<p>
<img src="web/overlays-tooltip--with-boundary--closed.png" alt="overlays-tooltip--with-boundary--closed.png" width="320">
<img src="web/overlays-tooltip--with-boundary--open.png" alt="overlays-tooltip--with-boundary--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/tooltip-boundary--closed.png" alt="tooltip-boundary--closed.png" width="200">
<img src="ios/tooltip-boundary--open.png" alt="tooltip-boundary--open.png" width="200">
</p>

### Overlays/Tooltip — Render Prop Trigger

**Web**

<p>
<img src="web/overlays-tooltip--render-prop-trigger--closed.png" alt="overlays-tooltip--render-prop-trigger--closed.png" width="320">
<img src="web/overlays-tooltip--render-prop-trigger--open.png" alt="overlays-tooltip--render-prop-trigger--open.png" width="320">
</p>

**iOS**

<p>
<img src="ios/tooltip-render-prop--closed.png" alt="tooltip-render-prop--closed.png" width="200">
<img src="ios/tooltip-render-prop--open.png" alt="tooltip-render-prop--open.png" width="200">
</p>

## Stacking

### Overlays/Stacking & Nesting — Popover Inside Dialog

**Web**

<p>
<img src="web/overlays-stacking-nesting--popover-inside-dialog--closed.png" alt="overlays-stacking-nesting--popover-inside-dialog--closed.png" width="320">
<img src="web/overlays-stacking-nesting--popover-inside-dialog--dialog-open.png" alt="overlays-stacking-nesting--popover-inside-dialog--dialog-open.png" width="320">
<img src="web/overlays-stacking-nesting--popover-inside-dialog--popover-in-dialog.png" alt="overlays-stacking-nesting--popover-inside-dialog--popover-in-dialog.png" width="320">
</p>

**iOS**

<p>
<img src="ios/stacking-popover-in-dialog--closed.png" alt="stacking-popover-in-dialog--closed.png" width="200">
<img src="ios/stacking-popover-in-dialog--open.png" alt="stacking-popover-in-dialog--open.png" width="200">
<img src="ios/stacking-popover-in-dialog--popover-in-dialog.png" alt="stacking-popover-in-dialog--popover-in-dialog.png" width="200">
</p>

### Overlays/Stacking & Nesting — Press inside the dialog closes only the popover

**Web**

<p>
<img src="web/overlays-stacking-nesting--click-inside-dialog-spares-it--closed.png" alt="overlays-stacking-nesting--click-inside-dialog-spares-it--closed.png" width="320">
<img src="web/overlays-stacking-nesting--click-inside-dialog-spares-it--popover-in-dialog.png" alt="overlays-stacking-nesting--click-inside-dialog-spares-it--popover-in-dialog.png" width="320">
<img src="web/overlays-stacking-nesting--click-inside-dialog-spares-it--popover-dismissed-dialog-spared.png" alt="overlays-stacking-nesting--click-inside-dialog-spares-it--popover-dismissed-dialog-spared.png" width="320">
</p>

### Overlays/Stacking & Nesting — Dialog Above Drawer

**Web**

<p>
<img src="web/overlays-stacking-nesting--dialog-above-drawer--closed.png" alt="overlays-stacking-nesting--dialog-above-drawer--closed.png" width="320">
<img src="web/overlays-stacking-nesting--dialog-above-drawer--drawer-open.png" alt="overlays-stacking-nesting--dialog-above-drawer--drawer-open.png" width="320">
<img src="web/overlays-stacking-nesting--dialog-above-drawer--dialog-above-drawer.png" alt="overlays-stacking-nesting--dialog-above-drawer--dialog-above-drawer.png" width="320">
</p>

**iOS**

<p>
<img src="ios/stacking-dialog-above-drawer--closed.png" alt="stacking-dialog-above-drawer--closed.png" width="200">
<img src="ios/stacking-dialog-above-drawer--open.png" alt="stacking-dialog-above-drawer--open.png" width="200">
</p>

### Overlays/Stacking & Nesting — Tooltip Inside Sheet

**Web**

<p>
<img src="web/overlays-stacking-nesting--tooltip-inside-sheet--closed.png" alt="overlays-stacking-nesting--tooltip-inside-sheet--closed.png" width="320">
<img src="web/overlays-stacking-nesting--tooltip-inside-sheet--sheet-open.png" alt="overlays-stacking-nesting--tooltip-inside-sheet--sheet-open.png" width="320">
<img src="web/overlays-stacking-nesting--tooltip-inside-sheet--tooltip-in-sheet.png" alt="overlays-stacking-nesting--tooltip-inside-sheet--tooltip-in-sheet.png" width="320">
</p>

**iOS**

<p>
<img src="ios/stacking-tooltip-in-sheet--closed.png" alt="stacking-tooltip-in-sheet--closed.png" width="200">
<img src="ios/stacking-tooltip-in-sheet--open.png" alt="stacking-tooltip-in-sheet--open.png" width="200">
<img src="ios/stacking-tooltip-in-sheet--tooltip-in-sheet.png" alt="stacking-tooltip-in-sheet--tooltip-in-sheet.png" width="200">
</p>

### Overlays/Stacking & Nesting — Kitchen sink: dialog → popover → tooltip

**Web**

<p>
<img src="web/overlays-stacking-nesting--kitchen-sink-three-deep--closed.png" alt="overlays-stacking-nesting--kitchen-sink-three-deep--closed.png" width="320">
<img src="web/overlays-stacking-nesting--kitchen-sink-three-deep--dialog-open.png" alt="overlays-stacking-nesting--kitchen-sink-three-deep--dialog-open.png" width="320">
<img src="web/overlays-stacking-nesting--kitchen-sink-three-deep--two-deep.png" alt="overlays-stacking-nesting--kitchen-sink-three-deep--two-deep.png" width="320">
<img src="web/overlays-stacking-nesting--kitchen-sink-three-deep--three-deep.png" alt="overlays-stacking-nesting--kitchen-sink-three-deep--three-deep.png" width="320">
</p>

**iOS**

<p>
<img src="ios/stacking-kitchen-sink--closed.png" alt="stacking-kitchen-sink--closed.png" width="200">
<img src="ios/stacking-kitchen-sink--open.png" alt="stacking-kitchen-sink--open.png" width="200">
<img src="ios/stacking-kitchen-sink--two-deep.png" alt="stacking-kitchen-sink--two-deep.png" width="200">
<img src="ios/stacking-kitchen-sink--three-deep.png" alt="stacking-kitchen-sink--three-deep.png" width="200">
</p>

