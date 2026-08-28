import { useId, useMemo } from 'react'
import type { RefCallback } from 'react'
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import { hasWebCapability } from '../chrome/webCapabilities'
import { composeRefs } from './composeRefs'
import { cssAnchorPanelStyle } from './cssAnchorPosition'
import type {
  AnchoredPosition,
  AnchoredPositionOptions,
} from './anchoredPosition'

/**
 * Engine selection (report §6.3 + Appendix A): CSS Anchor Positioning is
 * primary only where it can honestly replace Floating UI — the capability
 * is present, no `boundaryRef` demands an arbitrary boundary element (CSS
 * judges overflow against the containing block only), and `closeOnScroll`
 * is off (with the default on, any page scroll dismisses the overlay, so
 * frame-synced tracking buys nothing and Floating UI keeps pixel parity
 * with the fallback path). Everything else runs Floating UI, unchanged.
 */
function useCssAnchorEngine(options: AnchoredPositionOptions): boolean {
  return (
    options.closeOnScroll === false &&
    options.boundaryRef === undefined &&
    hasWebCapability('anchorPositioning') &&
    hasWebCapability('positionTryFallbacks')
  )
}

export function useAnchoredPosition(
  options: AnchoredPositionOptions,
  isOpen: boolean,
  isMounted = isOpen,
): AnchoredPosition {
  const cssEngine = useCssAnchorEngine(options)
  // useId can contain characters invalid in a dashed-ident; strip them.
  const reactId = useId()
  const anchorName = `--overlaid-anchor-${reactId.replace(/[^a-zA-Z0-9-]/g, '')}`
  const viewportPadding = {
    top: 8 + (options.insets?.top ?? 0),
    right: 8,
    bottom: 8 + (options.insets?.bottom ?? 0),
    left: 8,
  }
  const floating = useFloating({
    placement: options.placement,
    middleware: [
      offset(options.offset ?? 8),
      flip(() => {
        const boundary = options.boundaryRef?.current
        return typeof Element !== 'undefined' && boundary instanceof Element
          ? { boundary, padding: 8 }
          : { padding: viewportPadding }
      }),
      shift(() => {
        const boundary = options.boundaryRef?.current
        return typeof Element !== 'undefined' && boundary instanceof Element
          ? { boundary, padding: 8 }
          : { padding: viewportPadding }
      }),
    ],
    // The CSS engine leaves Floating UI dormant: no autoUpdate observers,
    // no measurements. The hook itself must still run unconditionally.
    whileElementsMounted: cssEngine ? undefined : autoUpdate,
    open: cssEngine ? false : isMounted,
  })
  // The CSS engine names the anchor explicitly on the trigger element
  // (implicit anchors from showPopover({source}) would tie positioning to
  // newer engines and to the popover code path; anchor-name is core).
  const anchorNameRef = useMemo<RefCallback<unknown>>(() => {
    if (!cssEngine) return () => {}
    let named: HTMLElement | null = null
    return (node) => {
      if (named && named !== node) named.style.removeProperty('anchor-name')
      named = node instanceof HTMLElement ? node : null
      named?.style.setProperty('anchor-name', anchorName)
    }
  }, [anchorName, cssEngine])
  const anchor = useMemo(
    () =>
      composeRefs(
        floating.refs.setReference as RefCallback<unknown>,
        anchorNameRef,
        options.anchor,
      ),
    [anchorNameRef, floating.refs.setReference, options.anchor],
  )
  const surface = useMemo(
    () =>
      composeRefs(
        floating.refs.setFloating as RefCallback<unknown>,
        options.surface,
      ),
    [floating.refs.setFloating, options.surface],
  )
  const positioned =
    floating.isPositioned && floating.x != null && floating.y != null
  const placement = options.placement ?? 'bottom-start'
  const offsetPx = options.offset ?? 8
  const supportsVisibility = hasWebCapability('positionVisibility')

  return useMemo(() => {
    if (cssEngine) {
      // CSS positions the panel in the same paint it becomes visible in, so
      // the layout gate is satisfied as soon as the panel exists.
      return {
        panelStyle: cssAnchorPanelStyle(anchorName, placement, offsetPx, {
          positionVisibility: supportsVisibility,
        }),
        isPositioned: isOpen,
        refs: { anchor, surface },
      }
    }
    return {
      panelStyle: {
        position: floating.strategy,
        top: floating.y ?? 0,
        left: floating.x ?? 0,
        visibility: positioned ? 'visible' : 'hidden',
      },
      isPositioned: isOpen && positioned,
      refs: { anchor, surface },
    }
  }, [
    anchor,
    anchorName,
    cssEngine,
    floating.strategy,
    floating.x,
    floating.y,
    isOpen,
    offsetPx,
    placement,
    positioned,
    supportsVisibility,
    surface,
  ])
}
