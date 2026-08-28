export const DRAG_DISMISS_VELOCITY = 800
export const DRAG_DISMISS_RATIO = 0.4
export const SNAP_VELOCITY = 250
export const STALE_VELOCITY_MS = 100

export type SheetReleaseInput = Readonly<{
  /** Signed px/s; positive travels downward toward dismissal. */
  velocity: number
  projectedHeight: number
  /** Resolved heights in ascending order. */
  detentHeights: readonly number[]
  currentIndex: number
  thresholds?: Readonly<{
    dismissVelocity?: number
    dismissRatio?: number
    snapVelocity?: number
  }>
}>

export type SheetReleaseDecision =
  Readonly<{ kind: 'dismiss' }> | Readonly<{ kind: 'snap'; index: number }>

/** Decide dismissal or snapping after a web sheet drag. */
export function decideSheetRelease(
  input: SheetReleaseInput,
): SheetReleaseDecision {
  const heights = input.detentHeights
  const lastIndex = Math.max(0, heights.length - 1)
  const currentIndex = clampIndex(input.currentIndex, lastIndex)
  const velocity = finiteOr(input.velocity, 0)
  const projectedHeight = finiteOr(
    input.projectedHeight,
    heights[currentIndex] ?? 0,
  )
  const dismissVelocity = nonNegativeOr(
    input.thresholds?.dismissVelocity,
    DRAG_DISMISS_VELOCITY,
  )
  const dismissRatio = ratioOr(
    input.thresholds?.dismissRatio,
    DRAG_DISMISS_RATIO,
  )
  const snapVelocity = nonNegativeOr(
    input.thresholds?.snapVelocity,
    SNAP_VELOCITY,
  )
  const lowestHeight = finiteOr(heights[0], 0)

  const shouldDismiss =
    (velocity > dismissVelocity &&
      (currentIndex === 0 || projectedHeight < lowestHeight)) ||
    projectedHeight < lowestHeight * (1 - dismissRatio)
  if (shouldDismiss) return { kind: 'dismiss' }

  if (velocity > snapVelocity && currentIndex > 0) {
    return { kind: 'snap', index: currentIndex - 1 }
  }
  if (velocity < -snapVelocity && currentIndex < heights.length - 1) {
    return { kind: 'snap', index: currentIndex + 1 }
  }

  let nearest = currentIndex
  let nearestDistance = Math.abs(
    finiteOr(heights[currentIndex], 0) - projectedHeight,
  )
  heights.forEach((height, index) => {
    const distance = Math.abs(finiteOr(height, 0) - projectedHeight)
    if (distance < nearestDistance) {
      nearest = index
      nearestDistance = distance
    }
  })
  return { kind: 'snap', index: nearest }
}

export function releaseVelocity(
  velocity: number,
  lastSampleAt: number,
  now: number,
  staleMs: number = STALE_VELOCITY_MS,
): number {
  const sample = finiteOr(velocity, 0)
  const elapsed = finiteOr(now - lastSampleAt, Number.POSITIVE_INFINITY)
  const threshold = nonNegativeOr(staleMs, STALE_VELOCITY_MS)
  return elapsed > threshold ? 0 : sample
}

function clampIndex(index: number, lastIndex: number): number {
  const integer = Number.isFinite(index) ? Math.floor(index) : 0
  return Math.max(0, Math.min(integer, lastIndex))
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function nonNegativeOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function ratioOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(value, 1))
    : fallback
}
