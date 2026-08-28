import * as api from '../../index'
import type {
  DialogProps,
  DrawerProps,
  OverlayLayout,
  PopoverProps,
  SheetProps,
  TooltipProps,
  TooltipTriggerProps,
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
})
