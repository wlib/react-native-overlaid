import { act, renderHook } from '@testing-library/react-native'
import { createRef, StrictMode, type ReactNode } from 'react'
import type { LayerHost } from '../../core/types'
import { LayerHostProvider } from '../LayerHostContext'
import {
  useOverlayLifecycle,
  type OverlayLifecycleInput,
} from '../useOverlayLifecycle'

function spec(
  overrides: Partial<OverlayLifecycleInput> = {},
): OverlayLifecycleInput {
  return {
    open: true,
    onOpenChange: jest.fn(),
    kind: 'popover',
    behavior: 'auto',
    dismissable: true,
    exitMs: 200,
    presentGates: [],
    ...overrides,
  }
}

function setup(initial: OverlayLifecycleInput, strict = false) {
  const hostRef = createRef<LayerHost | null>()
  const wrapper = ({ children }: { children: ReactNode }) => {
    const tree = (
      <LayerHostProvider name="test" hostRef={hostRef}>
        {children}
      </LayerHostProvider>
    )
    return strict ? <StrictMode>{tree}</StrictMode> : tree
  }
  const hook = renderHook(
    (input: OverlayLifecycleInput) => useOverlayLifecycle(input),
    { initialProps: initial, wrapper },
  )
  return { ...hook, hostRef, host: () => hostRef.current as LayerHost }
}

describe('useOverlayLifecycle', () => {
  it('registers once, displaces once in StrictMode, and removes on unmount', () => {
    const view = setup(spec(), true)
    expect(view.host().getStack()).toHaveLength(1)
    expect(view.host().getStack()[0]?.id).toBe(view.result.current.id)

    const displacement = jest.spyOn(view.host(), 'dismissTransient')
    view.rerender(spec({ open: false, exitMs: 0 }))
    view.rerender(spec())
    expect(displacement).toHaveBeenCalledTimes(1)

    view.unmount()
    expect(view.hostRef.current).toBeNull()
  })

  it('applies veto, force, dismissability, and the synchronous dying guard', async () => {
    const onOpenChange = jest.fn()
    const view = setup(spec({ dismissable: false, onOpenChange }))
    const entry = view.host().getStack()[0]
    expect(entry?.fire('escape')).toBe(false)

    await act(async () => {
      expect(entry?.fire('outside-press', { force: true })).toBe(true)
      expect(entry?.fire('outside-press', { force: true })).toBe(false)
    })
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(view.result.current.state.isMounted).toBe(false)
  })

  it('refuses a second same-turn dismissal after eagerly entering dismissing', () => {
    const view = setup(spec())
    const entry = view.host().getStack()[0]
    act(() => {
      expect(entry?.fire('escape')).toBe(true)
      expect(entry?.fire('escape')).toBe(false)
    })
    expect(view.result.current.state.phase).toBe('dismissing')
  })

  it('keeps carried gates on reopen and ignores the stale exit completion', () => {
    const view = setup(spec({ presentGates: ['layoutReady'] }))
    act(() => view.result.current.signals.onLayoutReady())
    expect(view.result.current.state.phase).toBe('presented')

    act(() => view.result.current.actions.requestClose())
    expect(view.result.current.state.phase).toBe('dismissing')
    view.rerender(spec({ open: false, presentGates: ['layoutReady'] }))
    view.rerender(spec({ open: true, presentGates: ['layoutReady'] }))
    expect(view.result.current.state.phase).toBe('presented')

    act(() => view.result.current.signals.onExitComplete())
    expect(view.result.current.state.phase).toBe('presented')
  })

  it('notifies a native-reported close even when exitComplete is batched', () => {
    const onOpenChange = jest.fn()
    const view = setup(spec({ onOpenChange }))
    act(() => {
      view.result.current.actions.setOpen(false)
      view.result.current.signals.onExitComplete()
    })
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
