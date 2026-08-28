import type { Placement } from '@floating-ui/core'
import type { RefCallback, RefObject } from 'react'
import type { OverlayInsets } from './overlayContext'

export type { Placement }

export type AnchoredSpec = {
  placement?: Placement | undefined
  offset?: number | undefined
  /** Optional flip/shift boundary. The window/viewport is used by default. */
  boundaryRef?: RefObject<unknown> | undefined
}

export type AnchoredPositionOptions = AnchoredSpec & {
  anchor: RefCallback<unknown>
  surface: RefCallback<unknown>
  /** Applied to the native window boundary; explicit boundaries win. */
  insets?: OverlayInsets | undefined
}

type Rect = { x: number; y: number; width: number; height: number }

export function insetClippingRect(rect: Rect, insets?: OverlayInsets): Rect {
  const top = insets?.top ?? 0
  const bottom = insets?.bottom ?? 0
  if (top === 0 && bottom === 0) return rect
  return {
    x: rect.x,
    y: rect.y + top,
    width: rect.width,
    height: Math.max(0, rect.height - top - bottom),
  }
}

export type AnchoredPosition = {
  panelStyle: Record<string, unknown>
  isPositioned: boolean
  refs: {
    anchor: RefCallback<unknown>
    surface: RefCallback<unknown>
  }
  /** Native measures the floating element from its layout callback. */
  onSurfaceLayout?: ((event: unknown) => void) | undefined
}
