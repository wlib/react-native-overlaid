import { useCallback, useId, useMemo, useRef, useState } from 'react'
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
import { cssAnchorName, cssAnchorPanelStyle } from './cssAnchorPosition'
import type {
  AnchoredPosition,
  AnchoredPositionOptions,
  Placement,
} from './anchoredPosition'

type PositionEngine = 'floating' | 'css-anchor'

/**
 * Two position engines (§7.3.3). CSS Anchor Positioning is the default when
 * the browser has it AND the instance can profit: no `boundaryRef` (CSS
 * judges overflow against the containing block, not an arbitrary element)
 * and `closeOnScroll === false` (browser-tracked positioning only pays when
 * scrolling keeps the overlay open). Everything else runs Floating UI, which
 * now emits `--overlaid-x/-y` custom properties consumed by the motion
 * layer's translate3d — consumer CSS can compose transforms on top.
 */
export function useAnchoredPosition(
  options: AnchoredPositionOptions,
  isOpen: boolean,
  isMounted = isOpen,
): AnchoredPosition {
  // The engine is a structural choice (a different styling contract on the
  // panel), so it is snapshotted for the component's lifetime — the same
  // rule as the dialog's modal/modeless mode snapshot.
  const engineRef = useRef<PositionEngine | null>(null)
  if (engineRef.current === null) {
    engineRef.current =
      hasWebCapability('anchorPositioning') &&
      !options.boundaryRef &&
      options.closeOnScroll === false
        ? 'css-anchor'
        : 'floating'
  }
  const engine = engineRef.current

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
    // Under css-anchor the floating refs are never attached; keep the hook
    // fully idle rather than measuring a detached pair.
    open: engine === 'floating' && isMounted,
  })

  // css-anchor plumbing: the anchor element carries an instance-unique
  // anchor-name inline; the panel's position-anchor (in panelStyle) points
  // at it and the browser owns tracking from there.
  const reactId = useId()
  const anchorName = cssAnchorName(reactId)
  const anchorElement = useRef<HTMLElement | null>(null)
  const [surfaceAttached, setSurfaceAttached] = useState(false)
  const cssAnchorRef = useCallback<RefCallback<unknown>>(
    (node) => {
      const previous = anchorElement.current
      if (previous && previous !== node) {
        previous.style.removeProperty('anchor-name')
      }
      const next =
        typeof HTMLElement !== 'undefined' && node instanceof HTMLElement
          ? node
          : null
      anchorElement.current = next
      next?.style.setProperty('anchor-name', anchorName)
    },
    [anchorName],
  )
  const cssSurfaceRef = useCallback<RefCallback<unknown>>((node) => {
    setSurfaceAttached(
      typeof HTMLElement !== 'undefined' && node instanceof HTMLElement,
    )
  }, [])

  const anchor = useMemo(
    () =>
      composeRefs(
        engine === 'css-anchor'
          ? cssAnchorRef
          : (floating.refs.setReference as RefCallback<unknown>),
        options.anchor,
      ),
    [cssAnchorRef, engine, floating.refs.setReference, options.anchor],
  )
  const surface = useMemo(
    () =>
      composeRefs(
        engine === 'css-anchor'
          ? cssSurfaceRef
          : (floating.refs.setFloating as RefCallback<unknown>),
        options.surface,
      ),
    [cssSurfaceRef, engine, floating.refs.setFloating, options.surface],
  )

  const requestedPlacement: Placement = options.placement ?? 'bottom'
  const offsetPx = options.offset ?? 8
  const positioned =
    floating.isPositioned && floating.x != null && floating.y != null
  const floatingPlacement = floating.placement

  return useMemo(() => {
    if (engine === 'css-anchor') {
      return {
        panelStyle: cssAnchorPanelStyle(
          anchorName,
          requestedPlacement,
          offsetPx,
          {
            tryFallbacks: hasWebCapability('positionTryFallbacks'),
            visibility: hasWebCapability('positionVisibility'),
          },
        ),
        // The browser positions synchronously at first layout; attachment
        // of both elements is the whole readiness story.
        isPositioned: isOpen && surfaceAttached,
        placement: requestedPlacement,
        refs: { anchor, surface },
      }
    }
    return {
      panelStyle: {
        position: floating.strategy,
        // Explicit zero origin: the motion layer's
        // translate3d(--overlaid-x, --overlaid-y) supplies the placement.
        top: 0,
        left: 0,
        ['--overlaid-x']: `${floating.x ?? 0}px`,
        ['--overlaid-y']: `${floating.y ?? 0}px`,
        visibility: positioned ? 'visible' : 'hidden',
      },
      isPositioned: isOpen && positioned,
      placement: floatingPlacement,
      refs: { anchor, surface },
    }
  }, [
    anchor,
    anchorName,
    engine,
    floating.strategy,
    floating.x,
    floating.y,
    floatingPlacement,
    isOpen,
    offsetPx,
    positioned,
    requestedPlacement,
    surface,
    surfaceAttached,
  ])
}
