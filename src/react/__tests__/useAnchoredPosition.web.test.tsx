;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  ResizeObserverStub

import { act, renderHook } from '@testing-library/react'
import { setWebCapabilityOverrides } from '../../chrome/webCapabilities'
import { useAnchoredPosition } from '../useAnchoredPosition'

const CSS_CAPS = { anchorPositioning: true, positionTryFallbacks: true }

afterEach(() => setWebCapabilityOverrides(null))

const base = { anchor: () => {}, surface: () => {} }

describe('web positioning engine selection (§6.3)', () => {
  it('selects CSS Anchor Positioning only for closeOnScroll={false} without a boundary', () => {
    setWebCapabilityOverrides(CSS_CAPS)
    const { result } = renderHook(() =>
      useAnchoredPosition(
        { ...base, placement: 'top', offset: 6, closeOnScroll: false },
        true,
      ),
    )
    expect(result.current.panelStyle['positionArea']).toBe('top')
    expect(result.current.panelStyle['marginBottom']).toBe(6)
    expect(result.current.panelStyle['top']).toBeUndefined()
    // CSS positions in the same paint the panel appears in: the layout gate
    // is satisfied immediately.
    expect(result.current.isPositioned).toBe(true)
  })

  it('keeps Floating UI when any page scroll dismisses the overlay (default)', () => {
    setWebCapabilityOverrides(CSS_CAPS)
    const { result } = renderHook(() =>
      useAnchoredPosition({ ...base, placement: 'top' }, true),
    )
    expect(result.current.panelStyle['positionArea']).toBeUndefined()
    expect(result.current.panelStyle['position']).toBe('absolute')
  })

  it('keeps Floating UI for a boundaryRef and for missing capabilities', () => {
    setWebCapabilityOverrides(CSS_CAPS)
    const bounded = renderHook(() =>
      useAnchoredPosition(
        {
          ...base,
          closeOnScroll: false,
          boundaryRef: { current: null },
        },
        true,
      ),
    )
    expect(bounded.result.current.panelStyle['positionArea']).toBeUndefined()

    setWebCapabilityOverrides({ ...CSS_CAPS, anchorPositioning: false })
    const unsupported = renderHook(() =>
      useAnchoredPosition({ ...base, closeOnScroll: false }, true),
    )
    expect(
      unsupported.result.current.panelStyle['positionArea'],
    ).toBeUndefined()
  })

  it('names the anchor on the trigger element and cleans it up', () => {
    setWebCapabilityOverrides(CSS_CAPS)
    const { result } = renderHook(() =>
      useAnchoredPosition({ ...base, closeOnScroll: false }, true),
    )
    const trigger = document.createElement('button')
    const setProperty = jest.spyOn(trigger.style, 'setProperty')
    const removeProperty = jest.spyOn(trigger.style, 'removeProperty')

    act(() => result.current.refs.anchor(trigger))
    expect(setProperty).toHaveBeenCalledWith(
      'anchor-name',
      result.current.panelStyle['positionAnchor'],
    )
    act(() => result.current.refs.anchor(null))
    expect(removeProperty).toHaveBeenCalledWith('anchor-name')
  })
})
