import { maxTransitionTotalMs, parseCssTimeMs } from '../cssTime'

describe('parseCssTimeMs', () => {
  it('parses s and ms with an explicit unit', () => {
    expect(parseCssTimeMs('0.5s')).toBe(500)
    expect(parseCssTimeMs('200ms')).toBe(200)
    expect(parseCssTimeMs(' 80ms ')).toBe(80)
    expect(parseCssTimeMs('.25s')).toBe(250)
    expect(parseCssTimeMs('-0.1s')).toBe(-100)
  })

  it('is null for unitless, empty, or malformed tokens (never 0)', () => {
    expect(parseCssTimeMs('')).toBeNull()
    expect(parseCssTimeMs('400')).toBeNull()
    expect(parseCssTimeMs('fast')).toBeNull()
    expect(parseCssTimeMs('1s 2s')).toBeNull()
  })
})

describe('maxTransitionTotalMs', () => {
  it('pairs durations with delays, cycling the shorter list', () => {
    // duration 0.5s+0.1s = 600; 200ms + cycled 0.1s = 300.
    expect(maxTransitionTotalMs('0.5s, 200ms', '0.1s')).toBe(600)
    // delay list longer than duration list still pairs every entry.
    expect(maxTransitionTotalMs('100ms', '0s, 1s')).toBe(1100)
  })

  it('clamps negative-delay pairs at zero', () => {
    expect(maxTransitionTotalMs('100ms', '-2s')).toBe(0)
    expect(maxTransitionTotalMs('100ms, 300ms', '-2s, 0s')).toBe(300)
  })

  it('treats unset computed values as no transition', () => {
    expect(maxTransitionTotalMs('', '')).toBe(0)
  })
})
