import { act, render } from '@testing-library/react'
import { useExitTransition } from '../useExitTransition'

const mockExitComplete = jest.fn()
const mockContext = {
  state: {
    phase: 'dismissing',
    isMounted: true,
    isOpen: false,
    isPresented: false,
  },
  signals: { onExitComplete: mockExitComplete },
  refs: { panel: { current: null as HTMLElement | null } },
}

jest.mock('../../react/overlayContext', () => ({
  useOverlayContext: () => mockContext,
}))

function Harness() {
  useExitTransition()
  return (
    <div
      ref={(node) => {
        mockContext.refs.panel.current = node
      }}
      data-overlaid-reveal=""
    >
      <span data-testid="child">content</span>
    </div>
  )
}

function transitionEvent(type: string, propertyName = 'opacity') {
  return Object.assign(new Event(type, { bubbles: true }), { propertyName })
}

beforeEach(() => {
  mockExitComplete.mockReset()
  mockContext.state.phase = 'dismissing'
  mockContext.refs.panel.current = null
})

describe('useExitTransition (web)', () => {
  it("completes the exit early on the surface's own transitionend", () => {
    const screen = render(<Harness />)
    const panel = mockContext.refs.panel.current as HTMLElement

    panel.dispatchEvent(new Event('transitionend', { bubbles: true }))
    expect(mockExitComplete).toHaveBeenCalledTimes(1)

    // animationend is an equally valid completion for keyframe-based exits.
    panel.dispatchEvent(new Event('animationend', { bubbles: true }))
    expect(mockExitComplete).toHaveBeenCalledTimes(2)
    screen.unmount()
  })

  it("ignores a child's bubbling transitionend (target filter)", () => {
    const screen = render(<Harness />)
    screen
      .getByTestId('child')
      .dispatchEvent(new Event('transitionend', { bubbles: true }))
    expect(mockExitComplete).not.toHaveBeenCalled()
    screen.unmount()
  })

  it('drains counted transitions before completing (multi-property exit)', () => {
    const screen = render(<Harness />)
    const panel = mockContext.refs.panel.current as HTMLElement

    panel.dispatchEvent(transitionEvent('transitionrun', 'opacity'))
    panel.dispatchEvent(transitionEvent('transitionrun', 'transform'))
    panel.dispatchEvent(transitionEvent('transitionend', 'opacity'))
    expect(mockExitComplete).not.toHaveBeenCalled()

    panel.dispatchEvent(transitionEvent('transitionend', 'transform'))
    expect(mockExitComplete).toHaveBeenCalledTimes(1)
    screen.unmount()
  })

  it('treats transitioncancel as draining a counted transition', () => {
    const screen = render(<Harness />)
    const panel = mockContext.refs.panel.current as HTMLElement

    panel.dispatchEvent(transitionEvent('transitionrun'))
    expect(mockExitComplete).not.toHaveBeenCalled()
    panel.dispatchEvent(transitionEvent('transitioncancel'))
    expect(mockExitComplete).toHaveBeenCalledTimes(1)
    screen.unmount()
  })

  it('ignores an uncounted transitioncancel (interrupted entry reveal)', () => {
    const screen = render(<Harness />)
    const panel = mockContext.refs.panel.current as HTMLElement

    // The entry transition's run predates the dismissal subscription; its
    // cancel must not complete the exit before the retargeted run arrives.
    panel.dispatchEvent(transitionEvent('transitioncancel'))
    expect(mockExitComplete).not.toHaveBeenCalled()

    panel.dispatchEvent(transitionEvent('transitionrun'))
    panel.dispatchEvent(transitionEvent('transitionend'))
    expect(mockExitComplete).toHaveBeenCalledTimes(1)
    screen.unmount()
  })

  it('completes after two frames when no transition begins', () => {
    jest.useFakeTimers()
    try {
      const screen = render(<Harness />)
      expect(mockExitComplete).not.toHaveBeenCalled()

      act(() => jest.advanceTimersByTime(40))
      expect(mockExitComplete).toHaveBeenCalledTimes(1)
      screen.unmount()
    } finally {
      jest.useRealTimers()
    }
  })

  it('defers to a live animation the events have not announced yet', () => {
    // Chromium delivers transitionrun asynchronously after the style recalc
    // that starts the transition; under fast frame timing the second frame
    // can beat that delivery. getAnimations() is the race-free truth.
    jest.useFakeTimers()
    try {
      const screen = render(<Harness />)
      const panel = mockContext.refs.panel.current as HTMLElement
      panel.getAnimations = () => [{} as Animation]

      act(() => jest.advanceTimersByTime(200))
      expect(mockExitComplete).not.toHaveBeenCalled()

      // The lagging events arrive and drain the accounting normally.
      panel.dispatchEvent(transitionEvent('transitionrun'))
      panel.dispatchEvent(transitionEvent('transitionend'))
      expect(mockExitComplete).toHaveBeenCalledTimes(1)
      screen.unmount()
    } finally {
      jest.useRealTimers()
    }
  })

  it('still completes after two frames when getAnimations is empty', () => {
    jest.useFakeTimers()
    try {
      const screen = render(<Harness />)
      const panel = mockContext.refs.panel.current as HTMLElement
      panel.getAnimations = () => []

      act(() => jest.advanceTimersByTime(40))
      expect(mockExitComplete).toHaveBeenCalledTimes(1)
      screen.unmount()
    } finally {
      jest.useRealTimers()
    }
  })

  it('holds the two-frame completion once a transition has begun', () => {
    jest.useFakeTimers()
    try {
      const screen = render(<Harness />)
      const panel = mockContext.refs.panel.current as HTMLElement

      panel.dispatchEvent(transitionEvent('transitionrun'))
      act(() => jest.advanceTimersByTime(200))
      expect(mockExitComplete).not.toHaveBeenCalled()

      panel.dispatchEvent(transitionEvent('transitionend'))
      expect(mockExitComplete).toHaveBeenCalledTimes(1)
      screen.unmount()
    } finally {
      jest.useRealTimers()
    }
  })

  it('listens only while dismissing; without an event the ceiling timer owns completion', () => {
    mockContext.state.phase = 'presented'
    const screen = render(<Harness />)
    const panel = mockContext.refs.panel.current as HTMLElement

    // An entry transition ending must not report exit completion (the
    // signal is stale-guarded anyway, but no listener should even exist).
    panel.dispatchEvent(new Event('transitionend', { bubbles: true }))
    expect(mockExitComplete).not.toHaveBeenCalled()
    screen.unmount()
  })
})
