import * as api from '../../index'
import type {
  DialogProps,
  DrawerProps,
  ModalWebOptions,
  OverlayLayout,
  PopoverProps,
  PopoverWebOptions,
  SheetProps,
  TooltipProps,
  TooltipTriggerProps,
  TooltipWebOptions,
} from '../../index'

describe('public entry point', () => {
  it('exports the deliberate runtime surface and no implementation-only helpers', () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        'BEHAVIOR',
        'Dialog',
        'Drawer',
        'LayerHostProvider',
        'MAX_DETENTS',
        'OverlayClose',
        'OverlayHost',
        'OverlayProvider',
        'OverlayTrigger',
        'PRESENT_GATES',
        'Popover',
        'Portal',
        'PortalHost',
        'PortalScope',
        'ROOT_HOST_NAME',
        'Sheet',
        'Tooltip',
        'UNMOUNTED',
        'USER_DISMISS_EVENTS',
        'canPresent',
        'clampDetentIndex',
        'createLayerHost',
        'decideDismissRequest',
        'deepestAttachedDescendant',
        'isAncestorOf',
        'normalizeDetents',
        'orderDetents',
        'planBackButton',
        'planEscape',
        'planOutsidePress',
        'planTransientDisplacement',
        'reduceLifecycle',
        'reduceSheetHost',
        'resolveDetentHeight',
        'resolveNativeSheet',
        'useAnchoredOverlayContext',
        'useAnchoredOverlayRoot',
        'useContextBridge',
        'useHostOffset',
        'useLayerHost',
        'useLayerStack',
        'useOptionalLayerHost',
        'useOptionalOverlayContext',
        'useOverlayContext',
        'useOverlayRoot',
      ].sort(),
    )
  })

  it('keeps representative consumer props precise and interoperable', () => {
    const change = (_next: boolean) => undefined
    const children = 'content'
    const layout = {
      width: '90%',
      maxWidth: 560,
      horizontalPadding: 16,
    } satisfies OverlayLayout
    const dialog = {
      open: true,
      onOpenChange: change,
      title: 'Title',
      layout,
      children,
    } satisfies DialogProps
    const drawer = {
      open: true,
      onOpenChange: change,
      side: 'left',
      children,
    } satisfies DrawerProps
    const sheet = {
      open: true,
      onOpenChange: change,
      detents: ['content', '66%', 'full'],
      children,
    } satisfies SheetProps
    const popover = {
      placement: 'bottom-start',
      children,
    } satisfies PopoverProps
    const tooltip = {
      text: 'Hint',
      boundaryRef: { current: null },
      children: (_props: TooltipTriggerProps) => null as never,
    } satisfies TooltipProps
    const richTooltip = {
      content: 'Rich hint',
      accessibilityLabel: 'Rich hint',
      children: (_props: TooltipTriggerProps) => null as never,
    } satisfies TooltipProps

    // @ts-expect-error Tooltip content cannot be omitted.
    const emptyTooltip: TooltipProps = { children: null as never }
    // @ts-expect-error Rich-only tooltips need a native accessibility label.
    const inaccessibleTooltip: TooltipProps = {
      content: 'Rich hint',
      children: null as never,
    }

    expect([
      dialog,
      drawer,
      sheet,
      popover,
      tooltip,
      richTooltip,
      emptyTooltip,
      inaccessibleTooltip,
    ]).toHaveLength(8)
  })

  it('keeps the web escape-hatch namespaces typed per family', () => {
    const change = (_next: boolean) => undefined
    const children = 'content'
    const popover = {
      web: { dismissal: 'browser', positioning: 'css-anchor' },
      children,
    } satisfies PopoverProps
    const tooltip = {
      text: 'Hint',
      web: { intent: 'interest', positioning: 'floating' },
      children: (_props: TooltipTriggerProps) => null as never,
    } satisfies TooltipProps
    const dialog = {
      open: true,
      onOpenChange: change,
      title: 'Title',
      web: { dismissal: 'closedby' },
      children,
    } satisfies DialogProps
    const drawer = {
      open: true,
      onOpenChange: change,
      web: { dismissal: 'managed' },
      children,
    } satisfies DrawerProps
    const sheet = {
      open: true,
      onOpenChange: change,
      web: { dismissal: 'closedby' },
      children,
    } satisfies SheetProps

    // @ts-expect-error 'closedby' is a modal option, not a popover one.
    const invalidPopover: PopoverWebOptions = { dismissal: 'closedby' }
    // @ts-expect-error 'browser' is a popover option, not a modal one.
    const invalidModal: ModalWebOptions = { dismissal: 'browser' }
    // @ts-expect-error tooltips have no dismissal delegation at all.
    const invalidTooltip: TooltipWebOptions = { dismissal: 'browser' }
    // @ts-expect-error intent is a tooltip option only.
    const invalidIntent: PopoverWebOptions = { intent: 'interest' }

    expect([
      popover,
      tooltip,
      dialog,
      drawer,
      sheet,
      invalidPopover,
      invalidModal,
      invalidTooltip,
      invalidIntent,
    ]).toHaveLength(9)
  })
})
