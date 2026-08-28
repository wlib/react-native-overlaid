import { MAX_DETENTS, type Detent } from '../core/detents'
import type { OverlayLayout, OverlayLayoutValue } from '../react/overlayContext'

type DevelopmentGlobal = typeof globalThis & {
  __DEV__?: boolean
  process?: { env?: { NODE_ENV?: string } }
}

const warned = new Set<string>()

function isDevelopment(): boolean {
  const environment = globalThis as DevelopmentGlobal
  return (
    environment.__DEV__ ?? environment.process?.env?.NODE_ENV !== 'production'
  )
}

export function warnOnce(message: string): void {
  if (!isDevelopment() || warned.has(message)) return
  warned.add(message)
  console.warn(`react-native-overlaid: ${message}`)
}

const PERCENTAGE = /^\d+(?:\.\d+)?%$/

function isPortableLayoutValue(value: unknown): value is OverlayLayoutValue {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0
  return typeof value === 'string' && PERCENTAGE.test(value)
}

/** Runtime guard for JavaScript consumers and values widened through `any`. */
export function diagnoseLayout(
  component: string,
  layout: OverlayLayout | undefined,
): void {
  if (!isDevelopment() || !layout) return
  const dimensions = [
    'width',
    'maxWidth',
    'minWidth',
    'maxHeight',
    'minHeight',
  ] as const

  for (const property of dimensions) {
    const value = layout[property]
    if (value !== undefined && !isPortableLayoutValue(value)) {
      warnOnce(
        `${component} layout.${property} must be a finite non-negative number ` +
          `or percentage string; received ${String(value)}.`,
      )
    }
  }

  const padding = layout.horizontalPadding
  if (
    padding !== undefined &&
    (typeof padding !== 'number' || !Number.isFinite(padding) || padding < 0)
  ) {
    warnOnce(
      `${component} layout.horizontalPadding must be a finite non-negative ` +
        `number; received ${String(padding)}.`,
    )
  }
}

function isValidDetent(value: unknown): value is Detent {
  if (value === 'content' || value === 'full') return true
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (typeof value !== 'string' || !PERCENTAGE.test(value)) return false
  const percentage = Number.parseFloat(value)
  return percentage > 0 && percentage <= 100
}

export function diagnoseDetents(
  detents: readonly Detent[] | undefined,
  initialDetent: number | undefined,
): void {
  if (!isDevelopment()) return
  if (detents) {
    detents.forEach((detent, index) => {
      if (!isValidDetent(detent)) {
        warnOnce(
          `Sheet detents[${index}] is invalid (${String(detent)}). Use ` +
            `'content', 'full', a positive number, or a percentage from 0% to 100%.`,
        )
      }
    })
    if (detents.length > MAX_DETENTS) {
      warnOnce(
        `Sheet supports at most ${MAX_DETENTS} detents across platforms; ` +
          `only the lowest ${MAX_DETENTS} resolved heights are used.`,
      )
    }
  }
  if (
    initialDetent !== undefined &&
    (!Number.isInteger(initialDetent) || initialDetent < 0)
  ) {
    warnOnce(
      `Sheet initialDetent must be a non-negative integer; received ${String(initialDetent)}.`,
    )
  } else if (
    initialDetent !== undefined &&
    initialDetent >= (detents && detents.length > 0 ? detents.length : 1)
  ) {
    const detentCount = detents && detents.length > 0 ? detents.length : 1
    warnOnce(
      `Sheet initialDetent ${initialDetent} is outside the ${detentCount}-item detent list and will be clamped.`,
    )
  }
}
