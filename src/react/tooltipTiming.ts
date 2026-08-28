/**
 * NATIVE pair of tooltipTiming.web. No stylesheet exists to read on native,
 * so token lookups resolve to nothing and the Tooltip's prop/built-in
 * defaults stand alone; no trigger can host an interest invoker.
 */
export type TooltipTimingTokens = {
  delayMs: number | null
  warmthMs: number | null
}

export function readTooltipTimingTokens(
  _trigger: unknown,
): TooltipTimingTokens | null {
  return null
}

export function isInterestCapableTrigger(_trigger: unknown): boolean {
  return false
}
