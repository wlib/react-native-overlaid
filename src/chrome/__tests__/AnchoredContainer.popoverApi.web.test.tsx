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
const { StrictMode } = require('react') as typeof ReactModule
const { act, render } =
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
})
