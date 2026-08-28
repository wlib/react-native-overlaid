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

import { act, render, screen } from '@testing-library/react'
import { Text } from 'react-native'
import { OverlayHost } from '../../react/OverlayHost'
import { Popover } from '../Popover'

const advance = (ms: number) => {
  act(() => jest.advanceTimersByTime(ms))
}

const panel = () =>
  document.querySelector('[data-overlaid-popover]') as HTMLElement | null

const transitionEvent = (type: string, propertyName = 'opacity') =>
  Object.assign(new Event(type, { bubbles: true }), { propertyName })

const ui = (open: boolean, style?: Record<string, string>) => (
  <OverlayHost>
    <Popover open={open} onOpenChange={() => {}} closeOnScroll={false}>
      <Popover.Trigger>
        <Text>trigger</Text>
      </Popover.Trigger>
      <Popover.Content {...(style ? { style } : {})}>
        <Text>popover body</Text>
      </Popover.Content>
    </Popover>
  </OverlayHost>
)

// The web exit contract (§7.3.1): transition accounting is the primary exit
// truth, and exitMs demotes to the floor of a computed ceiling — both are
// observable end-to-end through a Popover whose exit budget is 120 ms.
describe('web exit accounting through the popover chrome', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('holds unmount past the exitMs budget while a counted transition runs', () => {
    const view = render(ui(true))
    advance(20)
    expect(screen.getByText('popover body')).toBeTruthy()

    view.rerender(ui(false))
    act(() => {
      panel()?.dispatchEvent(transitionEvent('transitionrun'))
    })

    // Budget (120 ms) elapses but the counted transition has not settled;
    // under the old timer-primary contract this would already be unmounted.
    advance(200)
    expect(panel()).not.toBeNull()

    act(() => {
      panel()?.dispatchEvent(transitionEvent('transitionend'))
    })
    expect(panel()).toBeNull()
  })

  it('completes within two frames when no transition ever starts', () => {
    const view = render(ui(true))
    advance(20)

    view.rerender(ui(false))
    expect(panel()).not.toBeNull()
    advance(40)
    expect(panel()).toBeNull()
  })

  it('raises the safety ceiling to the computed exit duration plus slack', () => {
    const view = render(ui(true, { transitionDuration: '500ms' }))
    advance(20)

    view.rerender(ui(false, { transitionDuration: '500ms' }))
    act(() => {
      panel()?.dispatchEvent(transitionEvent('transitionrun'))
    })

    // Ceiling = max(120, 500) + 100. The transition never settles (a
    // display:none ancestor, a throttled tab): the net must still fire, but
    // only after the consumer's declared exit had its chance.
    advance(550)
    expect(panel()).not.toBeNull()
    advance(100)
    expect(panel()).toBeNull()
  })
})
