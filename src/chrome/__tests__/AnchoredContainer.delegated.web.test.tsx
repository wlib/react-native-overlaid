import type * as TestingLibraryModule from '@testing-library/react'
import type * as AnchoredContainerModule from '../AnchoredContainer.web'
import type * as WebCapabilitiesModule from '../webCapabilities'
import type * as DismissInputRecordModule from '../../react/dismissInputRecord'

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

const mockRequestDismiss = jest.fn<boolean, [string]>()
const mockContext = {
  state: {
    phase: 'presented',
    isMounted: true,
    isOpen: true,
    isPresented: true,
  },
  signals: {
    onHostShown: jest.fn(),
    onLayoutReady: jest.fn(),
    onExitComplete: jest.fn(),
  },
  actions: { requestDismiss: mockRequestDismiss },
  panelId: 'delegated-popover',
  refs: { surface: () => {}, trigger: { current: null }, panel: { current: null } },
  behavior: 'auto',
  anchored: { panelStyle: {}, isPositioned: true },
  exitMs: 120,
  kind: 'popover',
  dismissChannel: 'delegated',
}

jest.mock('../../react/overlayContext', () => ({
  useAnchoredOverlayContext: () => mockContext,
  useOverlayContext: () => mockContext,
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { act, render } =
  require('@testing-library/react') as typeof TestingLibraryModule
const { AnchoredContainer } =
  require('../AnchoredContainer.web') as typeof AnchoredContainerModule
const { setWebCapabilityOverrides } =
  require('../webCapabilities') as typeof WebCapabilitiesModule
const { recordDismissInput, resetDismissInputRecord, DISMISS_SNIFF_WINDOW_MS } =
  require('../../react/dismissInputRecord') as typeof DismissInputRecordModule
/* eslint-enable @typescript-eslint/no-require-imports */

beforeAll(() => setWebCapabilityOverrides({ popover: true }))
afterAll(() => setWebCapabilityOverrides(null))

beforeEach(() => {
  jest.useFakeTimers()
  mockRequestDismiss.mockReset()
  mockRequestDismiss.mockReturnValue(true)
  resetDismissInputRecord()
})
afterEach(() => jest.useRealTimers())

function renderDelegated() {
  const screen = render(<AnchoredContainer>content</AnchoredContainer>)
  act(() => jest.advanceTimersByTime(1))
  const panel = document.querySelector('[data-overlaid-popover]') as HTMLElement
  return { screen, panel }
}

function browserLightDismiss(panel: HTMLElement) {
  act(() => {
    panel.hidePopover()
    jest.advanceTimersByTime(1)
  })
}

describe('delegated close reporting and cause sniffing', () => {
  it('renders popover="auto" and joins the browser stack', () => {
    const { panel } = renderDelegated()
    expect(panel.getAttribute('popover')).toBe('auto')
    expect(panel.matches(':popover-open')).toBe(true)
  })

  it('maps a close following a recorded pointerdown to outside-press', () => {
    const { panel } = renderDelegated()
    recordDismissInput('pointerdown')
    browserLightDismiss(panel)
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
    expect(mockRequestDismiss).toHaveBeenCalledWith('outside-press')
    // Accepted delegated closes never re-assert the platform surface.
    expect(panel.matches(':popover-open')).toBe(false)
  })

  it('maps a close following a recorded Escape to escape', () => {
    const { panel } = renderDelegated()
    recordDismissInput('escape')
    browserLightDismiss(panel)
    expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  })

  it('falls back to escape when the recorded input is outside the window', () => {
    const { panel } = renderDelegated()
    recordDismissInput('pointerdown')
    act(() => jest.advanceTimersByTime(DISMISS_SNIFF_WINDOW_MS + 1))
    browserLightDismiss(panel)
    expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  })

  it('falls back to escape for a close with no recorded input at all', () => {
    const { panel } = renderDelegated()
    browserLightDismiss(panel)
    expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  })

  it('re-asserts the surface if the kernel unexpectedly refuses', () => {
    // Unreachable while the channel snapshot holds (delegated instances are
    // vetoless), but a mid-presentation prop flip can create refusals; the
    // defensive re-assert prevents a split brain in that edge.
    mockRequestDismiss.mockReturnValue(false)
    const { panel } = renderDelegated()
    browserLightDismiss(panel)
    expect(mockRequestDismiss).toHaveBeenCalled()
    expect(panel.matches(':popover-open')).toBe(true)
  })
})
