/**
 * Hover intent engine for hint overlays (Tooltip).
 *
 * Platform-free timer logic implementing the "delayed-then-instant" model:
 * the first hover in a host waits `delayMs`, but while any hint in that host
 * is open — or for `warmthMs` after the last one closed — hover opens
 * instantly. Warmth is host-scoped state over time, so it lives here in a
 * registry keyed by LayerHost identity: tooltips inside a Modal's child
 * LayerHost warm each other but not the page behind, matching the layer
 * model. Focus is always instant (the user already paid the traversal
 * cost — explicit intent, per WCAG), and blur closes immediately.
 *
 * The hook observes `isOpen` rather than owning it: every close, whatever
 * its cause (grace timer, Escape, scroll dismiss), starts the warm window
 * and clears stale timers. Interest Invokers are deliberately not consulted
 * here — this JS engine is the permanent primary path on the web.
 */
import { useEffect, useMemo, useRef } from 'react'
import type { LayerHost } from '../core/types'

export type HoverIntentConfig = {
  /** ms of hover before opening; `false` opens immediately. */
  delayMs: number | false
  /** warm-window length after any hint in the host closes; `false` disables. */
  warmthMs: number | false
  /** ms of leave grace before closing an open hint. */
  closeGraceMs: number
}

/**
 * A thunk defers resolution to the moment a timer is armed, so values that
 * come from the DOM (the CSS timing tokens, read at first hover) reach the
 * engine without a render in between.
 */
export type HoverIntentConfigInput =
  HoverIntentConfig | (() => HoverIntentConfig)

export type HoverIntentCallbacks = {
  onOpen: () => void
  onClose: () => void
}

export type HoverIntentHandle = {
  /** Mouse only — the caller filters pointerType, as the chrome does today. */
  pointerEnter: () => void
  pointerLeave: () => void
  /** Instant open. */
  focus: () => void
  /** Instant close. */
  blur: () => void
  /** Clears a pending delayed open (wired to Escape while nothing is shown). */
  cancel: () => void
}

type HostWarmth = { warmUntil: number; openHints: number }

/** Hints rendered outside any OverlayHost still warm each other app-wide. */
const DETACHED_HOST_KEY: object = {}
const warmthRegistry = new WeakMap<object, HostWarmth>()

function warmthFor(host: LayerHost | null): HostWarmth {
  const key: object = host ?? DETACHED_HOST_KEY
  let entry = warmthRegistry.get(key)
  if (!entry) {
    entry = { warmUntil: 0, openHints: 0 }
    warmthRegistry.set(key, entry)
  }
  return entry
}

type Timer = ReturnType<typeof setTimeout>

export function useHoverIntent(
  host: LayerHost | null,
  isOpen: boolean,
  config: HoverIntentConfigInput,
  callbacks: HoverIntentCallbacks,
): HoverIntentHandle {
  const openTimer = useRef<Timer | null>(null)
  const closeTimer = useRef<Timer | null>(null)
  const hostRef = useRef(host)
  const isOpenRef = useRef(isOpen)
  const configRef = useRef(config)
  const callbacksRef = useRef(callbacks)
  hostRef.current = host
  isOpenRef.current = isOpen
  configRef.current = config
  callbacksRef.current = callbacks

  // Warmth accounting on open-state edges. A close from any channel starts
  // the warm window; an open from any channel drops a stale pending timer.
  const wasOpen = useRef(isOpen)
  useEffect(() => {
    if (isOpen === wasOpen.current) return
    wasOpen.current = isOpen
    const warmth = warmthFor(hostRef.current)
    if (isOpen) {
      warmth.openHints += 1
      clearTimer(openTimer)
    } else {
      warmth.openHints = Math.max(0, warmth.openHints - 1)
      const { warmthMs } = resolveConfig(configRef.current)
      if (warmthMs !== false) warmth.warmUntil = Date.now() + warmthMs
      clearTimer(closeTimer)
    }
  }, [isOpen])

  // Unmounting an open hint must release its registry count (and still
  // warm the host — the hint did just leave the screen).
  useEffect(
    () => () => {
      clearTimer(openTimer)
      clearTimer(closeTimer)
      if (!isOpenRef.current) return
      const warmth = warmthFor(hostRef.current)
      warmth.openHints = Math.max(0, warmth.openHints - 1)
      const { warmthMs } = resolveConfig(configRef.current)
      if (warmthMs !== false) warmth.warmUntil = Date.now() + warmthMs
    },
    [],
  )

  return useMemo<HoverIntentHandle>(() => {
    const open = () => callbacksRef.current.onOpen()
    return {
      pointerEnter: () => {
        clearTimer(closeTimer)
        if (isOpenRef.current) return
        const { delayMs } = resolveConfig(configRef.current)
        const warmth = warmthFor(hostRef.current)
        const instant =
          delayMs === false ||
          warmth.openHints > 0 ||
          Date.now() < warmth.warmUntil
        if (instant) {
          clearTimer(openTimer)
          open()
          return
        }
        if (openTimer.current !== null) return
        openTimer.current = setTimeout(() => {
          openTimer.current = null
          open()
        }, delayMs)
      },
      pointerLeave: () => {
        clearTimer(openTimer)
        if (!isOpenRef.current) return
        clearTimer(closeTimer)
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null
          callbacksRef.current.onClose()
        }, resolveConfig(configRef.current).closeGraceMs)
      },
      focus: () => {
        clearTimer(openTimer)
        clearTimer(closeTimer)
        if (!isOpenRef.current) open()
      },
      blur: () => {
        clearTimer(openTimer)
        clearTimer(closeTimer)
        if (isOpenRef.current) callbacksRef.current.onClose()
      },
      cancel: () => clearTimer(openTimer),
    }
  }, [])
}

function clearTimer(timer: { current: Timer | null }): void {
  if (timer.current === null) return
  clearTimeout(timer.current)
  timer.current = null
}

function resolveConfig(config: HoverIntentConfigInput): HoverIntentConfig {
  return typeof config === 'function' ? config() : config
}
