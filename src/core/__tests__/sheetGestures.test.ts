import {
  DRAG_DISMISS_RATIO,
  DRAG_DISMISS_VELOCITY,
  SNAP_VELOCITY,
  STALE_VELOCITY_MS,
  decideSheetRelease,
  releaseVelocity,
  type SheetReleaseDecision,
  type SheetReleaseInput,
} from '../sheetGestures'

const HEIGHTS = [200, 400, 700] as const

function decide(
  input: Omit<SheetReleaseInput, 'detentHeights'>,
): SheetReleaseDecision {
  return decideSheetRelease({ ...input, detentHeights: HEIGHTS })
}

describe('sheet release thresholds', () => {
  it('keeps the documented defaults stable', () => {
    expect({
      dismissRatio: DRAG_DISMISS_RATIO,
      dismissVelocity: DRAG_DISMISS_VELOCITY,
      snapVelocity: SNAP_VELOCITY,
      staleMs: STALE_VELOCITY_MS,
    }).toEqual({
      dismissRatio: 0.4,
      dismissVelocity: 800,
      snapVelocity: 250,
      staleMs: 100,
    })
  })

  it.each<
    [string, Omit<SheetReleaseInput, 'detentHeights'>, SheetReleaseDecision]
  >([
    [
      'fast fling from lowest dismisses',
      { velocity: 801, projectedHeight: 190, currentIndex: 0 },
      { kind: 'dismiss' },
    ],
    [
      'threshold is exclusive',
      { velocity: 800, projectedHeight: 195, currentIndex: 0 },
      { kind: 'snap', index: 0 },
    ],
    [
      'high detent fling descends one rung',
      { velocity: 1200, projectedHeight: 450, currentIndex: 2 },
      { kind: 'snap', index: 1 },
    ],
    [
      'high detent can dismiss below the lowest',
      { velocity: 1200, projectedHeight: 199, currentIndex: 2 },
      { kind: 'dismiss' },
    ],
    [
      'slow deep drag dismisses',
      { velocity: 0, projectedHeight: 119, currentIndex: 1 },
      { kind: 'dismiss' },
    ],
    [
      'ratio boundary is exclusive',
      { velocity: 0, projectedHeight: 120, currentIndex: 0 },
      { kind: 'snap', index: 0 },
    ],
    [
      'upward fling climbs one rung',
      { velocity: -251, projectedHeight: 420, currentIndex: 1 },
      { kind: 'snap', index: 2 },
    ],
    [
      'slow drag chooses nearest across several rungs',
      { velocity: 100, projectedHeight: 650, currentIndex: 0 },
      { kind: 'snap', index: 2 },
    ],
    [
      'tie preserves current detent',
      { velocity: 0, projectedHeight: 300, currentIndex: 1 },
      { kind: 'snap', index: 1 },
    ],
  ])('%s', (_description, input, expected) => {
    expect(decide(input)).toEqual(expected)
  })

  it('honors valid overrides and ignores malformed ones', () => {
    expect(
      decide({
        velocity: 500,
        projectedHeight: 195,
        currentIndex: 0,
        thresholds: { dismissVelocity: 400 },
      }),
    ).toEqual({ kind: 'dismiss' })
    expect(
      decide({
        velocity: 500,
        projectedHeight: 195,
        currentIndex: 0,
        thresholds: { dismissVelocity: Number.NaN, snapVelocity: -1 },
      }),
    ).toEqual({ kind: 'snap', index: 0 })
  })

  it('clamps malformed indexes and finite-normalizes motion', () => {
    expect(
      decideSheetRelease({
        velocity: Number.NaN,
        projectedHeight: Number.NaN,
        detentHeights: [200],
        currentIndex: 99,
      }),
    ).toEqual({ kind: 'snap', index: 0 })
  })
})

describe('velocity sample freshness', () => {
  it.each([
    [640, 1_000, 1_050, 640],
    [640, 1_000, 1_100, 640],
    [640, 1_000, 1_101, 0],
    [-900, 1_000, 2_000, 0],
  ])('maps %p sampled at %p released at %p to %p', (v, at, now, expected) => {
    expect(releaseVelocity(v, at, now)).toBe(expected)
  })
})
