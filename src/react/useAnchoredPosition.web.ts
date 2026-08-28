import { useCallback, useMemo, useRef, useState } from 'react'
import type { RefCallback } from 'react'
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import { composeRefs } from './composeRefs'
import type {
  AnchoredPosition,
  AnchoredPositionOptions,
  Placement,
} from './anchoredPosition'

/**
 * Appendix-A placement mapping: the region centers/spans against the anchor
 * exactly as Floating UI's start/end alignments do.
 */
const POSITION_AREA: Record<Placement, string> = {
  top: 'top',
  'top-start': 'top span-right',
  'top-end': 'top span-left',
  bottom: 'bottom',
  'bottom-start': 'bottom span-right',
  'bottom-end': 'bottom span-left',
  left: 'left',
  'left-start': 'left span-down',
  'left-end': 'left span-up',
  right: 'right',
  'right-start': 'right span-down',
  'right-end': 'right span-up',
}

/** Per-instance dashed-ident (useId output is not a valid CSS ident). */
let anchorNameSequence = 0

export function useAnchoredPosition(
  options: AnchoredPositionOptions,
  isOpen: boolean,
  isMounted = isOpen,
): AnchoredPosition {
  // 'css-anchor' arrives already resolved: the components gate the consumer
  // request on capability and boundaryRef (resolveWebPositioning, with dev
  // warnings) before it reaches the spec. boundaryRef therefore never
  // coexists with css mode here.
  const cssMode = options.positioning === 'css-anchor'
  const [anchorName] = useState(
    () => `--overlaid-anchor-${(anchorNameSequence += 1)}`,
  )

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
    whileElementsMounted: autoUpdate,
    open: isMounted && !cssMode,
  })

  // Explicit anchor-name on the trigger backs up the implicit anchor that
  // showPopover({source}) provides: engines shipped CSS Anchor Positioning
  // before the implicit-anchor wiring, and the portal fallback has no
  // popover invoker relationship at all.
  const lastAnchorElement = useRef<HTMLElement | null>(null)
  const applyAnchorName = useCallback(
    (node: unknown) => {
      if (node === null || node === undefined) {
        lastAnchorElement.current?.style.removeProperty('anchor-name')
        lastAnchorElement.current = null
        return
      }
      if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
        lastAnchorElement.current = node
        node.style.setProperty('anchor-name', anchorName)
      }
    },
    [anchorName],
  )

  const anchor = useMemo(
    () =>
      cssMode
        ? composeRefs(applyAnchorName, options.anchor)
        : composeRefs(
            floating.refs.setReference as RefCallback<unknown>,
            options.anchor,
          ),
    [applyAnchorName, cssMode, floating.refs.setReference, options.anchor],
  )
  const surface = useMemo(
    () =>
      cssMode
        ? options.surface
        : composeRefs(
            floating.refs.setFloating as RefCallback<unknown>,
            options.surface,
          ),
    [cssMode, floating.refs.setFloating, options.surface],
  )
  const positioned =
    floating.isPositioned && floating.x != null && floating.y != null

  const placement = options.placement ?? 'bottom-start'
  const gap = options.offset ?? 8
  return useMemo(() => {
    if (cssMode) {
      // The mechanism lives in the overlaid.positioning stylesheet layer,
      // keyed off the data attributes; inline styles carry only the
      // per-instance variable inputs (F2). CSS places synchronously at
      // first paint, so the panel is positioned as soon as it is open.
      return {
        panelStyle: {
          position: 'fixed',
          ['--overlaid-position-anchor']: anchorName,
          ['--overlaid-position-area']: POSITION_AREA[placement],
          ['--overlaid-anchor-offset']: `${gap}px`,
        },
        panelProps: {
          'data-overlaid-anchored': 'css',
          'data-overlaid-placement': placement,
        },
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
    cssMode,
    floating.strategy,
    floating.x,
    floating.y,
    gap,
    isOpen,
    placement,
    positioned,
    surface,
  ])
}
