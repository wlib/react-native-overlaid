import { useMemo } from 'react'
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
} from './anchoredPosition'

export function useAnchoredPosition(
  options: AnchoredPositionOptions,
  isOpen: boolean,
  isMounted = isOpen,
): AnchoredPosition {
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
    open: isMounted,
  })
  const anchor = useMemo(
    () =>
      composeRefs(
        floating.refs.setReference as RefCallback<unknown>,
        options.anchor,
      ),
    [floating.refs.setReference, options.anchor],
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

  return useMemo(
    () => ({
      panelStyle: {
        position: floating.strategy,
        top: floating.y ?? 0,
        left: floating.x ?? 0,
        visibility: positioned ? 'visible' : 'hidden',
      },
      isPositioned: isOpen && positioned,
      refs: { anchor, surface },
    }),
    [
      anchor,
      floating.strategy,
      floating.x,
      floating.y,
      isOpen,
      positioned,
      surface,
    ],
  )
}
