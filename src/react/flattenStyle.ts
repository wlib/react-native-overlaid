import type { CSSProperties } from 'react'
import { StyleSheet } from 'react-native'
import type { CrossPlatformStyle } from './overlayContext'

/**
 * RN-only shorthand keys that React DOM would silently drop. Each expands to
 * its CSS pair; an explicit long-hand in the same object still wins because
 * the expansion only fills keys the style does not already set.
 */
const RN_SHORTHANDS: Record<string, readonly [string, string]> = {
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  paddingStart: ['paddingInlineStart', 'paddingInlineStart'],
  paddingEnd: ['paddingInlineEnd', 'paddingInlineEnd'],
  marginStart: ['marginInlineStart', 'marginInlineStart'],
  marginEnd: ['marginInlineEnd', 'marginInlineEnd'],
}

/** Flatten RN arrays/registered styles before passing them to a DOM element. */
export function flattenToCss(style?: CrossPlatformStyle): CSSProperties {
  if (!style) return {}
  const flat = (
    Array.isArray(style) || typeof style === 'number'
      ? (StyleSheet.flatten(style as never) ?? {})
      : style
  ) as Record<string, unknown>

  let result: Record<string, unknown> = flat
  for (const [shorthand, [first, second]] of Object.entries(RN_SHORTHANDS)) {
    if (!(shorthand in result)) continue
    if (result === flat) result = { ...flat }
    const value = result[shorthand]
    delete result[shorthand]
    if (!(first in result)) result[first] = value
    if (!(second in result)) result[second] = value
  }
  return result as CSSProperties
}
