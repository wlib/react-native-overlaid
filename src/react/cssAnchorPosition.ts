/**
 * Pure placement → CSS Anchor Positioning mapping (report Appendix A).
 *
 * Used by the web positioning hook when the CSS engine is selected; kept
 * platform-free and side-effect-free so the mapping itself is unit-testable
 * without a DOM. The panel resets (`position: fixed; inset: auto;
 * margin: 0`) neutralize UA popover styles before `position-area` applies;
 * the anchor-facing margin realizes the configured offset.
 */
import type { Placement } from './anchoredPosition'

const POSITION_AREA: Readonly<Record<Placement, string>> = Object.freeze({
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
})

const OFFSET_MARGIN: Readonly<Record<Placement, string>> = Object.freeze({
  top: 'marginBottom',
  'top-start': 'marginBottom',
  'top-end': 'marginBottom',
  bottom: 'marginTop',
  'bottom-start': 'marginTop',
  'bottom-end': 'marginTop',
  left: 'marginRight',
  'left-start': 'marginRight',
  'left-end': 'marginRight',
  right: 'marginLeft',
  'right-start': 'marginLeft',
  'right-end': 'marginLeft',
})

export type CssAnchorPanelStyle = Record<string, string | number>

export function cssAnchorPanelStyle(
  anchorName: string,
  placement: Placement,
  offset: number,
  options?: Readonly<{ positionVisibility?: boolean }>,
): CssAnchorPanelStyle {
  const vertical = placement.startsWith('top') || placement.startsWith('bottom')
  return {
    position: 'fixed',
    inset: 'auto',
    margin: 0,
    [OFFSET_MARGIN[placement]]: offset,
    positionAnchor: anchorName,
    positionArea: POSITION_AREA[placement],
    positionTryFallbacks: 'flip-block, flip-inline, flip-block flip-inline',
    positionTryOrder: vertical ? 'most-height' : 'most-width',
    ...(options?.positionVisibility
      ? { positionVisibility: 'anchors-visible' }
      : {}),
  }
}
