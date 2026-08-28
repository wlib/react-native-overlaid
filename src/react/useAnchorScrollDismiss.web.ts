import { useEffect, useRef } from 'react'
import type { AnchorScrollDismissOptions } from './useAnchorScrollDismiss'

export type { AnchorScrollDismissOptions }

export function useAnchorScrollDismiss({
  enabled,
  panelRef,
  onDismiss,
}: AnchorScrollDismissOptions): void {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!enabled || typeof addEventListener === 'undefined') return
    let fired = false
    const dismissOnce = () => {
      if (fired) return
      fired = true
      onDismissRef.current()
    }
    const onScroll = (event: Event) => {
      const panel = panelRef?.current
      if (
        typeof Node !== 'undefined' &&
        panel instanceof Node &&
        event.target instanceof Node &&
        panel.contains(event.target)
      ) {
        return
      }
      dismissOnce()
    }
    const options = { capture: true, passive: true }
    addEventListener('scroll', onScroll, options)
    addEventListener('resize', dismissOnce, options)
    return () => {
      removeEventListener('scroll', onScroll, options)
      removeEventListener('resize', dismissOnce, options)
    }
  }, [enabled, panelRef])
}
