import type * as ReactModule from 'react'
import type * as TestingLibraryModule from '@testing-library/react'
import type * as ReactNativeModule from 'react-native'
import type * as OverlayHostModule from '../../react/OverlayHost.web'
import type * as PopoverModule from '../../components/Popover'
import type * as WebCapabilitiesModule from '../webCapabilities'
import type * as DismissInputModule from '../../react/dismissInputRecord'
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
const { useState } = require('react') as typeof ReactModule
const { act, fireEvent, render, screen } =
  require('@testing-library/react') as typeof TestingLibraryModule
const { Text } = require('react-native') as typeof ReactNativeModule
const { OverlayHost } =
  require('../../react/OverlayHost') as typeof OverlayHostModule
const { Popover } = require('../../components/Popover') as typeof PopoverModule
const { setWebCapabilityOverrides } =
  require('../webCapabilities') as typeof WebCapabilitiesModule
const { resetDismissInputRecord } =
  require('../../react/dismissInputRecord') as typeof DismissInputModule
/* eslint-enable @typescript-eslint/no-require-imports */

beforeAll(() => setWebCapabilityOverrides({ popover: true }))
afterAll(() => setWebCapabilityOverrides(null))

const panel = () =>
  document.querySelector('[data-overlaid-popover]') as HTMLElement

function DelegatedHarness({
  onOpenChange = () => {},
}: {
  onOpenChange?: (next: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <OverlayHost>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          onOpenChange(next)
        }}
        closeOnScroll={false}
        web={{ dismissal: 'browser' }}
      >
        <Popover.Trigger>
          {({ ref }) => (
            <button ref={ref as Ref<HTMLButtonElement>} type="button">
              trigger
            </button>
          )}
        </Popover.Trigger>
        <Popover.Content>
          <Text>delegated body</Text>
        </Popover.Content>
      </Popover>
    </OverlayHost>
  )
}

describe('browser-delegated popover dismissal (web.dismissal="browser")', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetDismissInputRecord()
  })
  afterEach(() => jest.useRealTimers())

  it('renders popover="auto" so the browser owns light dismiss', () => {
    render(<DelegatedHarness />)
    act(() => jest.advanceTimersByTime(20))
    expect(panel().getAttribute('popover')).toBe('auto')
  })

  it('stands the kernel down for an outside press and accepts the browser close', () => {
    const onOpenChange = jest.fn()
    render(<DelegatedHarness onOpenChange={onOpenChange} />)
    act(() => jest.advanceTimersByTime(20))

    // The root pointerdown listener must NOT classify this press for the
    // delegated layer (its planner skips platform-channel entries)...
    fireEvent.pointerDown(document.body)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(panel().matches(':popover-open')).toBe(true)

    // ...the browser's own light dismiss closes it, and the toggle
    // self-report drives the kernel exactly once.
    act(() => {
      panel().hidePopover()
      jest.advanceTimersByTime(20)
    })
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)

    act(() => jest.advanceTimersByTime(300))
    expect(document.querySelector('[data-overlaid-popover]')).toBeNull()
  })

  it('defers Escape to the browser instead of firing the kernel walk', () => {
    const onOpenChange = jest.fn()
    render(<DelegatedHarness onOpenChange={onOpenChange} />)
    act(() => jest.advanceTimersByTime(20))

    const escape = fireEvent.keyDown(document, { key: 'Escape' })
    // Not prevented (fireEvent returns false when preventDefault ran) and
    // not dismissed by the kernel — the browser owns this gesture.
    expect(escape).toBe(true)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(panel().matches(':popover-open')).toBe(true)

    // The browser's close request lands as a toggle; the sniffed cause is
    // escape but the public observable is one onOpenChange(false).
    act(() => {
      panel().hidePopover()
      jest.advanceTimersByTime(20)
    })
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps a managed veto popover sovereign next to a delegated one', () => {
    const onDismissRequest = jest.fn(() => false)
    function Mixed() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <Popover
            open={open}
            onOpenChange={setOpen}
            closeOnScroll={false}
            web={{ dismissal: 'browser' }}
          >
            <Popover.Trigger>
              {({ ref }) => (
                <button ref={ref as Ref<HTMLButtonElement>} type="button">
                  delegated trigger
                </button>
              )}
            </Popover.Trigger>
            <Popover.Content>
              <Text>delegated body</Text>
            </Popover.Content>
          </Popover>
          <Popover
            open
            onOpenChange={() => {}}
            closeOnScroll={false}
            onDismissRequest={onDismissRequest}
          >
            <Popover.Trigger>
              {({ ref }) => (
                <button ref={ref as Ref<HTMLButtonElement>} type="button">
                  veto trigger
                </button>
              )}
            </Popover.Trigger>
            <Popover.Content>
              <Text>veto body</Text>
            </Popover.Content>
          </Popover>
        </OverlayHost>
      )
    }
    render(<Mixed />)
    act(() => jest.advanceTimersByTime(20))

    // One outside press: the kernel consults ONLY the managed layer (which
    // vetoes and survives); the delegated layer is left to the browser.
    fireEvent.pointerDown(document.body)
    expect(onDismissRequest).toHaveBeenCalledTimes(1)
    expect(onDismissRequest).toHaveBeenCalledWith('outside-press')
    expect(screen.getByText('veto body')).toBeTruthy()
    expect(screen.getByText('delegated body')).toBeTruthy()
  })

  it('does not re-assert a delegated close (the re-show path retires)', () => {
    render(<DelegatedHarness />)
    act(() => jest.advanceTimersByTime(20))
    const element = panel()

    act(() => {
      element.hidePopover()
      jest.advanceTimersByTime(20)
    })
    // A managed popover whose kernel refused would be re-shown here; the
    // delegated one must stay closed.
    expect(openPopovers.has(element)).toBe(false)
  })
})
