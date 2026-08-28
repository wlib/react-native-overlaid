'use client'

// WEB AnchoredContainer.
// Interprets: mounted state -> Popover API top layer (or a portal fallback),
// anchored style -> viewport placement, phase -> data-overlaid-state (the
// layered stylesheet runs the reveal).
// Reports: real browser toggle state, first positioned layout, and early
// exit completion when the reveal transition finishes.
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
import { sniffDismissCause } from '../react/dismissInputRecord'
import { flattenToCss } from '../react/flattenStyle'
import {
  useAnchoredOverlayContext,
  type CrossPlatformStyle,
} from '../react/overlayContext'
import { OVERLAY_ROOT_ID } from '../react/OverlayHost.web'
import { useExitTransition } from './useExitTransition'
import { hasWebCapability } from './webCapabilities'

function isPopoverOpen(element: HTMLElement) {
  try {
    return element.matches(':popover-open')
  } catch {
    return false
  }
}

/** Implicit anchor, logical focus order, and a11y metadata for free where
 *  supported; engines that predate the options bag ignore unknown members.
 *  (lib.dom still types showPopover as zero-arg, hence the cast.) */
function showPopoverFrom(element: HTMLElement, trigger: unknown): void {
  ;(element.showPopover as (options?: { source?: HTMLElement }) => void)(
    trigger instanceof HTMLElement ? { source: trigger } : undefined,
  )
}

export type AnchoredContainerProps = {
  children: ReactNode
  className?: string
  style?: CrossPlatformStyle
  role?: OverlayRole
  accessibilityLabel?: string
  /** Renders data-overlaid-unstyled so the defaults layer stands down. */
  unstyled?: boolean | undefined
  /** Web portals preserve source context without an explicit bridge. */
  contextBridge?: unknown
}

export function AnchoredContainer({
  children,
  className,
  style,
  role,
  accessibilityLabel,
  unstyled,
}: AnchoredContainerProps) {
  const context = useAnchoredOverlayContext()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const readyReported = useRef(false)
  const {
    state,
    signals,
    actions,
    panelId,
    refs,
    behavior,
    anchored,
    exitMs,
    kind,
    webDismissal,
  } = context
  const supportsPopover = hasWebCapability('popover')
  // Browser-delegated dismissal (web.dismissal='browser'): popover="auto",
  // so the browser owns light dismiss / Escape / its auto stack and this
  // chrome only mirrors outcomes. Resolution already gated on capability
  // and vetolessness (useWebDismissChannel).
  const delegated = webDismissal === 'delegated' && supportsPopover

  const composeRef = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node
      refs.surface(node)
    },
    [refs],
  )

  useExitTransition()

  useLayoutEffect(() => {
    if (!supportsPopover && state.isMounted) signals.onHostShown()
  }, [signals, state.isMounted, supportsPopover])

  useEffect(() => {
    if (!state.isMounted) readyReported.current = false
  }, [state.isMounted])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !supportsPopover) return
    try {
      if (state.isMounted && !isPopoverOpen(element)) {
        showPopoverFrom(element, refs.trigger.current)
      } else if (!state.isMounted && isPopoverOpen(element)) {
        element.hidePopover()
      }
    } catch {
      // Browser light-dismiss and StrictMode can race this effect. The
      // toggle listener below is the source of truth after the operation.
    }
  }, [refs.trigger, state.isMounted, supportsPopover])

  // Close while still connected, then restore focus if it remained inside.
  useLayoutEffect(() => {
    const element = elementRef.current
    return () => {
      if (!element || typeof document === 'undefined') return
      const focusWasInside =
        document.activeElement instanceof Element &&
        element.contains(document.activeElement)
      if (supportsPopover && isPopoverOpen(element)) {
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
  }, [refs.trigger, supportsPopover])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !supportsPopover) return

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

      // Browser-initiated close must be reconciled with the kernel. A
      // delegated instance self-reports the browser's fait accompli with a
      // sniffed cause and can never be refused (it is vetoless by
      // construction), so its re-assert path retires. A managed instance
      // reports 'escape' and, if the kernel refuses, restores the platform
      // surface the kernel still owns.
      const dismissed = actions.requestDismiss(
        delegated ? sniffDismissCause('transient') : 'escape',
      )
      if (!dismissed && !delegated && element.isConnected) {
        try {
          showPopoverFrom(element, refs.trigger.current)
        } catch {
          // Removal or another top-layer operation won the race.
        }
      }
    }
    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [actions, delegated, refs.trigger, signals, state.isOpen, supportsPopover])

  useEffect(() => {
    if (readyReported.current || !state.isMounted || !anchored.isPositioned) {
      return
    }
    readyReported.current = true
    signals.onLayoutReady()
  }, [anchored.isPositioned, signals, state.isMounted])

  const panel = (
    <div
      ref={composeRef}
      id={panelId}
      data-overlaid-popover=""
      data-overlaid-kind={kind}
      data-overlaid-part="surface"
      data-overlaid-state={state.isPresented ? 'open' : 'closed'}
      data-overlaid-phase={state.phase}
      data-overlaid-reveal=""
      {...(unstyled ? { 'data-overlaid-unstyled': '' } : {})}
      {...(anchored.panelProps ?? {})}
      role={role}
      aria-label={accessibilityLabel}
      className={className}
      style={{
        ['--overlaid-duration' as string]: `${exitMs}ms`,
        ...(!supportsPopover ? { zIndex: 9999 } : undefined),
        ...(anchored.panelStyle as CSSProperties),
        ...flattenToCss(style),
      }}
      {...(supportsPopover
        ? {
            popover:
              behavior === 'hint' ? 'hint' : delegated ? 'auto' : 'manual',
          }
        : {})}
    >
      {children}
    </div>
  )

  if (supportsPopover) return panel
  if (!state.isMounted || typeof document === 'undefined') return null

  const target = document.getElementById(OVERLAY_ROOT_ID)
  if (!target) return null

  return createPortal(panel, target)
}
