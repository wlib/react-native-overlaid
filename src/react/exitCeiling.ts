/**
 * NATIVE pair of exitCeiling.web. Native exit animations are the timing that
 * `exitMs` describes exactly, so the budget itself is the ceiling and no
 * platform read exists to consult.
 */
export function resolveExitCeilingMs(exitMs: number, _panel: unknown): number {
  return exitMs
}
