'use client'

// WEB exit reconciliation.
// During phase === 'dismissing', listen for the surface's own transition or
// animation end (on the element carrying data-overlaid-reveal, filtered to
// event.target === element so a child's bubbling transitionend cannot
// complete the exit) and report completion early. `exitMs` stays the
// ceiling: the setTimeout in useOverlayLifecycle is untouched and fires when
// CSS never completes (display:none ancestors, canceled transitions, jsdom).
// `onExitComplete` is stale-guarded, so a late event in any other phase is a
// no-op. Consumers can therefore *shorten* an exit through CSS but never
// lengthen unmount beyond the budget, which would hold <dialog>s open.
import { useEffect } from 'react'
import { useOverlayContext } from '../react/overlayContext'

export function useExitTransition(): void {
  const { state, signals, refs } = useOverlayContext()
  const phase = state.phase

  useEffect(() => {
    if (phase !== 'dismissing') return
    const element = refs.panel.current
    if (
      typeof HTMLElement === 'undefined' ||
      !(element instanceof HTMLElement)
    ) {
      return
    }
    const onEnd = (event: Event) => {
      if (event.target !== element) return
      signals.onExitComplete()
    }
    element.addEventListener('transitionend', onEnd)
    element.addEventListener('animationend', onEnd)
    return () => {
      element.removeEventListener('transitionend', onEnd)
      element.removeEventListener('animationend', onEnd)
    }
  }, [phase, refs.panel, signals])
}
