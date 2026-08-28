# Render trees

These are the important ownership boundaries rather than every wrapper node.
“Source context” means the panel reads providers where the overlay was
declared. “Host context” means it reads providers at the native portal host.

## Nothing open

Web has one layer host and a fallback portal node:

```text
document
└─ OverlayHost / LayerHostProvider("app")
   ├─ application
   └─ div#rno-overlay-root                 fallback only
```

Native adds an in-window registry portal:

```text
app OS window
└─ LayerHostProvider("app")
   └─ PortalScope
      └─ View
         ├─ application
         └─ PortalHost("app")              absolute, initially empty
```

## Dialog and Drawer

With a backdrop, web leaves the element in its React/DOM position and promotes
its paint into the top layer:

```text
browser top layer
└─ dialog[data-overlaid-modal]             owns modality/backdrop/focus
   └─ centered frame | fixed edge frame
      └─ role-bearing surface and children  source context
```

With `backdrop={false}`, Dialog and Drawer use `dialog.show()` instead. The
same fixed layout remains in ordinary document paint order; there is no top
layer, inert page, backdrop, or focus trap. Sheet remains in the modal top
layer when `scrim={false}`.

Native creates another OS window. The owning Dialog/Drawer entry remains in
the parent host; the nested host manages overlays opened inside the modal:

```text
app OS window                       RN Modal OS window
└─ owning layer entry               └─ LayerHostProvider("overlaid-modal-…")
                                      └─ window-filling View
                                         ├─ animated panel + Scrim
                                         │  └─ children (source context)
                                         └─ PortalHost("overlaid-modal-…")
```

The panel precedes the full-screen dismiss control in native accessibility
order. Visual stacking still places the Scrim behind it.

## Sheet

Web uses the same modal `<dialog>` host, with a fixed bottom panel:

```text
browser top layer
└─ dialog[data-overlaid-modal]
   └─ div[data-overlaid-sheet]              measured, draggable, detented
      ├─ optional handle
      └─ scrolling body + children          source context
```

Native delegates presentation to TrueSheet:

```text
app OS window                       TrueSheet OS presentation
└─ owning layer entry               └─ LayerHostProvider("overlaid-sheet-…")
                                      ├─ role-bearing content View
                                      │  └─ children (source context)
                                      └─ PortalHost("overlaid-sheet-…")
                                         absolute; does not affect auto size
```

The sheet portal host begins at the sheet content's page origin rather than
the device window origin. Anchored panels subtract that measured offset.

## Popover and Tooltip

With Popover API support, web changes paint order without moving the element
in the DOM or React tree:

```text
source DOM / React tree                      browser top layer (paint)
└─ anchored root                             ┌─ div[popover]
   ├─ trigger                                │  └─ panel (source context)
   └─ div[popover] ──────────────────────────┘
```

The fallback is a React DOM portal into `#rno-overlay-root`. It also preserves
source React context, but remains below an open modal dialog's top-layer
backdrop.

Native is the one public path that renders consumer content at a different
React location:

```text
source tree                         nearest PortalHost in the same OS window
└─ anchored root                    ├─ DismissUnderlay (window-sized)
   ├─ trigger                       └─ positioned Animated.View
   └─ Portal (renders null here)       └─ optional ContextBridge
                                         └─ panel (host context by default)
```

The trigger and touch points are measured in page space. Chrome subtracts the
portal host origin before assigning absolute `left` and `top`.

## Context table

| Surface           | Platform mechanism                  | Panel context            |
| ----------------- | ----------------------------------- | ------------------------ |
| Dialog / Drawer   | web `<dialog>`; native RN `Modal`   | source                   |
| Sheet             | web `<dialog>`; native TrueSheet    | source                   |
| Popover / Tooltip | web Popover API or React DOM portal | source                   |
| Popover / Tooltip | native registry portal              | **host**, unless bridged |

Bridge only the contexts the native anchored panel needs:

```tsx
const Bridge = useContextBridge(ThemeContext, FormContext)

<Popover contextBridge={Bridge}>{/* ... */}</Popover>
```

The context objects passed to `useContextBridge` must remain the same and in
the same order on every render. The returned bridge forwards current values.

## Nested dismissal example

For a Popover inside a native Dialog, the Popover entry registers with the
modal window's nested host and its panel portals into that window. Escape/back
and outside press dismiss the Popover first. A press inside the Popover is
classified as inside the descendant and does not dismiss the Dialog.

For a Tooltip inside a native Sheet, the Tooltip uses the sheet portal host.
Android back skips the hint policy, delegates through the sheet host, and can
dismiss the owning Sheet; a nested Popover consumes back first.
