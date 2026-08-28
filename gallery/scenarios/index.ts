/**
 * Scenario registry — the single source of truth for demo/QA scenarios.
 *
 * Every scenario is a pure React Native component (imports only react,
 * react-native, ../../src and ./helpers), so the same components drive:
 *   - the web Storybook stories (stories/*.stories.tsx), which add play
 *     functions on top;
 *   - the native gallery (gallery/OverlayGallery.tsx) for manual iOS/Android
 *     QA;
 *   - the native smoke suite (src/components/__tests__/scenarios.test.tsx),
 *     which walks this registry.
 */
import type { ComponentType } from 'react'
import {
  BasicDialog,
  CompoundDialog,
  NonDismissableDialog,
  ScrollableDialog,
  StyledDialog,
} from './dialog'
import {
  LeftDrawer,
  NarrowDrawer,
  NoBackdropDrawer,
  NonDismissableDrawer,
  RightDrawer,
  StyledDrawer,
} from './drawer'
import {
  BasicPopover,
  CloseOnScrollPopover,
  DisplacingPopovers,
  ForcedDisplacementPopovers,
  NonDismissablePopover,
  OutsidePressPopover,
  PinnedPopover,
  PopoverPlacements,
  ScrollInsidePopover,
} from './popover'
import {
  ContentSheet,
  DetentedSheet,
  NoScrimSheet,
  NonDismissableSheet,
  ScrollingSheet,
  StyledSheet,
} from './sheet'
import {
  DialogFromDrawer,
  KitchenSink,
  PopoverInDialog,
  TooltipInSheet,
} from './stacking'
import {
  BoundedTooltip,
  EscapeDismissesTooltip,
  HintDoesNotDisplaceAuto,
  HoverFocusTooltip,
  RenderPropTooltip,
  TooltipTimingPair,
} from './tooltip'

export type Scenario = {
  key: string
  family: 'Dialog' | 'Sheet' | 'Drawer' | 'Popover' | 'Tooltip' | 'Stacking'
  title: string
  description?: string
  Component: ComponentType
  nativeOnly?: boolean
  webOnly?: boolean
  /**
   * Distinctive text that mounts after pressing the scenario's single
   * "Open …" trigger — asserted by the native smoke suite. Only set where
   * such a trigger exists.
   */
  smokeText?: string
}

export const scenarios: Scenario[] = [
  // ── Dialog ────────────────────────────────────────────────────────────
  {
    key: 'dialog-basic',
    family: 'Dialog',
    title: 'Basic',
    description:
      'Plain modal dialog: escape and backdrop dismiss through the layer host.',
    Component: BasicDialog,
    smokeText: 'Basic dialog',
  },
  {
    key: 'dialog-non-dismissable',
    family: 'Dialog',
    title: 'Non-dismissable',
    description:
      'dismissable={false} refuses escape/backdrop/outside press; only the explicit button closes.',
    Component: NonDismissableDialog,
    smokeText: 'Confirm irreversible action',
  },
  {
    key: 'dialog-scrollable',
    family: 'Dialog',
    title: 'Scrollable content',
    description:
      'Long content constrained by layout.maxHeight; the body scrolls inside the panel.',
    Component: ScrollableDialog,
    smokeText: 'Terms and conditions',
  },
  {
    key: 'dialog-styled',
    family: 'Dialog',
    title: 'Styled surface & backdrop',
    description:
      'surface/backdrop slot overrides; the backdrop slot feeds ::backdrop on web and the scrim on native.',
    Component: StyledDialog,
    smokeText: 'Custom surface & backdrop',
  },
  {
    key: 'dialog-compound',
    family: 'Dialog',
    title: 'Compound parts',
    description:
      'Dialog.Root/Content/Title/Description/Close — full control over the tree, same kernel underneath.',
    Component: CompoundDialog,
    smokeText: 'Compound API',
  },

  // ── Sheet ─────────────────────────────────────────────────────────────
  {
    key: 'sheet-content-sized',
    family: 'Sheet',
    title: 'Content-sized',
    description:
      "The default 'content' detent hugs short content: a real OS sheet ('auto' detent) on native, a measured panel on web.",
    Component: ContentSheet,
    smokeText: 'Content-sized sheet',
  },
  {
    key: 'sheet-three-detents',
    family: 'Sheet',
    title: 'Three detents',
    description:
      'detents=[33%, 66%, full], opening at the middle one. Handle-drag physics are the web panel’s; on native the OS owns detents and gestures.',
    Component: DetentedSheet,
    smokeText: 'Three detents',
  },
  {
    key: 'sheet-scrolling',
    family: 'Sheet',
    title: 'Scroll inside vs drag-to-dismiss arbitration',
    description:
      'Sheet.ScrollView: a downward drag scrolls the list instead of dismissing the sheet. The drag arbitration is web-gesture-specific; native delegates to OS sheet physics (Android needs the nested-scroll path).',
    Component: ScrollingSheet,
    smokeText: 'Row 1',
  },
  {
    key: 'sheet-non-dismissable',
    family: 'Sheet',
    title: 'Non-dismissable',
    description:
      'dismissable=false: swipe-down, escape and backdrop are refused; only the explicit button closes.',
    Component: NonDismissableSheet,
    smokeText: 'Finish this first',
  },
  {
    key: 'sheet-no-scrim',
    family: 'Sheet',
    title: 'No scrim',
    description:
      "scrim=false: no dimming — the OS sheet's dimmed=false on native, a transparent ::backdrop on web.",
    Component: NoScrimSheet,
    smokeText: 'no dimming',
  },
  {
    key: 'sheet-styled',
    family: 'Sheet',
    title: 'Styled and narrow',
    description:
      'layout.maxWidth narrows the web sheet; the surface slot restyles it. Native sheet chrome stays with the OS, so surface styling is web-leaning.',
    Component: StyledSheet,
    smokeText: 'narrows the web sheet',
  },

  // ── Drawer ────────────────────────────────────────────────────────────
  {
    key: 'drawer-right',
    family: 'Drawer',
    title: 'Right side',
    description:
      'Edge-pinned panel sliding from the right; backdrop press and escape dismiss.',
    Component: RightDrawer,
    smokeText: 'right drawer',
  },
  {
    key: 'drawer-left',
    family: 'Drawer',
    title: 'Left side',
    description:
      'Edge-pinned panel sliding from the left; backdrop press and escape dismiss.',
    Component: LeftDrawer,
    smokeText: 'left drawer',
  },
  {
    key: 'drawer-fixed-width',
    family: 'Drawer',
    title: 'Fixed width, scrolling',
    description: 'layout.width pins the panel to 320px; long content scrolls.',
    Component: NarrowDrawer,
    smokeText: 'Fixed 320px width',
  },
  {
    key: 'drawer-non-dismissable',
    family: 'Drawer',
    title: 'Non-dismissable',
    description: 'Refuses escape/backdrop; close it with the explicit button.',
    Component: NonDismissableDrawer,
    smokeText: 'Unsaved changes',
  },
  {
    key: 'drawer-no-backdrop',
    family: 'Drawer',
    title: 'No backdrop (inspector)',
    description:
      'backdrop=false keeps the page interactive while the drawer is open — the inspector/utility panel pattern. Trigger is a toggle, not an "Open" button.',
    Component: NoBackdropDrawer,
  },
  {
    key: 'drawer-styled',
    family: 'Drawer',
    title: 'Styled surface',
    description: 'Custom surface and backdrop slot styles.',
    Component: StyledDrawer,
    smokeText: 'Custom surface and backdrop styles.',
  },

  // ── Popover ───────────────────────────────────────────────────────────
  {
    key: 'popover-basic',
    family: 'Popover',
    title: 'Basic',
    description:
      'Anchored via the HTML Popover API (top layer) on web; a portal into the nearest layer host on native. Trigger toggles.',
    Component: BasicPopover,
  },
  {
    key: 'popover-displacement',
    family: 'Popover',
    title: 'Auto displaces auto',
    description:
      'Opening one popover closes the other — opening an auto displaces other transients.',
    Component: DisplacingPopovers,
  },
  {
    key: 'popover-outside-press',
    family: 'Popover',
    title: 'Outside press dismisses',
    description:
      'A press on the neutral area dismisses the transient (capture-phase pointerdown on web, the DismissUnderlay on native).',
    Component: OutsidePressPopover,
    smokeText: 'Popover panel',
  },
  {
    key: 'popover-placements',
    family: 'Popover',
    title: 'Placements',
    description: 'top / bottom / left / right placement with an 8px offset.',
    Component: PopoverPlacements,
  },
  {
    key: 'popover-non-dismissable',
    family: 'Popover',
    title: 'Non-dismissable',
    description:
      'Refuses escape/outside-press; only its own Close button dismisses.',
    Component: NonDismissablePopover,
    smokeText: 'Close me',
  },
  {
    key: 'popover-close-on-scroll',
    family: 'Popover',
    title: 'closeOnScroll (default)',
    description:
      'Page scroll dismisses. Web listens to real scroll events; native polls the anchor for drift — scroll the containing screen to see it.',
    Component: CloseOnScrollPopover,
  },
  {
    key: 'popover-pinned',
    family: 'Popover',
    title: 'closeOnScroll={false} — pinned to the anchor',
    description:
      'Page scroll keeps it open. On web this is the gate for the CSS Anchor Positioning engine: the browser tracks the anchor; elsewhere Floating UI keeps updating it.',
    Component: PinnedPopover,
    smokeText: 'Pinned panel',
  },
  {
    key: 'popover-scroll-inside',
    family: 'Popover',
    title: 'Scroll inside the panel',
    description:
      "closeOnScroll's exemption: scrolling content INSIDE the popover's own panel never dismisses — only scrolls that move the anchor do.",
    Component: ScrollInsidePopover,
    smokeText: 'must not dismiss the popover',
  },
  {
    key: 'popover-forced-displacement',
    family: 'Popover',
    title: 'Displacement vs non-dismissable vs veto',
    description:
      'Opening a new popover force-displaces a dismissable=false popover (force bypasses dismissability), but an onDismissRequest veto is consulted first and survives displacement.',
    Component: ForcedDisplacementPopovers,
    smokeText: 'Sticky panel: displacement still force-closes me',
  },

  // ── Tooltip ───────────────────────────────────────────────────────────
  {
    key: 'tooltip-hover-focus',
    family: 'Tooltip',
    title: 'Hover and focus',
    description:
      'Hover/focus are web gestures; on native the trigger is tap-to-toggle.',
    Component: HoverFocusTooltip,
  },
  {
    key: 'tooltip-escape',
    family: 'Tooltip',
    title: 'Escape dismisses (WCAG 1.4.13)',
    description:
      'Escape must dismiss hover content without moving the pointer — a web keyboard behavior; native hints never eat Android back.',
    Component: EscapeDismissesTooltip,
  },
  {
    key: 'tooltip-hint-vs-auto',
    family: 'Tooltip',
    title: 'Hint never displaces auto',
    description:
      'Open the popover, then show the tooltip: hovering (web) or tapping (native) a hint must not close a deliberately opened popover.',
    Component: HintDoesNotDisplaceAuto,
  },
  {
    key: 'tooltip-timing',
    family: 'Tooltip',
    title: 'Hover intent timing',
    description:
      'Web-only timing: the first hover waits the intent delay; while the host is warm a sibling tooltip opens instantly. Native stays tap-to-toggle.',
    Component: TooltipTimingPair,
  },
  {
    key: 'tooltip-boundary',
    family: 'Tooltip',
    title: 'With boundary',
    description:
      'boundaryRef: the tooltip flips/shifts to stay inside the bordered box instead of the window.',
    Component: BoundedTooltip,
  },
  {
    key: 'tooltip-render-prop',
    family: 'Tooltip',
    title: 'Render-prop trigger',
    description:
      'The render-prop form passes trigger props to your own element.',
    Component: RenderPropTooltip,
  },

  // ── Stacking & nesting ────────────────────────────────────────────────
  {
    key: 'stacking-popover-in-dialog',
    family: 'Stacking',
    title: 'Popover inside dialog',
    description:
      'Escape closes the popover first; a press inside the dialog closes the popover but not the dialog (parentEntryId spares ancestors).',
    Component: PopoverInDialog,
    smokeText: 'Dialog with a popover',
  },
  {
    key: 'stacking-dialog-above-drawer',
    family: 'Stacking',
    title: 'Dialog above drawer',
    description:
      'Escape unwinds one modal layer at a time, top-down: dialog first, then the drawer.',
    Component: DialogFromDrawer,
    smokeText: 'Drawer layer',
  },
  {
    key: 'stacking-tooltip-in-sheet',
    family: 'Stacking',
    title: 'Tooltip inside sheet',
    description:
      "On native the tooltip portals into the sheet's own layer host, so it paints above the sheet surface instead of underneath it.",
    Component: TooltipInSheet,
    smokeText: 'Deposit terms',
  },
  {
    key: 'stacking-kitchen-sink',
    family: 'Stacking',
    title: 'Kitchen sink: dialog → popover → tooltip',
    description:
      'Three layers deep; escape (web) / back (native) unwinds one layer at a time: tooltip → popover → dialog.',
    Component: KitchenSink,
    smokeText: 'Three layers deep',
  },
]

export * from './dialog'
export * from './drawer'
export * from './popover'
export * from './sheet'
export * from './stacking'
export * from './tooltip'
export { Button, Filler, Paragraph } from './helpers'
