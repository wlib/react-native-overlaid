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
import { flattenToCss } from '../react/flattenStyle'
import {
  useAnchoredOverlayContext,
  type CrossPlatformStyle,
} from '../react/overlayContext'
import { OVERLAY_ROOT_ID } from '../react/OverlayHost.web'
import { stylingAttributes, useOverlayStyling } from '../react/overlayStyling'
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
  } = context
  const styling = useOverlayStyling()
  const supportsPopover = hasWebCapability('popover')
  // Chromium-gated close-first exit (§7.3.2): where discrete transitions and
  // the CSS overlay property both exist, hidePopover() runs at dismissal
  // start and the stylesheet's allow-discrete/overlay transition keeps the
  // element rendered in the top layer through the exit — so a dying popover
  // stops intercepting hover/clicks and :popover-open stays truthful.
  // Elsewhere the popover stays shown through 'dismissing' (mounted-through-
  // exit), the only cross-browser way to keep top-layer membership.
  const closeFirstExit =
    supportsPopover &&
    hasWebCapability('discreteTransitions') &&
    hasWebCapability('overlayProperty')
  const platformHidden = closeFirstExit ? !state.isOpen : !state.isMounted

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
      // Show is keyed on isOpen, not mount state: an accepted browser-
      // initiated close leaves the surface natively hidden through the exit
      // phase, so a reopen mid-exit (dismissing -> presented, isMounted
      // never flipping) must re-assert showPopover. A managed surface stays
      // :popover-open through its exit, so the same reopen is a no-op for
      // it; during 'dismissing' (mounted, not open) neither branch runs in
      // mounted-through-exit mode and top-layer membership holds.
      if (state.isOpen && !isPopoverOpen(element)) {
        showPopoverFrom(element, refs.trigger.current)
      } else if (platformHidden && isPopoverOpen(element)) {
        element.hidePopover()
      }
    } catch {
      // Browser light-dismiss and StrictMode can race this effect. The
      // toggle listener below is the source of truth after the operation.
    }
  }, [platformHidden, refs.trigger, state.isOpen, supportsPopover])

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

      // Browser-initiated close must be reconciled with the kernel. If the
      // kernel refuses, restore the platform surface it still owns.
      const dismissed = actions.requestDismiss('escape')
      if (!dismissed && element.isConnected) {
        try {
          showPopoverFrom(element, refs.trigger.current)
        } catch {
          // Removal or another top-layer operation won the race.
        }
      }
    }
    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [actions, refs.trigger, signals, state.isOpen, supportsPopover])

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
      data-overlaid-placement={anchored.placement}
      data-overlaid-reveal=""
      {...(unstyled ? { 'data-overlaid-unstyled': '' } : {})}
      {...stylingAttributes(styling)}
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
        ? { popover: behavior === 'hint' ? 'hint' : 'manual' }
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
