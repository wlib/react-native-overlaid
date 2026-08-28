/**
 * WEB tooltip timing tokens (§7.2). `--overlaid-tooltip-delay` and
 * `--overlaid-tooltip-warmth` are read from the trigger's computed style at
 * first hover and cached per element — custom properties inherit, so a
 * consumer can theme tooltip timing at :root or any ancestor exactly like
 * the platform's own `interest-delay`. Resolution order (prop beats token
 * beats built-in default) lives in Tooltip; this module only reads. A token
 * must be a CSS <time> (s/ms); anything else reads as absent.
 */
import { parseCssTimeMs } from './cssTime'

export type TooltipTimingTokens = {
  delayMs: number | null
  warmthMs: number | null
}

const tokenCache = new WeakMap<Element, TooltipTimingTokens>()

export function readTooltipTimingTokens(
  trigger: unknown,
): TooltipTimingTokens | null {
  if (
    typeof Element === 'undefined' ||
    !(trigger instanceof Element) ||
    typeof getComputedStyle !== 'function'
  ) {
    return null
  }
  const cached = tokenCache.get(trigger)
  if (cached) return cached
  let tokens: TooltipTimingTokens = { delayMs: null, warmthMs: null }
  try {
    const style = getComputedStyle(trigger)
    tokens = {
      delayMs: parseCssTimeMs(
        style.getPropertyValue('--overlaid-tooltip-delay'),
      ),
      warmthMs: parseCssTimeMs(
        style.getPropertyValue('--overlaid-tooltip-warmth'),
      ),
    }
  } catch {
    // Detached elements and non-visual DOMs read as token-less.
  }
  tokenCache.set(trigger, tokens)
  return tokens
}

/**
 * The `interestfor` attribute is restricted to <button>, <a href>, <area>,
 * and SVG <a> — only those triggers can ever host the platform's own
 * interest timer, so only they receive forwarded interest-delay values.
 */
export function isInterestCapableTrigger(
  trigger: unknown,
): trigger is Element & ElementCSSInlineStyle {
  if (typeof Element === 'undefined' || !(trigger instanceof Element)) {
    return false
  }
  if (
    typeof HTMLButtonElement !== 'undefined' &&
    trigger instanceof HTMLButtonElement
  ) {
    return true
  }
  if (
    typeof HTMLAnchorElement !== 'undefined' &&
    trigger instanceof HTMLAnchorElement
  ) {
    return trigger.hasAttribute('href')
  }
  if (
    typeof HTMLAreaElement !== 'undefined' &&
    trigger instanceof HTMLAreaElement
  ) {
    return true
  }
  if (typeof SVGAElement !== 'undefined' && trigger instanceof SVGAElement) {
    return true
  }
  return false
}
