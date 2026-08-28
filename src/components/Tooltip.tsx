import {
  useCallback,
  useEffect,
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
import { hasWebCapability } from '../chrome/webCapabilities'
import type { Placement } from '../react/anchoredPosition'
import type { ContextBridge } from '../react/contextBridge'
import { useOptionalLayerHost } from '../react/LayerHostContext'
import {
  OverlayProvider,
  type OverlayInsets,
  type TriggerA11yProps,
} from '../react/overlayContext'
import {
  isInterestCapableTrigger,
  readTooltipTimingTokens,
} from '../react/tooltipTiming'
import { useAnchorScrollDismiss } from '../react/useAnchorScrollDismiss'
import { useHoverIntent, type HoverIntentConfig } from '../react/useHoverIntent'
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
const HOVER_OPEN_DELAY_MS = 400
const HOVER_WARMTH_MS = 700

/**
 * Web-only hover intent timing. Focus-open and touch/pen-toggle stay
 * instant regardless — keyboard users already paid the traversal cost,
 * and a tap is explicit intent. On web, an unset member falls back to the
 * `--overlaid-tooltip-delay`/`-warmth` CSS tokens on the trigger (read at
 * first hover, cached per element) before the built-in default.
 */
export type TooltipTiming = {
  /** ms of hover before opening; `false` = open immediately. Default 400. */
  delay?: number | false | undefined
  /**
   * ms after any tooltip in this OverlayHost closes during which hover
   * opens instantly; `false` disables. Default 700.
   */
  warmth?: number | false | undefined
}

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
  timing?: TooltipTiming | undefined
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
  timing,
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
  const host = useOptionalLayerHost()

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
      closeOnScroll,
      ...(boundaryRef !== undefined ? { boundaryRef } : {}),
    },
  )
  const isWeb = Platform.OS === 'web'
  useTriggerRegistration(context.id, context.refs.trigger, toggleOpen, 'hint')

  // The hover intent engine owns web mouse timing: first hover in a host
  // waits `delay`, hovers while the host is warm open instantly, and
  // leaving grants a close grace. Native stays tap-to-toggle; the timers
  // simply never start there. Config resolves per intent action (a thunk),
  // so the CSS timing tokens on the trigger — unreadable before first
  // hover — still beat the built-in defaults; explicit props beat both.
  const timingDelay = timing?.delay
  const timingWarmth = timing?.warmth
  const triggerRef = context.refs.trigger
  const resolveIntentConfig = useCallback((): HoverIntentConfig => {
    const tokens = isWeb ? readTooltipTimingTokens(triggerRef.current) : null
    return {
      delayMs: timingDelay ?? tokens?.delayMs ?? HOVER_OPEN_DELAY_MS,
      warmthMs: timingWarmth ?? tokens?.warmthMs ?? HOVER_WARMTH_MS,
      closeGraceMs: HOVER_CLOSE_GRACE_MS,
    }
  }, [isWeb, timingDelay, timingWarmth, triggerRef])
  const intent = useHoverIntent(
    host,
    context.state.isOpen,
    resolveIntentConfig,
    {
      onOpen: () => setOpen(true),
      onClose: () => setOpen(false),
    },
  )

  // Where the platform has its own interest timer CSS, forward the timing
  // onto qualifying triggers as real interest-delay values: inert until an
  // interest invoker relationship exists, but any that does (a render-prop
  // <button>/<a> a consumer wires up) runs on the same source of truth. A
  // prop forwards as a literal; otherwise the token var() forwards so the
  // platform resolves it itself.
  useEffect(() => {
    if (!isWeb || !hasWebCapability('interestDelayCss')) return
    const trigger = triggerRef.current
    if (!isInterestCapableTrigger(trigger)) return
    const element = trigger as Element & ElementCSSInlineStyle
    const start =
      timingDelay === false
        ? '0s'
        : timingDelay !== undefined
          ? `${timingDelay}ms`
          : `var(--overlaid-tooltip-delay, ${HOVER_OPEN_DELAY_MS}ms)`
    element.style.setProperty('interest-delay-start', start)
    element.style.setProperty('interest-delay-end', `${HOVER_CLOSE_GRACE_MS}ms`)
    return () => {
      element.style.removeProperty('interest-delay-start')
      element.style.removeProperty('interest-delay-end')
    }
  }, [isWeb, timingDelay, triggerRef])

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
    const onEnter = () => intent.pointerEnter()
    const onLeave = () => intent.pointerLeave()
    node.addEventListener('pointerenter', onEnter)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointerenter', onEnter)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [intent, isOpen, isWeb, panelRef])

  // WCAG 1.4.13: Escape must also clear a *pending* delayed open. A not-yet-
  // visible tooltip is not in the layer stack, so the kernel cannot route
  // this — cancel directly at the document.
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') intent.cancel()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [intent, isWeb])

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
            intent.pointerEnter()
          },
          onPointerLeave: (event: NativePointerEvent) => {
            const pointerType = event.nativeEvent.pointerType
            if (!pointerType || pointerType === 'mouse') intent.pointerLeave()
          },
          onFocus: () => intent.focus(),
          onBlur: () => intent.blur(),
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
          unstyled={unstyled}
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
