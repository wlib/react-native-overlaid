export type Detent = number | `${number}%` | 'content' | 'full'

const FALLBACK_DETENTS = Object.freeze(['content'] as const)

/** Maximum shared by the supported native sheet APIs and web. */
export const MAX_DETENTS = 3

export function normalizeDetents(
  detents?: readonly Detent[],
): readonly Detent[] {
  return detents && detents.length > 0 ? detents : FALLBACK_DETENTS
}

export function clampDetentIndex(
  index: number | undefined,
  detents: readonly Detent[],
): number {
  const maximum = Math.max(0, detents.length - 1)
  const integer =
    typeof index === 'number' && Number.isFinite(index) ? Math.floor(index) : 0
  return Math.max(0, Math.min(integer, maximum))
}

export type OrderedDetents = Readonly<{
  detents: readonly Detent[]
  /** Normalized height fractions, aligned with `detents`. */
  fractions: readonly number[]
  initialDetentIndex: number
}>

type MappedDetent = {
  detent: Detent
  fraction: number
  initial: boolean
}

/** Sort ascending, deduplicate equivalent heights, cap, and remap selection. */
export function orderDetents(
  detents: readonly Detent[] | undefined,
  initialDetent: number | undefined,
  screenHeight: number,
): OrderedDetents {
  const list = normalizeDetents(detents)
  const screen = finitePositive(screenHeight, 1)
  const requestedIndex = clampDetentIndex(initialDetent, list)
  const mapped: MappedDetent[] = list.map((detent, index) => ({
    detent,
    fraction: clampFraction(toFraction(detent, screen)),
    initial: index === requestedIndex,
  }))
  mapped.sort((left, right) => left.fraction - right.fraction)

  const unique: MappedDetent[] = []
  for (const item of mapped) {
    const previous = unique.at(-1)
    if (previous?.fraction === item.fraction) {
      previous.initial ||= item.initial
    } else {
      unique.push({ ...item })
    }
  }

  const capped = unique.slice(0, MAX_DETENTS)
  return {
    detents: capped.map(({ detent }) => detent),
    fractions: capped.map(({ fraction }) => fraction),
    initialDetentIndex: Math.max(
      0,
      capped.findIndex(({ initial }) => initial),
    ),
  }
}

export type ResolvedNativeSheet = Readonly<{
  allowedDetents: readonly number[]
  initialDetentIndex: number
}>

export function resolveNativeSheet(
  detents: readonly Detent[] | undefined,
  initialDetent: number | undefined,
  screenHeight: number,
): ResolvedNativeSheet {
  const ordered = orderDetents(detents, initialDetent, screenHeight)
  return {
    allowedDetents: ordered.fractions,
    initialDetentIndex: ordered.initialDetentIndex,
  }
}

export type DetentMeasurements = Readonly<{
  cap: number
  contentHeight: number
  hasMeasuredContent: boolean
}>

export function resolveDetentHeight(
  detent: Detent,
  measurements: DetentMeasurements,
): number {
  const cap = finiteNonNegative(measurements.cap, 0)
  if (detent === 'full') return cap
  if (detent === 'content') {
    return measurements.hasMeasuredContent
      ? clampHeight(measurements.contentHeight, cap)
      : cap
  }
  if (typeof detent === 'number') {
    return clampHeight(detent > 1 ? detent : detent * cap, cap)
  }
  return clampHeight((Number.parseFloat(detent) / 100) * cap, cap)
}

function toFraction(detent: Detent, screenHeight: number): number {
  if (detent === 'full') return 1
  if (detent === 'content') return 0.5
  if (typeof detent === 'number') {
    return detent > 1 ? detent / screenHeight : detent
  }
  return Number.parseFloat(detent) / 100
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.1, Math.min(value, 1))
}

function clampHeight(value: number, cap: number): number {
  if (!Number.isFinite(value)) return cap
  return Math.max(0, Math.min(value, cap))
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function finiteNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}
