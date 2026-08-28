/**
 * CSS <time> parsing for computed-style readbacks (exit ceiling, tooltip
 * timing tokens). Custom properties are untyped strings, so a token must
 * carry an explicit s/ms unit; anything else — including the empty string an
 * unset property computes to — is null, never 0, so callers can fall back.
 */

const TIME_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+))(m?s)$/

export function parseCssTimeMs(token: string): number | null {
  const match = TIME_PATTERN.exec(token.trim())
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value)) return null
  return match[2] === 's' ? value * 1000 : value
}

function parseCssTimeListMs(list: string): number[] {
  return list.split(',').map((token) => parseCssTimeMs(token) ?? 0)
}

/**
 * Longest single transition in a computed duration/delay pair, in ms.
 * Shorter lists repeat against longer ones (the CSS list-cycling rule);
 * negative delays shorten a transition but never below zero.
 */
export function maxTransitionTotalMs(
  durationList: string,
  delayList: string,
): number {
  const durations = parseCssTimeListMs(durationList)
  const delays = parseCssTimeListMs(delayList)
  if (durations.length === 0) return 0
  let longest = 0
  const count = Math.max(durations.length, delays.length)
  for (let index = 0; index < count; index += 1) {
    const duration = durations[index % durations.length] ?? 0
    const delay = delays.length === 0 ? 0 : (delays[index % delays.length] ?? 0)
    longest = Math.max(longest, Math.max(0, duration + delay))
  }
  return longest
}
