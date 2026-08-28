import { cssAnchorPanelStyle } from '../cssAnchorPosition'

describe('placement → CSS Anchor Positioning mapping (Appendix A)', () => {
  it('maps every placement to its position-area region', () => {
    const areas = (
      [
        ['top', 'top'],
        ['top-start', 'top span-right'],
        ['top-end', 'top span-left'],
        ['bottom', 'bottom'],
        ['bottom-start', 'bottom span-right'],
        ['bottom-end', 'bottom span-left'],
        ['left', 'left'],
        ['left-start', 'left span-down'],
        ['left-end', 'left span-up'],
        ['right', 'right'],
        ['right-start', 'right span-down'],
        ['right-end', 'right span-up'],
      ] as const
    ).map(([placement, area]) => [
      cssAnchorPanelStyle('--a', placement, 4)['positionArea'],
      area,
    ])
    for (const [actual, expected] of areas) expect(actual).toBe(expected)
  })

  it('realizes the offset as the anchor-facing margin after the reset', () => {
    const top = cssAnchorPanelStyle('--a', 'top', 6)
    expect(top['margin']).toBe(0)
    expect(top['marginBottom']).toBe(6)
    expect(Object.keys(top).indexOf('margin')).toBeLessThan(
      Object.keys(top).indexOf('marginBottom'),
    )
    expect(cssAnchorPanelStyle('--a', 'bottom-end', 6)['marginTop']).toBe(6)
    expect(cssAnchorPanelStyle('--a', 'left-start', 6)['marginRight']).toBe(6)
    expect(cssAnchorPanelStyle('--a', 'right', 6)['marginLeft']).toBe(6)
  })

  it('resets UA popover geometry and wires the named anchor with fallbacks', () => {
    const style = cssAnchorPanelStyle('--overlaid-anchor-r1', 'bottom', 8)
    expect(style['position']).toBe('fixed')
    expect(style['inset']).toBe('auto')
    expect(style['positionAnchor']).toBe('--overlaid-anchor-r1')
    expect(style['positionTryFallbacks']).toBe(
      'flip-block, flip-inline, flip-block flip-inline',
    )
  })

  it('optimizes try order per axis and gates position-visibility', () => {
    expect(cssAnchorPanelStyle('--a', 'top', 4)['positionTryOrder']).toBe(
      'most-height',
    )
    expect(cssAnchorPanelStyle('--a', 'right', 4)['positionTryOrder']).toBe(
      'most-width',
    )
    expect(
      cssAnchorPanelStyle('--a', 'top', 4)['positionVisibility'],
    ).toBeUndefined()
    expect(
      cssAnchorPanelStyle('--a', 'top', 4, { positionVisibility: true })[
        'positionVisibility'
      ],
    ).toBe('anchors-visible')
  })
})
