import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { AnchoredContainer } from '../chrome/AnchoredContainer'
import type { DismissEvent } from '../core/types'
import type { Placement } from '../react/anchoredPosition'
import type { ContextBridge } from '../react/contextBridge'
import {
  OverlayProvider,
  useOverlayContext,
  type OverlayInsets,
  type SlotOverride,
} from '../react/overlayContext'
import { useAnchorScrollDismiss } from '../react/useAnchorScrollDismiss'
import { useControllableState } from '../react/useControllableState'
import { useAnchoredOverlayRoot } from '../react/useOverlayRoot'
import * as defaults from './defaultStyles'
import { warnOnce } from './diagnostics'
import { OverlayTrigger } from './parts'

type PopoverRootConfig = {
  contextBridge: ContextBridge | undefined
  accessibilityLabel: string | undefined
}
const PopoverRootContext = createContext<PopoverRootConfig>({
  contextBridge: undefined,
  accessibilityLabel: undefined,
})

export type PopoverContentRenderProps = {
  close: () => void
}

export type PopoverProps = {
  /** Controlled state; omit it to let Trigger own state internally. */
  open?: boolean | undefined
  onOpenChange?: ((next: boolean) => void) | undefined
  placement?: Placement | undefined
  offset?: number | undefined
  dismissable?: boolean | undefined
  onDismissRequest?: ((event: DismissEvent) => boolean | void) | undefined
  accessibilityLabel?: string | undefined
  closeOnScroll?: boolean | undefined
  contextBridge?: ContextBridge | undefined
  insets?: OverlayInsets | undefined
  children: ReactNode
}

function PopoverRoot({
  open: controlledOpen,
  onOpenChange,
  placement = 'bottom-start',
  offset = 4,
  dismissable = true,
  onDismissRequest,
  accessibilityLabel,
  closeOnScroll = true,
  contextBridge,
  insets,
  children,
}: PopoverProps) {
  if (!Number.isFinite(offset)) {
    warnOnce(`Popover offset must be finite; received ${String(offset)}.`)
  }
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    ...(controlledOpen !== undefined ? { value: controlledOpen } : {}),
    ...(onOpenChange !== undefined ? { onChange: onOpenChange } : {}),
  })
  const context = useAnchoredOverlayRoot(
    {
      kind: 'popover',
      behavior: 'auto',
      role: 'dialog',
      exitMs: 120,
      open,
      onOpenChange: setOpen,
      dismissable,
      onDismissRequest,
      label: accessibilityLabel,
      insets,
    },
    { placement, offset },
  )
  const onScrollDismiss = useCallback(() => {
    context.actions.requestDismiss('scroll')
  }, [context.actions])

  useAnchorScrollDismiss({
    enabled: closeOnScroll && context.state.isOpen,
    armed: Platform.OS === 'web' ? true : !!context.anchored?.isPositioned,
    triggerRef: context.refs.trigger as RefObject<unknown>,
    panelRef: context.refs.panel as RefObject<unknown>,
    onDismiss: onScrollDismiss,
  })

  return (
    <OverlayProvider value={context}>
      <PopoverRootContext.Provider
        value={{ contextBridge, accessibilityLabel }}
      >
        {children}
      </PopoverRootContext.Provider>
    </OverlayProvider>
  )
}

export type PopoverContentProps = {
  children: ReactNode | ((props: PopoverContentRenderProps) => ReactNode)
  unstyled?: boolean | undefined
  className?: string | undefined
  style?: SlotOverride['style'] | undefined
}

function PopoverContent({
  children,
  unstyled = false,
  className,
  style,
}: PopoverContentProps) {
  const context = useOverlayContext()
  const { contextBridge, accessibilityLabel } = useContext(PopoverRootContext)
  if (!context.state.isMounted) return null

  return (
    <AnchoredContainer
      {...(className !== undefined ? { className } : {})}
      unstyled={unstyled}
      style={[
        unstyled ? undefined : defaults.popoverSurface,
        style as StyleProp<ViewStyle>,
      ]}
      role={context.role}
      {...(accessibilityLabel !== undefined ? { accessibilityLabel } : {})}
      {...(contextBridge !== undefined ? { contextBridge } : {})}
    >
      {typeof children === 'function'
        ? children({ close: context.actions.requestClose })
        : children}
    </AnchoredContainer>
  )
}

function PopoverImpl(props: PopoverProps) {
  return <PopoverRoot {...props} />
}

export const Popover = Object.assign(PopoverImpl, {
  Root: PopoverRoot,
  Trigger: OverlayTrigger,
  Content: PopoverContent,
})
