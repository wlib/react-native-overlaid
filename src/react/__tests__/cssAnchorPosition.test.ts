import { cssAnchorName, cssAnchorPanelStyle } from '../cssAnchorPosition'

const allCaps = { tryFallbacks: true, visibility: true }
const noCaps = { tryFallbacks: false, visibility: false }

describe('cssAnchorPanelStyle', () => {
  it('maps every placement to its position-area (Appendix A)', () => {
    const area = (placement: Parameters<typeof cssAnchorPanelStyle>[1]) =>
      cssAnchorPanelStyle('--a', placement, 8, noCaps)['positionArea']
    expect(area('top')).toBe('top')
    expect(area('top-start')).toBe('top span-right')
    expect(area('top-end')).toBe('top span-left')
    expect(area('bottom')).toBe('bottom')
    expect(area('bottom-start')).toBe('bottom span-right')
    expect(area('bottom-end')).toBe('bottom span-left')
    expect(area('left')).toBe('left')
    expect(area('left-start')).toBe('left span-down')
    expect(area('left-end')).toBe('left span-up')
    expect(area('right')).toBe('right')
    expect(area('right-start')).toBe('right span-down')
    expect(area('right-end')).toBe('right span-up')
  })

  it('offsets via the margin on the anchor-facing side, over a zeroed reset', () => {
    const style = cssAnchorPanelStyle('--a', 'top-start', 12, noCaps)
    expect(style['position']).toBe('fixed')
    expect(style['inset']).toBe('auto')
    expect(style['margin']).toBe('0')
    expect(style['marginBottom']).toBe('12px')
    expect(cssAnchorPanelStyle('--a', 'right', 4, noCaps)['marginLeft']).toBe(
      '4px',
    )
  })

  it('adds try-fallbacks with an axis-appropriate try-order when capable', () => {
    const vertical = cssAnchorPanelStyle('--a', 'bottom', 8, allCaps)
    expect(vertical['positionTryFallbacks']).toBe(
      'flip-block, flip-inline, flip-block flip-inline',
    )
    expect(vertical['positionTryOrder']).toBe('most-height')
    expect(vertical['positionVisibility']).toBe('anchors-visible')

    const horizontal = cssAnchorPanelStyle('--a', 'left-end', 8, allCaps)
    expect(horizontal['positionTryOrder']).toBe('most-width')

    const bare = cssAnchorPanelStyle('--a', 'bottom', 8, noCaps)
    expect(bare['positionTryFallbacks']).toBeUndefined()
    expect(bare['positionVisibility']).toBeUndefined()
  })

  it('wires position-anchor to the given anchor-name', () => {
    expect(
      cssAnchorPanelStyle('--overlaid-anchor-r1', 'top', 8, noCaps)[
        'positionAnchor'
      ],
    ).toBe('--overlaid-anchor-r1')
  })
})

describe('cssAnchorName', () => {
  it('strips non-ident characters from React ids', () => {
    expect(cssAnchorName(':r5:')).toBe('--overlaid-anchor-r5')
    expect(cssAnchorName('«R2»')).toBe('--overlaid-anchor-R2')
  })
})
