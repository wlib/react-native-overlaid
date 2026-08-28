import { render } from '@testing-library/react'
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

  it('listens only while dismissing; without an event the exitMs timer owns completion', () => {
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
