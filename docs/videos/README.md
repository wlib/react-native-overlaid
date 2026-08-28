# Motion gallery

Recorded transition/animation clips complementing the still gallery in
[`docs/screenshots`](../screenshots/README.md). Each cell plays inline
(animated WebP preview); click through for the full-quality clip.
Regenerate with `npm run videos:web` (static Storybook + Playwright),
`npm run videos:ios` (booted simulator + Metro), and
`npm run videos:index`.

## Web (Chromium)

One continuous take per story: states in order, then Escape rounds.
Blocking/veto stories deliberately end open — the refusal is the
demo.

| Overlays/Dialog — Basic | Overlays/Dialog — Non Dismissable |
| --- | --- |
| [![overlays-dialog--basic](web/overlays-dialog--basic.webp)](web/overlays-dialog--basic.webm) | [![overlays-dialog--non-dismissable](web/overlays-dialog--non-dismissable.webp)](web/overlays-dialog--non-dismissable.webm) |

| Overlays/Dialog — Scrollable Content | Overlays/Dialog — Styled Surface And Backdrop |
| --- | --- |
| [![overlays-dialog--scrollable-content](web/overlays-dialog--scrollable-content.webp)](web/overlays-dialog--scrollable-content.webm) | [![overlays-dialog--styled-surface-and-backdrop](web/overlays-dialog--styled-surface-and-backdrop.webp)](web/overlays-dialog--styled-surface-and-backdrop.webm) |

| Overlays/Dialog — Compound Parts | Overlays/Drawer — Right Side |
| --- | --- |
| [![overlays-dialog--compound-parts](web/overlays-dialog--compound-parts.webp)](web/overlays-dialog--compound-parts.webm) | [![overlays-drawer--right-side](web/overlays-drawer--right-side.webp)](web/overlays-drawer--right-side.webm) |

| Overlays/Drawer — Left Side | Overlays/Drawer — Fixed Width Scrolling |
| --- | --- |
| [![overlays-drawer--left-side](web/overlays-drawer--left-side.webp)](web/overlays-drawer--left-side.webm) | [![overlays-drawer--fixed-width-scrolling](web/overlays-drawer--fixed-width-scrolling.webp)](web/overlays-drawer--fixed-width-scrolling.webm) |

| Overlays/Drawer — Non Dismissable | Overlays/Drawer — No Backdrop |
| --- | --- |
| [![overlays-drawer--non-dismissable](web/overlays-drawer--non-dismissable.webp)](web/overlays-drawer--non-dismissable.webm) | [![overlays-drawer--no-backdrop](web/overlays-drawer--no-backdrop.webp)](web/overlays-drawer--no-backdrop.webm) |

| Overlays/Drawer — Styled Surface | Overlays/Popover — Basic |
| --- | --- |
| [![overlays-drawer--styled-surface](web/overlays-drawer--styled-surface.webp)](web/overlays-drawer--styled-surface.webm) | [![overlays-popover--basic](web/overlays-popover--basic.webp)](web/overlays-popover--basic.webm) |

| Overlays/Popover — Opening one popover closes the other (auto displaces auto) | Overlays/Popover — Outside Press Dismisses |
| --- | --- |
| [![overlays-popover--displaces-other-popover](web/overlays-popover--displaces-other-popover.webp)](web/overlays-popover--displaces-other-popover.webm) | [![overlays-popover--outside-press-dismisses](web/overlays-popover--outside-press-dismisses.webp)](web/overlays-popover--outside-press-dismisses.webm) |

| Overlays/Popover — Placements | Overlays/Popover — Non Dismissable |
| --- | --- |
| [![overlays-popover--placements](web/overlays-popover--placements.webp)](web/overlays-popover--placements.webm) | [![overlays-popover--non-dismissable](web/overlays-popover--non-dismissable.webp)](web/overlays-popover--non-dismissable.webm) |

| Overlays/Popover — closeOnScroll (default) — page scroll dismisses | Overlays/Popover — closeOnScroll exemption — scrolling inside the panel |
| --- | --- |
| [![overlays-popover--close-on-scroll](web/overlays-popover--close-on-scroll.webp)](web/overlays-popover--close-on-scroll.webm) | [![overlays-popover--scroll-inside-panel-does-not-dismiss](web/overlays-popover--scroll-inside-panel-does-not-dismiss.webp)](web/overlays-popover--scroll-inside-panel-does-not-dismiss.webm) |

| Overlays/Popover — Displacement force-closes dismissable=false; veto survives | Overlays/Sheet — Content Sized |
| --- | --- |
| [![overlays-popover--displacement-vs-non-dismissable](web/overlays-popover--displacement-vs-non-dismissable.webp)](web/overlays-popover--displacement-vs-non-dismissable.webm) | [![overlays-sheet--content-sized](web/overlays-sheet--content-sized.webp)](web/overlays-sheet--content-sized.webm) |

| Overlays/Sheet — Three Detents | Overlays/Sheet — Scroll inside vs drag-to-dismiss arbitration |
| --- | --- |
| [![overlays-sheet--three-detents](web/overlays-sheet--three-detents.webp)](web/overlays-sheet--three-detents.webm) | [![overlays-sheet--scrolling-content](web/overlays-sheet--scrolling-content.webp)](web/overlays-sheet--scrolling-content.webm) |

| Overlays/Sheet — Non Dismissable | Overlays/Sheet — No Scrim |
| --- | --- |
| [![overlays-sheet--non-dismissable](web/overlays-sheet--non-dismissable.webp)](web/overlays-sheet--non-dismissable.webm) | [![overlays-sheet--no-scrim](web/overlays-sheet--no-scrim.webp)](web/overlays-sheet--no-scrim.webm) |

| Overlays/Sheet — Styled And Narrow | Overlays/Stacking & Nesting — Popover Inside Dialog |
| --- | --- |
| [![overlays-sheet--styled-and-narrow](web/overlays-sheet--styled-and-narrow.webp)](web/overlays-sheet--styled-and-narrow.webm) | [![overlays-stacking-nesting--popover-inside-dialog](web/overlays-stacking-nesting--popover-inside-dialog.webp)](web/overlays-stacking-nesting--popover-inside-dialog.webm) |

| Overlays/Stacking & Nesting — Press inside the dialog closes only the popover | Overlays/Stacking & Nesting — Dialog Above Drawer |
| --- | --- |
| [![overlays-stacking-nesting--click-inside-dialog-spares-it](web/overlays-stacking-nesting--click-inside-dialog-spares-it.webp)](web/overlays-stacking-nesting--click-inside-dialog-spares-it.webm) | [![overlays-stacking-nesting--dialog-above-drawer](web/overlays-stacking-nesting--dialog-above-drawer.webp)](web/overlays-stacking-nesting--dialog-above-drawer.webm) |

| Overlays/Stacking & Nesting — Tooltip Inside Sheet | Overlays/Stacking & Nesting — Kitchen sink: dialog → popover → tooltip |
| --- | --- |
| [![overlays-stacking-nesting--tooltip-inside-sheet](web/overlays-stacking-nesting--tooltip-inside-sheet.webp)](web/overlays-stacking-nesting--tooltip-inside-sheet.webm) | [![overlays-stacking-nesting--kitchen-sink-three-deep](web/overlays-stacking-nesting--kitchen-sink-three-deep.webp)](web/overlays-stacking-nesting--kitchen-sink-three-deep.webm) |

| Overlays/Tooltip — Hover And Focus | Overlays/Tooltip — Escape dismisses (WCAG 1.4.13) |
| --- | --- |
| [![overlays-tooltip--hover-and-focus](web/overlays-tooltip--hover-and-focus.webp)](web/overlays-tooltip--hover-and-focus.webm) | [![overlays-tooltip--escape-dismisses-hint](web/overlays-tooltip--escape-dismisses-hint.webp)](web/overlays-tooltip--escape-dismisses-hint.webm) |

| Overlays/Tooltip — Hovering a tooltip never closes an open popover | Overlays/Tooltip — Hover intent: first hover waits, warm hover is instant |
| --- | --- |
| [![overlays-tooltip--hint-does-not-displace-auto](web/overlays-tooltip--hint-does-not-displace-auto.webp)](web/overlays-tooltip--hint-does-not-displace-auto.webm) | [![overlays-tooltip--delayed-then-instant](web/overlays-tooltip--delayed-then-instant.webp)](web/overlays-tooltip--delayed-then-instant.webm) |

| Overlays/Tooltip — With Boundary | Overlays/Tooltip — Render Prop Trigger |
| --- | --- |
| [![overlays-tooltip--with-boundary](web/overlays-tooltip--with-boundary.webp)](web/overlays-tooltip--with-boundary.webm) | [![overlays-tooltip--render-prop-trigger](web/overlays-tooltip--render-prop-trigger.webp)](web/overlays-tooltip--render-prop-trigger.webm) |

## iOS (simulator)

Auto-pressed opens (the OS present animations) and kernel-routed
dismissals via the route channel; stacked scenarios unwind one layer
at a time. Popover/Tooltip scenarios open through plain library
Trigger parts and have no headless-drivable native clips.

| dialog basic | dialog non dismissable | dialog scrollable |
| --- | --- | --- |
| [![dialog-basic](ios/dialog-basic.webp)](ios/dialog-basic.mp4) | [![dialog-non-dismissable](ios/dialog-non-dismissable.webp)](ios/dialog-non-dismissable.mp4) | [![dialog-scrollable](ios/dialog-scrollable.webp)](ios/dialog-scrollable.mp4) |

| dialog styled | dialog compound | sheet content sized |
| --- | --- | --- |
| [![dialog-styled](ios/dialog-styled.webp)](ios/dialog-styled.mp4) | [![dialog-compound](ios/dialog-compound.webp)](ios/dialog-compound.mp4) | [![sheet-content-sized](ios/sheet-content-sized.webp)](ios/sheet-content-sized.mp4) |

| sheet three detents | sheet scrolling | sheet non dismissable |
| --- | --- | --- |
| [![sheet-three-detents](ios/sheet-three-detents.webp)](ios/sheet-three-detents.mp4) | [![sheet-scrolling](ios/sheet-scrolling.webp)](ios/sheet-scrolling.mp4) | [![sheet-non-dismissable](ios/sheet-non-dismissable.webp)](ios/sheet-non-dismissable.mp4) |

| sheet no scrim | sheet styled | drawer right |
| --- | --- | --- |
| [![sheet-no-scrim](ios/sheet-no-scrim.webp)](ios/sheet-no-scrim.mp4) | [![sheet-styled](ios/sheet-styled.webp)](ios/sheet-styled.mp4) | [![drawer-right](ios/drawer-right.webp)](ios/drawer-right.mp4) |

| drawer left | drawer fixed width | drawer non dismissable |
| --- | --- | --- |
| [![drawer-left](ios/drawer-left.webp)](ios/drawer-left.mp4) | [![drawer-fixed-width](ios/drawer-fixed-width.webp)](ios/drawer-fixed-width.mp4) | [![drawer-non-dismissable](ios/drawer-non-dismissable.webp)](ios/drawer-non-dismissable.mp4) |

| drawer no backdrop | drawer styled | stacking popover in dialog |
| --- | --- | --- |
| [![drawer-no-backdrop](ios/drawer-no-backdrop.webp)](ios/drawer-no-backdrop.mp4) | [![drawer-styled](ios/drawer-styled.webp)](ios/drawer-styled.mp4) | [![stacking-popover-in-dialog](ios/stacking-popover-in-dialog.webp)](ios/stacking-popover-in-dialog.mp4) |

| stacking dialog above drawer | stacking tooltip in sheet | stacking kitchen sink |
| --- | --- | --- |
| [![stacking-dialog-above-drawer](ios/stacking-dialog-above-drawer.webp)](ios/stacking-dialog-above-drawer.mp4) | [![stacking-tooltip-in-sheet](ios/stacking-tooltip-in-sheet.webp)](ios/stacking-tooltip-in-sheet.mp4) | [![stacking-kitchen-sink](ios/stacking-kitchen-sink.webp)](ios/stacking-kitchen-sink.mp4) |

