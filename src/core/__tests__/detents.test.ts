import {
  MAX_DETENTS,
  clampDetentIndex,
  normalizeDetents,
  orderDetents,
  resolveDetentHeight,
  resolveNativeSheet,
} from '../detents'

describe('detent normalization', () => {
  it('defaults missing/empty input to content', () => {
    expect(normalizeDetents()).toEqual(['content'])
    expect(normalizeDetents([])).toEqual(['content'])
  })

  it.each([
    [undefined, 0],
    [Number.NaN, 0],
    [-1, 0],
    [99, 1],
    [1.8, 1],
  ] as const)('clamps index %p to %p', (index, expected) => {
    expect(clampDetentIndex(index, ['content', 'full'])).toBe(expected)
  })
})

describe('detent ordering', () => {
  it('sorts, deduplicates, and remaps the requested detent', () => {
    const result = orderDetents(['full', '50%', 0.5, 0.2], 0, 800)
    expect(result.detents).toEqual([0.2, '50%', 'full'])
    expect(result.fractions).toEqual([0.2, 0.5, 1])
    expect(result.initialDetentIndex).toBe(2)
  })

  it('uses 0.5 for content in a mixed portable list', () => {
    expect(orderDetents(['full', 'content', 0.2], 1, 800)).toEqual({
      detents: [0.2, 'content', 'full'],
      fractions: [0.2, 0.5, 1],
      initialDetentIndex: 1,
    })
  })

  it('caps consistently and never points at a dropped item', () => {
    const result = orderDetents([0.2, 0.4, 0.6, 0.8, 'full'], 4, 800)
    expect(result.detents).toHaveLength(MAX_DETENTS)
    expect(result.initialDetentIndex).toBe(0)
  })

  it('converts pixels and clamps degenerate fractions', () => {
    expect(orderDetents([240], 0, 800).fractions).toEqual([0.3])
    expect(orderDetents([0, Number.NaN], 0, 0).fractions).toEqual([0.1, 1])
  })

  it('resolves the exact same normalized detents for native', () => {
    expect(resolveNativeSheet([0.9, 0.3, 'full', 0.3], 0, 800)).toEqual({
      allowedDetents: [0.3, 0.9, 1],
      initialDetentIndex: 1,
    })
  })
})

describe('web detent height', () => {
  const base = { cap: 700, contentHeight: 300, hasMeasuredContent: true }

  it.each([
    ['full', 700],
    ['content', 300],
    [0.5, 350],
    [240, 240],
    ['40%', 280],
    [99_999, 700],
  ] as const)('resolves %p to %p', (detent, expected) => {
    expect(resolveDetentHeight(detent, base)).toBe(expected)
  })

  it('uses cap before content measurement and sanitizes invalid caps', () => {
    expect(
      resolveDetentHeight('content', {
        ...base,
        hasMeasuredContent: false,
      }),
    ).toBe(700)
    expect(resolveDetentHeight('full', { ...base, cap: Number.NaN })).toBe(0)
  })
})
