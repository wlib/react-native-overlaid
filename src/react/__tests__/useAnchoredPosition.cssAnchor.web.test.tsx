import { renderHook } from '@testing-library/react'
import { useAnchoredPosition } from '../useAnchoredPosition'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  ResizeObserverStub

const noopRef = () => {}

describe('css-anchor position engine (resolved web.positioning="css-anchor")', () => {
  it('emits the stylesheet inputs instead of pixel positions', () => {
    const { result } = renderHook(() =>
      useAnchoredPosition(
        {
          anchor: noopRef,
          surface: noopRef,
          placement: 'top-end',
          offset: 6,
          positioning: 'css-anchor',
        },
        true,
      ),
    )

    expect(result.current.panelStyle).toEqual({
      position: 'fixed',
      '--overlaid-position-anchor': expect.stringMatching(
        /^--overlaid-anchor-\d+$/,
      ),
      '--overlaid-position-area': 'top span-left',
      '--overlaid-anchor-offset': '6px',
    })
    expect(result.current.panelProps).toEqual({
      'data-overlaid-anchored': 'css',
      'data-overlaid-placement': 'top-end',
    })
    // CSS places synchronously, so the panel is positioned once open —
    // layoutReady gates on this.
    expect(result.current.isPositioned).toBe(true)
  })

  it('writes a per-instance anchor-name onto the trigger element', () => {
    const trigger = document.createElement('button')
    const setProperty = jest.spyOn(trigger.style, 'setProperty')
    const { result, unmount } = renderHook(() =>
      useAnchoredPosition(
        {
          anchor: noopRef,
          surface: noopRef,
          placement: 'bottom-start',
          positioning: 'css-anchor',
        },
        true,
      ),
    )

    result.current.refs.anchor(trigger)
    expect(setProperty).toHaveBeenCalledWith(
      'anchor-name',
      result.current.panelStyle['--overlaid-position-anchor'],
    )

    const removeProperty = jest.spyOn(trigger.style, 'removeProperty')
    result.current.refs.anchor(null)
    expect(removeProperty).toHaveBeenCalledWith('anchor-name')
    unmount()
  })

  it('gives two instances distinct anchor names', () => {
    const spec = {
      anchor: noopRef,
      surface: noopRef,
      positioning: 'css-anchor' as const,
    }
    const first = renderHook(() => useAnchoredPosition(spec, true))
    const second = renderHook(() => useAnchoredPosition(spec, true))
    expect(
      first.result.current.panelStyle['--overlaid-position-anchor'],
    ).not.toBe(second.result.current.panelStyle['--overlaid-position-anchor'])
  })

  it('keeps the Floating UI contract when css-anchor is not resolved', () => {
    const { result } = renderHook(() =>
      useAnchoredPosition(
        { anchor: noopRef, surface: noopRef, placement: 'top' },
        true,
      ),
    )
    expect(result.current.panelProps).toBeUndefined()
    expect(result.current.panelStyle).toHaveProperty('top')
    expect(result.current.panelStyle).toHaveProperty('left')
  })
})
