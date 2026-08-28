import { useMemo } from 'react'
import { Platform } from 'react-native'
import type {
  Behavior,
  DismissEvent,
  OverlayKind,
  OverlayRole,
  PresentGate,
} from '../core/types'
import { assertNever } from '../core/types'
import type { AnchoredPosition, AnchoredSpec } from './anchoredPosition'
import { composeRefs } from './composeRefs'
import {
  useOptionalOverlayContext,
  type HostA11yProps,
  type OverlayContextValue,
  type OverlayInsets,
  type OverlayLayout,
  type SurfaceA11yProps,
  type TriggerA11yProps,
} from './overlayContext'
import { useAnchoredPosition } from './useAnchoredPosition'
import { useOverlayLifecycle } from './useOverlayLifecycle'

export type OverlaySpec = {
  kind: OverlayKind
  behavior: Behavior
  role: OverlayRole
  exitMs: number
  open: boolean
  onOpenChange: (next: boolean) => void
  dismissable?: boolean | undefined
  onDismissRequest?: ((event: DismissEvent) => boolean | void) | undefined
  layout?: OverlayLayout | undefined
  insets?: OverlayInsets | undefined
  /** Accessible name when there is no visible title. */
  label?: string | undefined
  presentGates?: ReadonlyArray<PresentGate> | undefined
  labelled?:
    | { title?: boolean | undefined; description?: boolean | undefined }
    | undefined
}

type Lifecycle = ReturnType<typeof useOverlayLifecycle>

function useOverlayBase(spec: OverlaySpec) {
  const parent = useOptionalOverlayContext()
  const lifecycle = useOverlayLifecycle({
    open: spec.open,
    onOpenChange: spec.onOpenChange,
    kind: spec.kind,
    behavior: spec.behavior,
    dismissable: spec.dismissable ?? true,
    onDismissRequest: spec.onDismissRequest,
    exitMs: spec.exitMs,
    presentGates: spec.presentGates,
    parentEntryId: parent?.id ?? null,
  })
  const anchor = useMemo(
    () => composeRefs(lifecycle.refs.trigger),
    [lifecycle.refs.trigger],
  )
  const surface = useMemo(
    () => composeRefs(lifecycle.refs.panel),
    [lifecycle.refs.panel],
  )
  return { lifecycle, anchor, surface }
}

function useAssembledContext(
  spec: OverlaySpec,
  lifecycle: Lifecycle,
  anchor: ReturnType<typeof composeRefs>,
  surfaceRef: ReturnType<typeof composeRefs>,
  anchored?: AnchoredPosition,
): OverlayContextValue {
  const insetTop = spec.insets?.top
  const insetBottom = spec.insets?.bottom
  const labelledTitle = spec.labelled?.title ?? false
  const labelledDescription = spec.labelled?.description ?? false

  return useMemo(() => {
    const panelId = lifecycle.id
    const titleId = `${lifecycle.id}-title`
    const descriptionId = `${lifecycle.id}-description`
    const isWeb = Platform.OS === 'web'
    const trigger: TriggerA11yProps =
      spec.kind === 'tooltip'
        ? lifecycle.state.isOpen
          ? { 'aria-describedby': panelId }
          : {}
        : {
            'aria-haspopup': 'dialog',
            'aria-expanded': lifecycle.state.isOpen,
            'aria-controls': panelId,
          }

    let surface: SurfaceA11yProps
    switch (spec.kind) {
      case 'dialog':
      case 'drawer':
        surface = isWeb
          ? {}
          : {
              role: 'dialog',
              accessibilityViewIsModal: true,
              accessibilityLabel: spec.label,
            }
        break
      case 'sheet':
        surface = isWeb ? {} : { accessibilityLabel: spec.label }
        break
      case 'popover':
      case 'tooltip':
        surface = {
          role: spec.role,
          id: panelId,
          accessibilityLabel: isWeb ? undefined : spec.label,
        }
        break
      default:
        surface = assertNever(spec.kind)
    }

    const host: HostA11yProps = !isWeb
      ? {}
      : spec.kind === 'dialog'
        ? {
            'aria-labelledby': labelledTitle ? titleId : undefined,
            'aria-describedby': labelledDescription ? descriptionId : undefined,
            'aria-label': spec.label,
          }
        : spec.kind === 'drawer' || spec.kind === 'sheet'
          ? { 'aria-label': spec.label }
          : {}

    return {
      id: lifecycle.id,
      kind: spec.kind,
      behavior: spec.behavior,
      dismissable: spec.dismissable ?? true,
      dismissChannel: lifecycle.dismissChannel,
      role: spec.role,
      panelId,
      titleId,
      descriptionId,
      exitMs: spec.exitMs,
      layout: spec.layout,
      insets:
        insetTop == null && insetBottom == null
          ? undefined
          : { top: insetTop, bottom: insetBottom },
      state: lifecycle.state,
      signals: lifecycle.signals,
      actions: lifecycle.actions,
      refs: {
        anchor: anchored?.refs.anchor ?? anchor,
        surface: anchored?.refs.surface ?? surfaceRef,
        panel: lifecycle.refs.panel,
        trigger: lifecycle.refs.trigger,
        bounds: lifecycle.refs.bounds,
      },
      anchored,
      a11y: { trigger, surface, host },
    }
  }, [
    anchor,
    anchored,
    insetBottom,
    insetTop,
    labelledDescription,
    labelledTitle,
    lifecycle,
    spec.behavior,
    spec.dismissable,
    spec.exitMs,
    spec.kind,
    spec.label,
    spec.layout,
    spec.role,
    surfaceRef,
  ])
}

export function useOverlayRoot(spec: OverlaySpec): OverlayContextValue {
  const base = useOverlayBase(spec)
  return useAssembledContext(spec, base.lifecycle, base.anchor, base.surface)
}

export function useAnchoredOverlayRoot(
  spec: OverlaySpec,
  anchoredSpec: AnchoredSpec,
): OverlayContextValue {
  const base = useOverlayBase(spec)
  const anchored = useAnchoredPosition(
    {
      ...anchoredSpec,
      anchor: base.anchor,
      surface: base.surface,
      insets: spec.insets,
    },
    base.lifecycle.state.isOpen,
    base.lifecycle.state.isMounted,
  )
  return useAssembledContext(
    spec,
    base.lifecycle,
    base.anchor,
    base.surface,
    anchored,
  )
}
