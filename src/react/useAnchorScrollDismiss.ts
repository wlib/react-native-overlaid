import { useEffect, useRef, type RefObject } from 'react'
import type { View } from 'react-native'
import { measureNodeInWindow } from './measurement'

export type AnchorScrollDismissOptions = {
  enabled: boolean
  /** Delay polling until initial placement is stable. */
  armed?: boolean
  triggerRef: RefObject<unknown>
  /** Web exempts scroll events originating inside the floating panel. */
  panelRef?: RefObject<unknown>
  onDismiss: () => void
  thresholdPx?: number
  pollMs?: number
}

/** Native has no capture-phase scroll channel, so detect anchor drift. */
export function useAnchorScrollDismiss({
  enabled,
  armed = true,
  triggerRef,
  onDismiss,
  thresholdPx = 1,
  pollMs = 100,
}: AnchorScrollDismissOptions): void {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!enabled || !armed) return
    let cancelled = false
    let measuring = false
    let fired = false
    let baseline: { x: number; y: number } | undefined

    const tick = async () => {
      // Avoid overlapping native bridge measurements on a slow frame.
      if (measuring || cancelled || fired) return
      measuring = true
      const measurement = await measureNodeInWindow(
        triggerRef as RefObject<View | null>,
      )
      measuring = false
      if (cancelled || fired || !measurement) return
      if (!baseline) {
        baseline = { x: measurement.x, y: measurement.y }
      } else if (
        Math.abs(measurement.x - baseline.x) > thresholdPx ||
        Math.abs(measurement.y - baseline.y) > thresholdPx
      ) {
        fired = true
        onDismissRef.current()
      }
    }

    void tick()
    const interval = setInterval(() => void tick(), pollMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [armed, enabled, pollMs, thresholdPx, triggerRef])
}
