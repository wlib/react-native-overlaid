/**
 * Placement -> CSS Anchor Positioning mapping (design report Appendix A).
 * Pure data so the mapping is unit-testable without a DOM; the web position
 * hook turns it into inline style. Physical mapping: `-start`/`-end` span
 * toward the same physical sides Floating UI resolves them to in LTR.
 */
import type { Placement } from './anchoredPosition'

export type CssAnchorCapabilities = {
  tryFallbacks: boolean
  visibility: boolean
}

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

/** The margin property on the panel's anchor-facing side (the offset gap). */
const OFFSET_MARGIN: Record<string, string> = {
  top: 'marginBottom',
  bottom: 'marginTop',
  left: 'marginRight',
  right: 'marginLeft',
}

export function cssAnchorPanelStyle(
  anchorName: string,
  placement: Placement,
  offsetPx: number,
  caps: CssAnchorCapabilities,
): Record<string, string> {
  const side = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right'
  return {
    // The UA popover margin reset is layered; inline wins unconditionally.
    position: 'fixed',
    inset: 'auto',
    margin: '0',
    [OFFSET_MARGIN[side] as string]: `${offsetPx}px`,
    positionAnchor: anchorName,
    positionArea: POSITION_AREA[placement],
    ...(caps.tryFallbacks
      ? {
          positionTryFallbacks:
            'flip-block, flip-inline, flip-block flip-inline',
          positionTryOrder:
            side === 'left' || side === 'right' ? 'most-width' : 'most-height',
        }
      : {}),
    ...(caps.visibility ? { positionVisibility: 'anchors-visible' } : {}),
  }
}

/** A dashed-ident anchor-name derived from a React id (strip non-ident chars). */
export function cssAnchorName(reactId: string): string {
  return `--overlaid-anchor-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}
