/**
 * Auto-press support for automated screenshot capture.
 *
 * The iOS/Android screenshot pipeline (scripts/screenshots-ios.mjs) opens a
 * scenario via deep link (overlaid-example://scenario/<key>?autopress=1) and
 * needs the scenario's overlay OPEN without a human tap. When the flag is
 * set, every helper Button whose title starts with "Open " or "Toggle "
 * presses itself shortly after mounting — which also walks stacked
 * scenarios (a dialog trigger that mounts inside an auto-opened drawer
 * auto-presses in turn). Interactive use is unaffected: the context
 * defaults to false and only the deep-link path enables it.
 */
import { createContext, useContext, useEffect, useRef } from 'react'

const AutoPressContext = createContext(false)

export const AutoPressProvider = AutoPressContext.Provider

const AUTO_PRESS_TITLES = /^(Open |Toggle )/

/** Fire `onPress` shortly after mount when auto-press mode wants `title`. */
export function useAutoPress(title: string, onPress?: () => void) {
  const enabled = useContext(AutoPressContext)
  const pressRef = useRef(onPress)
  pressRef.current = onPress
  const fired = useRef(false)

  useEffect(() => {
    if (!enabled || fired.current || !AUTO_PRESS_TITLES.test(title)) return
    fired.current = true
    const timer = setTimeout(() => pressRef.current?.(), 350)
    return () => clearTimeout(timer)
  }, [enabled, title])
}
