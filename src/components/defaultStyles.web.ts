import type { TextStyle, ViewStyle } from 'react-native'

/**
 * WEB pair of defaultStyles. The surface visuals live in styles.css
 * (`@layer overlaid.defaults`, keyed off data-overlaid-kind/-part and
 * guarded by :not([data-overlaid-unstyled])), so a consumer's ordinary
 * stylesheet rule beats them without specificity wars. These empty shims
 * keep the shared component code compiling unchanged; `unstyled` reaches
 * the chrome as the data-overlaid-unstyled attribute instead.
 *
 * The Text part styles below stay in JS on purpose: react-native-web's
 * Text resets paint `color`/`font` directly on the element, so a CSS rule
 * on the surface cannot cascade into them.
 */

export const dialogSurface = {} as ViewStyle

export const drawerSurface = {} as ViewStyle

export const popoverSurface = {} as ViewStyle

export const tooltipSurface = {} as ViewStyle

export const tooltipText: TextStyle = {
  fontSize: 12,
  lineHeight: 18,
  color: '#f9fafb',
}

export const dialogTitle: TextStyle = {
  fontSize: 18,
  fontWeight: '600',
  color: '#111827',
}

export const dialogDescription: TextStyle = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 20,
  color: '#4b5563',
}
