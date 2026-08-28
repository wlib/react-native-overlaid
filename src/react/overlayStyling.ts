import { createContext, useContext } from 'react'

/**
 * Web presentation-layer selection (Approach C §7.2). `'none'` renders
 * `data-overlaid-styling="none"` on every chrome element so the stylesheet's
 * defaults and motion layers stand down app-wide; the reset layer always
 * applies. Native never reads this context.
 */
export type OverlayStyling = 'default' | 'none'

const OverlayStylingContext = createContext<OverlayStyling>('default')

export const OverlayStylingProvider = OverlayStylingContext.Provider

export function useOverlayStyling(): OverlayStyling {
  return useContext(OverlayStylingContext)
}

/** Spreadable marker; empty under 'default' so the DOM stays unchanged. */
export function stylingAttributes(
  styling: OverlayStyling,
): Record<string, string> {
  return styling === 'none' ? { 'data-overlaid-styling': 'none' } : {}
}
