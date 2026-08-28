import {
  createElement,
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
import { useAnchorScrollDismiss } from '../react/useAnchorScrollDismiss'
import { useHoverIntent } from '../react/useHoverIntent'
import { useAnchoredOverlayRoot } from '../react/useOverlayRoot'
import { useTriggerRegistration } from '../react/useTriggerRegistration'
import * as defaults from './defaultStyles'
import { warnOnce } from './diagnostics'
import { resolveWebPositioning, type TooltipWebOptions } from './webOptions'

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
 * and a tap is explicit intent.
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
  /** Web-only escape hatches; ignored on native. See {@link TooltipWebOptions}. */
  web?: TooltipWebOptions | undefined
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
  web,
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

  const positioning = resolveWebPositioning(
    'Tooltip',
    web?.positioning,
    boundaryRef !== undefined,
  )
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
      ...(positioning !== undefined ? { positioning } : {}),
    },
  )
  const isWeb = Platform.OS === 'web'
  useTriggerRegistration(context.id, context.refs.trigger, toggleOpen, 'hint')

  // web.intent='interest': Interest Invokers become the input source when
  // the browser ships them AND the trigger is a real <button>/<a>/<area> —
  // the interestfor attribute is invalid elsewhere. interest/loseinterest
  // are cancelable proposals (channel type a): cancel the browser's default
  // and drive the kernel instead, so arbitration, dismissal, and warmth
  // accounting stay unified. The JS hover-intent inputs stand down while
  // this channel is active (R1: one channel per gesture).
  const wantsInterest = isWeb && web?.intent === 'interest'
  const [interestActive, setInterestActive] = useState(false)
  const triggerRef = context.refs.trigger
  const tooltipPanelId = context.panelId
  const onInterestEvent = useCallback((event: Event) => {
    if (event.cancelable) event.preventDefault()
    setOpen(event.type === 'interest')
  }, [])

  useEffect(() => {
    if (!wantsInterest) return
    if (!hasWebCapability('interestFor')) {
      warnOnce(
        "Tooltip web.intent='interest' is unavailable in this browser " +
          "(missing 'interestFor' support). Using the JS hover-intent engine.",
      )
      return
    }
    const trigger = triggerRef.current
    const eligible =
      (typeof HTMLButtonElement !== 'undefined' &&
        trigger instanceof HTMLButtonElement) ||
      (typeof HTMLAnchorElement !== 'undefined' &&
        trigger instanceof HTMLAnchorElement) ||
      (typeof HTMLAreaElement !== 'undefined' &&
        trigger instanceof HTMLAreaElement)
    if (!eligible) {
      warnOnce(
        "Tooltip web.intent='interest' requires the render-prop trigger to " +
          'be a real <button>, <a href>, or <area>. Using the JS ' +
          'hover-intent engine.',
      )
      return
    }
    trigger.setAttribute('interestfor', tooltipPanelId)
    setInterestActive(true)
    trigger.addEventListener('interest', onInterestEvent)
    trigger.addEventListener('loseinterest', onInterestEvent)
    return () => {
      trigger.removeEventListener('interest', onInterestEvent)
      trigger.removeEventListener('loseinterest', onInterestEvent)
      trigger.removeAttribute('interestfor')
      setInterestActive(false)
    }
  }, [onInterestEvent, tooltipPanelId, triggerRef, wantsInterest])

  // The events are non-bubbling and may be fired at the interest target, so
  // listen there too. interestfor requires the target to pre-exist in the
  // DOM, which conflicts with mount-on-open — while the panel is unmounted
  // a hidden placeholder (below) carries the id.
  const interestTargetMounted = interestActive && context.state.isMounted
  useEffect(() => {
    if (!interestActive || typeof document === 'undefined') return
    const target = document.getElementById(tooltipPanelId)
    if (!target) return
    target.addEventListener('interest', onInterestEvent)
    target.addEventListener('loseinterest', onInterestEvent)
    return () => {
      target.removeEventListener('interest', onInterestEvent)
      target.removeEventListener('loseinterest', onInterestEvent)
    }
  }, [interestActive, interestTargetMounted, onInterestEvent, tooltipPanelId])

  // The hover intent engine owns web mouse timing: first hover in a host
  // waits `delay`, hovers while the host is warm open instantly, and
  // leaving grants a close grace. Native stays tap-to-toggle; the timers
  // simply never start there.
  const intent = useHoverIntent(
    host,
    context.state.isOpen,
    {
      delayMs: timing?.delay ?? HOVER_OPEN_DELAY_MS,
      warmthMs: timing?.warmth ?? HOVER_WARMTH_MS,
      closeGraceMs: HOVER_CLOSE_GRACE_MS,
    },
    {
      onOpen: () => setOpen(true),
      onClose: () => setOpen(false),
    },
  )

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
    // In interest mode the browser sustains interest while the target is
    // hovered; the JS grace-window listeners stand down.
    if (!isWeb || !isOpen || interestActive) return
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
  }, [intent, interestActive, isOpen, isWeb, panelRef])

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
    ...(isWeb && interestActive
      ? // The browser owns hover/focus/touch intent through the interest
        // invoker; the JS inputs stand down entirely.
        {}
      : isWeb
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
      ) : interestActive ? (
        // interestfor requires its IDREF target to exist before the panel
        // mounts; this inert placeholder carries the id (and receives any
        // target-fired InterestEvents) until the real panel takes it over.
        createElement('span', {
          id: tooltipPanelId,
          hidden: true,
          'data-overlaid-interest-target': '',
        })
      ) : null}
    </OverlayProvider>
  )
}

const triggerHugStyle: ViewStyle = { alignSelf: 'flex-start' }
