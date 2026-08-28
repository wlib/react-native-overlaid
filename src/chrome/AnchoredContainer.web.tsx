'use client'

// WEB AnchoredContainer.
// Interprets: mounted state -> Popover API top layer (or a portal fallback),
// anchored style -> viewport placement, phase -> opacity.
// Reports: real browser toggle state and first positioned layout.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { OverlayRole } from '../core/types'
import { flattenToCss } from '../react/flattenStyle'
import {
  useAnchoredOverlayContext,
  type CrossPlatformStyle,
} from '../react/overlayContext'
import { OVERLAY_ROOT_ID } from '../react/OverlayHost.web'

const SUPPORTS_POPOVER =
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.showPopover === 'function' &&
  typeof HTMLElement.prototype.hidePopover === 'function'

function isPopoverOpen(element: HTMLElement) {
  try {
    return element.matches(':popover-open')
  } catch {
    return false
  }
}

export type AnchoredContainerProps = {
  children: ReactNode
  className?: string
  style?: CrossPlatformStyle
  role?: OverlayRole
  accessibilityLabel?: string
  /** Web portals preserve source context without an explicit bridge. */
  contextBridge?: unknown
}

export function AnchoredContainer({
  children,
  className,
  style,
  role,
  accessibilityLabel,
}: AnchoredContainerProps) {
  const context = useAnchoredOverlayContext()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const readyReported = useRef(false)
  const { state, signals, actions, panelId, refs, behavior, anchored, exitMs } =
    context

  const composeRef = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node
      refs.surface(node)
    },
    [refs],
  )

  useLayoutEffect(() => {
    if (!SUPPORTS_POPOVER && state.isMounted) signals.onHostShown()
  }, [signals, state.isMounted])

  useEffect(() => {
    if (!state.isMounted) readyReported.current = false
  }, [state.isMounted])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !SUPPORTS_POPOVER) return
    try {
      if (state.isMounted && !isPopoverOpen(element)) element.showPopover()
      else if (!state.isMounted && isPopoverOpen(element)) element.hidePopover()
    } catch {
      // Browser light-dismiss and StrictMode can race this effect. The
      // toggle listener below is the source of truth after the operation.
    }
  }, [state.isMounted])

  // Close while still connected, then restore focus if it remained inside.
  useLayoutEffect(() => {
    const element = elementRef.current
    return () => {
      if (!element || typeof document === 'undefined') return
      const focusWasInside =
        document.activeElement instanceof Element &&
        element.contains(document.activeElement)
      if (SUPPORTS_POPOVER && isPopoverOpen(element)) {
        try {
          element.hidePopover()
        } catch {
          // It was already removed from the top layer.
        }
      }
      if (focusWasInside) {
        const trigger = refs.trigger.current
        if (trigger instanceof HTMLElement) trigger.focus()
      }
    }
  }, [refs.trigger])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !SUPPORTS_POPOVER) return

    const onToggle = (event: Event) => {
      const next = (event as ToggleEvent).newState
      if (next === 'open') {
        signals.onHostShown()
        return
      }
      // StrictMode and browser task coalescing can deliver a queued close
      // toggle after a later show has already won.
      if (isPopoverOpen(element)) return
      if (!state.isOpen) return

      // Browser-initiated close must be reconciled with the kernel. If the
      // kernel refuses, restore the platform surface it still owns.
      const dismissed = actions.requestDismiss('escape')
      if (!dismissed && element.isConnected) {
        try {
          element.showPopover()
        } catch {
          // Removal or another top-layer operation won the race.
        }
      }
    }
    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [actions, signals, state.isOpen])

  useEffect(() => {
    if (readyReported.current || !state.isMounted || !anchored.isPositioned) {
      return
    }
    readyReported.current = true
    signals.onLayoutReady()
  }, [anchored.isPositioned, signals, state.isMounted])

  const reveal: CSSProperties = {
    opacity: state.isPresented ? 1 : 0,
    transition: `opacity ${exitMs}ms ease`,
  }
  const panel = (
    <div
      ref={composeRef}
      id={panelId}
      data-overlaid-popover=""
      data-overlaid-reveal=""
      role={role}
      aria-label={accessibilityLabel}
      className={className}
      style={{
        ...(!SUPPORTS_POPOVER ? { zIndex: 9999 } : undefined),
        ...(anchored.panelStyle as CSSProperties),
        ...reveal,
        ...flattenToCss(style),
      }}
      {...(SUPPORTS_POPOVER
        ? { popover: behavior === 'hint' ? 'hint' : 'manual' }
        : {})}
    >
      {children}
    </div>
  )

  if (SUPPORTS_POPOVER) return panel
  if (!state.isMounted || typeof document === 'undefined') return null

  const target = document.getElementById(OVERLAY_ROOT_ID)
  if (!target) return null

  return createPortal(panel, target)
}
