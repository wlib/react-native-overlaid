'use client'

// WEB exit reconciliation: transition accounting is the primary exit truth.
// During phase === 'dismissing', count the surface's own transitionrun /
// transitionend / transitioncancel pairs (filtered to event.target ===
// element so a child's bubbling events cannot complete the exit) and report
// completion when the count drains — or after two frames when no transition
// begins at all (no-motion styling, jsdom, `styling="none"`).
//
// A transition whose run predates the subscription (an interrupted entry
// reveal) is uncounted: its transitioncancel is ignored (the retargeted exit
// run for that property follows in the same style update), while an
// uncounted transitionend still completes when nothing counted is
// outstanding — a finished own-transition has always meant a finished exit.
// The lifecycle's ceiling timer (max(exitMs, computed exit duration) +
// slack, see exitCeiling.web) fires when events never arrive; consumers can
// therefore both shorten AND lengthen exits through CSS on web.
// `onExitComplete` is stale-guarded, so a late event in any other phase is a
// no-op.
import { useEffect } from 'react'
import { useOverlayContext } from '../react/overlayContext'

function transitionKey(event: Event): string {
  const transition = event as TransitionEvent
  return `${transition.propertyName ?? ''}::${transition.pseudoElement ?? ''}`
}

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
    const counted = new Map<string, number>()
    let outstanding = 0
    let sawTransition = false
    let frame: number | null = null

    const complete = () => signals.onExitComplete()
    const onRun = (event: Event) => {
      if (event.target !== element) return
      sawTransition = true
      const key = transitionKey(event)
      counted.set(key, (counted.get(key) ?? 0) + 1)
      outstanding += 1
    }
    const onSettle = (event: Event) => {
      if (event.target !== element) return
      sawTransition = true
      const key = transitionKey(event)
      const pending = counted.get(key) ?? 0
      if (pending > 0) {
        counted.set(key, pending - 1)
        outstanding -= 1
        if (outstanding === 0) complete()
        return
      }
      // Uncounted settle: an end still completes an idle exit, but a cancel
      // is an interrupted entry transition being retargeted — ignore it.
      if (event.type === 'transitionend' && outstanding === 0) complete()
    }
    const onAnimationEnd = (event: Event) => {
      if (event.target !== element) return
      sawTransition = true
      if (outstanding === 0) complete()
    }

    element.addEventListener('transitionrun', onRun)
    element.addEventListener('transitionend', onSettle)
    element.addEventListener('transitioncancel', onSettle)
    element.addEventListener('animationend', onAnimationEnd)
    if (typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = null
          if (!sawTransition) complete()
        })
      })
    }
    return () => {
      element.removeEventListener('transitionrun', onRun)
      element.removeEventListener('transitionend', onSettle)
      element.removeEventListener('transitioncancel', onSettle)
      element.removeEventListener('animationend', onAnimationEnd)
      if (frame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frame)
      }
    }
  }, [phase, refs.panel, signals])
}
