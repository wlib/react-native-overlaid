import { insetClippingRect } from '../anchoredPosition'

describe('insetClippingRect', () => {
  it('preserves identity when there is nothing to inset', () => {
    const rect = { x: 10, y: 20, width: 100, height: 200 }
    expect(insetClippingRect(rect)).toBe(rect)
    expect(insetClippingRect(rect, { top: 0, bottom: 0 })).toBe(rect)
  })

  it('shrinks the page-space boundary without producing negative height', () => {
    expect(
      insetClippingRect(
        { x: 10, y: 20, width: 100, height: 50 },
        { top: 40, bottom: 40 },
      ),
    ).toEqual({ x: 10, y: 60, width: 100, height: 0 })
  })
})
