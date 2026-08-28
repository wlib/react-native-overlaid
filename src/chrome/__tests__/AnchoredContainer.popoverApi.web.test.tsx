import type * as ReactModule from 'react'
import type * as TestingLibraryModule from '@testing-library/react'
import type * as ReactNativeModule from 'react-native'
import type * as OverlayHostModule from '../../react/OverlayHost.web'
import type * as PopoverModule from '../../components/Popover'
import type * as WebCapabilitiesModule from '../webCapabilities'
import type { Ref } from 'react'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const openPopovers = new WeakSet<Element>()

Object.defineProperty(HTMLElement.prototype, 'popover', {
  value: null,
  writable: true,
  configurable: true,
})
;(
  HTMLElement.prototype as HTMLElement & { showPopover: () => void }
).showPopover = function () {
  if (openPopovers.has(this)) {
    throw new DOMException('Popover is already showing.', 'InvalidStateError')
  }
  openPopovers.add(this)
  setTimeout(() => {
    this.dispatchEvent(
      Object.assign(new Event('toggle'), {
        oldState: 'closed',
        newState: 'open',
      }),
    )
  }, 0)
}
;(
  HTMLElement.prototype as HTMLElement & { hidePopover: () => void }
).hidePopover = function () {
  if (!openPopovers.has(this)) {
    throw new DOMException('Popover is already hidden.', 'InvalidStateError')
  }
  openPopovers.delete(this)
  setTimeout(() => {
    this.dispatchEvent(
      Object.assign(new Event('toggle'), {
        oldState: 'open',
        newState: 'closed',
      }),
    )
  }, 0)
}

const nativeMatches = Element.prototype.matches
Element.prototype.matches = function (selector: string) {
  if (selector === ':popover-open') return openPopovers.has(this)
  return nativeMatches.call(this, selector)
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  ResizeObserverStub

/* eslint-disable @typescript-eslint/no-require-imports */
const { StrictMode, useState } = require('react') as typeof ReactModule
const { act, fireEvent, render, screen } =
  require('@testing-library/react') as typeof TestingLibraryModule
const { Text } = require('react-native') as typeof ReactNativeModule
const { OverlayHost } =
  require('../../react/OverlayHost') as typeof OverlayHostModule
const { Popover } = require('../../components/Popover') as typeof PopoverModule
const { setWebCapabilityOverrides } =
  require('../webCapabilities') as typeof WebCapabilitiesModule
/* eslint-enable @typescript-eslint/no-require-imports */

// The prototype mocks above provide the popover *behavior* jsdom lacks; the
// registry override pins the *branch* selection, per the capability test
// strategy (F4).
beforeAll(() => setWebCapabilityOverrides({ popover: true }))
afterAll(() => setWebCapabilityOverrides(null))

const ui = (
  dismissable: boolean,
  onOpenChange: (next: boolean) => void = () => {},
) => (
  <OverlayHost>
    <Popover
      open
      onOpenChange={onOpenChange}
      dismissable={dismissable}
      closeOnScroll={false}
    >
      <Popover.Trigger>
        {({ ref }) => (
          <button ref={ref as Ref<HTMLButtonElement>} type="button">
            trigger
          </button>
        )}
      </Popover.Trigger>
      <Popover.Content>
        <Text>popover body</Text>
      </Popover.Content>
    </Popover>
  </OverlayHost>
)

const controlledUi = (open: boolean) => (
  <OverlayHost>
    <Popover open={open} onOpenChange={() => {}} closeOnScroll={false}>
      <Popover.Trigger>
        {({ ref }) => (
          <button ref={ref as Ref<HTMLButtonElement>} type="button">
            trigger
          </button>
        )}
      </Popover.Trigger>
      <Popover.Content>
        <Text>popover body</Text>
      </Popover.Content>
    </Popover>
  </OverlayHost>
)

describe('web Popover API synchronization', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('guards showPopover across StrictMode replay', () => {
    expect(() => {
      render(<StrictMode>{ui(true)}</StrictMode>)
      act(() => jest.advanceTimersByTime(50))
    }).not.toThrow()

    const panel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement
    expect(panel.getAttribute('popover')).toBe('manual')
    expect(panel.matches(':popover-open')).toBe(true)
  })

  it('reconciles browser light-dismiss and re-shows when policy refuses', () => {
    const accepted = jest.fn()
    const first = render(ui(true, accepted))
    act(() => jest.advanceTimersByTime(20))
    const acceptedPanel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement

    act(() => {
      acceptedPanel.hidePopover()
      jest.advanceTimersByTime(20)
    })
    expect(accepted).toHaveBeenCalledWith(false)
    first.unmount()

    const refused = jest.fn()
    render(ui(false, refused))
    act(() => jest.advanceTimersByTime(20))
    const refusedPanel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement
    act(() => {
      refusedPanel.hidePopover()
      jest.advanceTimersByTime(20)
    })

    expect(refused).not.toHaveBeenCalledWith(false)
    expect(refusedPanel.matches(':popover-open')).toBe(true)
  })

  it('re-asserts an accepted browser close on reopen mid-exit', () => {
    // An accepted light-dismiss leaves the surface natively hidden while
    // the kernel runs its exit (the element itself stays mounted), so a
    // reopen inside the exit budget must call showPopover again — the show
    // branch is keyed on isOpen, which isMounted keying would miss.
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <button type="button" onClick={() => setOpen(true)}>
            reopen
          </button>
          <Popover open={open} onOpenChange={setOpen} closeOnScroll={false}>
            <Popover.Trigger>
              {({ ref }) => (
                <button ref={ref as Ref<HTMLButtonElement>} type="button">
                  trigger
                </button>
              )}
            </Popover.Trigger>
            <Popover.Content>
              <Text>popover body</Text>
            </Popover.Content>
          </Popover>
        </OverlayHost>
      )
    }
    render(<Harness />)
    act(() => jest.advanceTimersByTime(20))
    const panel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement

    act(() => {
      panel.hidePopover()
      jest.advanceTimersByTime(20)
    })
    expect(panel.matches(':popover-open')).toBe(false)
    expect(panel.isConnected).toBe(true)

    fireEvent.click(screen.getByText('reopen'))
    act(() => jest.advanceTimersByTime(20))
    expect(panel.matches(':popover-open')).toBe(true)
    expect(panel.dataset.overlaidPhase).not.toBe('dismissing')
  })
})

// §7.3.2: with discrete transitions + the overlay property, the chrome
// closes the platform popover at dismissal start (CSS keeps it painted via
// allow-discrete/overlay) and unmounts at the accounting drain. The same
// prototype mocks provide the platform; only the capability pins differ.
describe('close-first exits (discreteTransitions + overlayProperty)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setWebCapabilityOverrides({
      popover: true,
      discreteTransitions: true,
      overlayProperty: true,
    })
  })
  afterEach(() => {
    jest.useRealTimers()
    setWebCapabilityOverrides({ popover: true })
  })

  it('hides the platform popover at dismissal start and unmounts at drain', () => {
    const view = render(controlledUi(true))
    act(() => jest.advanceTimersByTime(20))
    const panel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement
    expect(panel.matches(':popover-open')).toBe(true)

    view.rerender(controlledUi(false))
    expect(panel.matches(':popover-open')).toBe(false)
    expect(panel.dataset.overlaidPhase).toBe('dismissing')
    expect(document.querySelector('[data-overlaid-popover]')).not.toBeNull()

    // No transition ever starts in jsdom: the two-frame accounting path
    // completes the exit (the queued toggle from hidePopover fires along
    // the way and must be absorbed, not re-reported).
    act(() => jest.advanceTimersByTime(60))
    expect(document.querySelector('[data-overlaid-popover]')).toBeNull()
  })

  it('re-shows the platform popover on reopen-mid-exit', () => {
    const view = render(controlledUi(true))
    act(() => jest.advanceTimersByTime(20))
    const panel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement

    view.rerender(controlledUi(false))
    expect(panel.matches(':popover-open')).toBe(false)

    view.rerender(controlledUi(true))
    expect(panel.matches(':popover-open')).toBe(true)
    // The interrupted exit must not complete against the reopened overlay:
    // the same panel stays mounted and platform-shown once timers settle.
    act(() => jest.advanceTimersByTime(50))
    expect(document.querySelector('[data-overlaid-popover]')).toBe(panel)
    expect(panel.matches(':popover-open')).toBe(true)
    expect(panel.dataset.overlaidPhase).not.toBe('dismissing')
  })
})
