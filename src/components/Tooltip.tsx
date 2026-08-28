import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from 'react'
import {
  Platform,
  Pressable,
  Text,
  type PointerEvent as NativePointerEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { AnchoredContainer } from '../chrome/AnchoredContainer'
import type { Placement } from '../react/anchoredPosition'
import type { ContextBridge } from '../react/contextBridge'
import {
  OverlayProvider,
  type OverlayInsets,
  type TriggerA11yProps,
} from '../react/overlayContext'
import { useAnchorScrollDismiss } from '../react/useAnchorScrollDismiss'
import { useAnchoredOverlayRoot } from '../react/useOverlayRoot'
import { useTriggerRegistration } from '../react/useTriggerRegistration'
import * as defaults from './defaultStyles'
import { warnOnce } from './diagnostics'

export type TooltipTriggerProps = TriggerA11yProps & {
  ref: RefCallback<unknown>
  onPress?: NonNullable<PressableProps['onPress']> | undefined
  onPointerDown?: NonNullable<PressableProps['onPointerDown']> | undefined
  onPointerEnter?: NonNullable<PressableProps['onPointerEnter']> | undefined
  onPointerLeave?: NonNullable<PressableProps['onPointerLeave']> | undefined
  onFocus?: NonNullable<PressableProps['onFocus']> | undefined
  onBlur?: NonNullable<PressableProps['onBlur']> | undefined
  accessibilityHint?: string | undefined
}

const HOVER_CLOSE_GRACE_MS = 150

type TooltipContentProps =
  | {
      text: string
      content?: ReactNode | undefined
      accessibilityLabel?: string | undefined
    }
  | {
      text?: never
      content: NonNullable<ReactNode>
      accessibilityLabel: string
    }

export type TooltipProps = TooltipContentProps & {
  placement?: Placement | undefined
  unstyled?: boolean | undefined
  surfaceStyle?: StyleProp<ViewStyle> | undefined
  textStyle?: StyleProp<TextStyle> | undefined
  boundaryRef?: RefObject<unknown> | undefined
  closeOnScroll?: boolean | undefined
  contextBridge?: ContextBridge | undefined
  insets?: OverlayInsets | undefined
  children: ReactElement | ((props: TooltipTriggerProps) => ReactElement)
}

export function Tooltip({
  text,
  content,
  accessibilityLabel,
  placement = 'top',
  unstyled = false,
  surfaceStyle,
  textStyle,
  boundaryRef,
  closeOnScroll = true,
  contextBridge,
  insets,
  children,
}: TooltipProps) {
  if (
    content !== undefined &&
    text === undefined &&
    accessibilityLabel === undefined
  ) {
    warnOnce(
      'Tooltip with rich content and no text or accessibilityLabel exposes ' +
        'no native accessibility hint. Provide one of those props.',
    )
  }

  const [open, setOpen] = useState(false)
  const toggleOpen = useCallback(() => setOpen((current) => !current), [])
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelScheduledClose = useCallback(() => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])
  const scheduleClose = useCallback(() => {
    cancelScheduledClose()
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setOpen(false)
    }, HOVER_CLOSE_GRACE_MS)
  }, [cancelScheduledClose])
  useEffect(() => cancelScheduledClose, [cancelScheduledClose])

  const context = useAnchoredOverlayRoot(
    {
      kind: 'tooltip',
      behavior: 'hint',
      role: 'tooltip',
      exitMs: 80,
      open,
      onOpenChange: setOpen,
      dismissable: true,
      insets,
    },
    {
      placement,
      ...(boundaryRef !== undefined ? { boundaryRef } : {}),
    },
  )
  const isWeb = Platform.OS === 'web'
  useTriggerRegistration(context.id, context.refs.trigger, toggleOpen, 'hint')

  const onScrollDismiss = useCallback(() => {
    context.actions.requestDismiss('scroll')
  }, [context.actions])
  useAnchorScrollDismiss({
    enabled: closeOnScroll && context.state.isOpen,
    armed: isWeb ? true : !!context.anchored?.isPositioned,
    triggerRef: context.refs.trigger as RefObject<unknown>,
    onDismiss: onScrollDismiss,
  })

  const isOpen = context.state.isOpen
  const panelRef = context.refs.panel
  useEffect(() => {
    if (!isWeb || !isOpen) return
    const node = panelRef.current as HTMLElement | null
    if (!node || typeof node.addEventListener !== 'function') return
    const onEnter = () => cancelScheduledClose()
    const onLeave = () => scheduleClose()
    node.addEventListener('pointerenter', onEnter)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointerenter', onEnter)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [cancelScheduledClose, isOpen, isWeb, panelRef, scheduleClose])

  const triggerProps: TooltipTriggerProps = {
    ...(isWeb
      ? {
          onPointerDown: (event: NativePointerEvent) => {
            const pointerType = event.nativeEvent.pointerType
            if (pointerType && pointerType !== 'mouse') toggleOpen()
          },
          onPointerEnter: (event: NativePointerEvent) => {
            const pointerType = event.nativeEvent.pointerType
            if (pointerType && pointerType !== 'mouse') return
            cancelScheduledClose()
            setOpen(true)
          },
          onPointerLeave: (event: NativePointerEvent) => {
            const pointerType = event.nativeEvent.pointerType
            if (!pointerType || pointerType === 'mouse') scheduleClose()
          },
          onFocus: () => setOpen(true),
          onBlur: () => setOpen(false),
        }
      : {
          onPress: toggleOpen,
          ...((text ?? accessibilityLabel)
            ? { accessibilityHint: text ?? accessibilityLabel }
            : {}),
        }),
    ...context.a11y.trigger,
    ref: context.refs.anchor,
  }

  return (
    <OverlayProvider value={context}>
      {typeof children === 'function' ? (
        children(triggerProps)
      ) : (
        // alignSelf keeps the wrapper hugging its child: in a stretch-
        // aligned column the Pressable would otherwise span the full row
        // and become the anchor rect, floating the tooltip far from the
        // visible trigger. Render-prop consumers own their element.
        <Pressable style={triggerHugStyle} {...triggerProps}>
          {children}
        </Pressable>
      )}
      {context.state.isMounted ? (
        <AnchoredContainer
          style={[
            unstyled ? undefined : defaults.tooltipSurface,
            isWeb ? undefined : ({ pointerEvents: 'none' } as ViewStyle),
            surfaceStyle,
          ]}
          role="tooltip"
          {...(content !== undefined && accessibilityLabel !== undefined
            ? { accessibilityLabel }
            : {})}
          {...(contextBridge !== undefined ? { contextBridge } : {})}
        >
          {content ?? (
            <Text style={[defaults.tooltipText, textStyle]}>{text}</Text>
          )}
        </AnchoredContainer>
      ) : null}
    </OverlayProvider>
  )
}

const triggerHugStyle: ViewStyle = { alignSelf: 'flex-start' }
