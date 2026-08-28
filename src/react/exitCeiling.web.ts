/**
 * WEB exit ceiling. Transition accounting (useExitTransition.web) is the
 * primary exit truth; the lifecycle timer that consumes this value is only
 * the safety net for exits whose CSS never completes (display:none
 * ancestors, background-tab throttling, jsdom). `exitMs` therefore demotes
 * to the *floor* of that net on web: a consumer may lengthen an exit through
 * CSS, so the ceiling is max(exitMs, computed transition duration+delay)
 * plus fixed slack — one getComputedStyle read, at dismissal start.
 */
import { maxTransitionTotalMs } from './cssTime'

const CEILING_SLACK_MS = 100

export function resolveExitCeilingMs(exitMs: number, panel: unknown): number {
  let computed = 0
  if (
    typeof HTMLElement !== 'undefined' &&
    panel instanceof HTMLElement &&
    typeof getComputedStyle === 'function'
  ) {
    try {
      const style = getComputedStyle(panel)
      computed = maxTransitionTotalMs(
        style.transitionDuration,
        style.transitionDelay,
      )
    } catch {
      computed = 0
    }
  }
  return Math.max(exitMs, computed) + CEILING_SLACK_MS
}
