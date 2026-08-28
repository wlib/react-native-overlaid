/**
 * The all-caps mode mix (report §6.5): every delegation capability pinned on,
 * full components, so vetoless instances run the delegated channel while
 * veto/non-dismissable neighbors stay managed in the same host. The paired
 * no-caps mix is `families.web.test.tsx`, which runs the identical semantic
 * matrix under jsdom's real (absent) capabilities — all managed.
 */
import type * as ReactModule from 'react'
import type * as TestingLibraryModule from '@testing-library/react'
import type * as ReactNativeModule from 'react-native'
import type * as OverlayHostModule from '../../react/OverlayHost'
import type * as LayerHostContextModule from '../../react/LayerHostContext'
import type * as PopoverModule from '../Popover'
import type * as DialogModule from '../Dialog'
import type * as WebCapabilitiesModule from '../../chrome/webCapabilities'
import type * as DismissInputRecordModule from '../../react/dismissInputRecord'
import type { LayerHost } from '../../core/types'
import type { Ref } from 'react'

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

HTMLDialogElement.prototype.showModal = function () {
  if (this.open) throw new DOMException('Already open', 'InvalidStateError')
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

/* eslint-disable @typescript-eslint/no-require-imports */
const { useState } = require('react') as typeof ReactModule
const { act, fireEvent, render, screen } =
  require('@testing-library/react') as typeof TestingLibraryModule
const { Text } = require('react-native') as typeof ReactNativeModule
const { OverlayHost } =
  require('../../react/OverlayHost') as typeof OverlayHostModule
const { useLayerHost } =
  require('../../react/LayerHostContext') as typeof LayerHostContextModule
const { Popover } = require('../Popover') as typeof PopoverModule
const { Dialog } = require('../Dialog') as typeof DialogModule
const { setWebCapabilityOverrides } =
  require('../../chrome/webCapabilities') as typeof WebCapabilitiesModule
const { resetDismissInputRecord } =
  require('../../react/dismissInputRecord') as typeof DismissInputRecordModule
/* eslint-enable @typescript-eslint/no-require-imports */

beforeAll(() =>
  setWebCapabilityOverrides({
    popover: true,
    popoverHint: true,
    dialogClosedBy: true,
  }),
)
afterAll(() => setWebCapabilityOverrides(null))

beforeEach(() => {
  jest.useFakeTimers()
  resetDismissInputRecord()
})
afterEach(() => jest.useRealTimers())

const advance = (ms = 500) => {
  act(() => jest.advanceTimersByTime(ms))
}

// jsdom's Event.isTrusted is unforgeable, so trusted gestures are driven
// straight through the host dispatch the root listeners call; the listeners'
// own `event.isTrusted` pass-through is pinned by the real-browser plays.
const hostProbe: { current: LayerHost | null } = { current: null }
function HostProbe() {
  hostProbe.current = useLayerHost()
  return null
}

function popover(
  label: string,
  props: Partial<PopoverModule.PopoverProps> = {},
) {
  return (
    <Popover closeOnScroll={false} {...props}>
      <Popover.Trigger>
        {({ ref, onPress }) => (
          <button
            ref={ref as Ref<HTMLButtonElement>}
            type="button"
            onClick={() => onPress()}
          >
            {label} trigger
          </button>
        )}
      </Popover.Trigger>
      <Popover.Content>
        <Text>{label} panel</Text>
      </Popover.Content>
    </Popover>
  )
}

describe('mixed managed/delegated channels in one host (all-caps mix)', () => {
  it('splits neighbors by veto/dismissable and keeps semantics identical', () => {
    render(
      <OverlayHost>
        {popover('plain')}
        {popover('veto', { onDismissRequest: () => false })}
        {popover('sticky', { dismissable: false })}
      </OverlayHost>,
    )
    fireEvent.click(screen.getByText('veto trigger'))
    advance(20)
    fireEvent.click(screen.getByText('plain trigger'))
    advance(20)

    const panels = [...document.querySelectorAll('[data-overlaid-popover]')]
    const attrs = panels.map((panel) => panel.getAttribute('popover'))
    // The vetoless popover delegates (auto); the veto popover stays managed
    // (manual) — R2 by construction. Both remain open: the plain popover's
    // kernel displacement fired at the veto popover, and the veto outranked
    // the force.
    expect(attrs.sort()).toEqual(['auto', 'manual'])
  })

  it('kernel-handles a synthetic outside press for a delegated popover', () => {
    // Untrusted input never reaches the browser's light dismiss, so the
    // kernel must not stand down for it — consumer test suites and play
    // tests keep working against delegated instances.
    const onOpenChange = jest.fn()
    render(
      <OverlayHost>{popover('plain', { open: true, onOpenChange })}</OverlayHost>,
    )
    advance(20)
    expect(screen.getByText('plain panel')).toBeTruthy()

    fireEvent.pointerDown(document.body)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stands down for a trusted outside press and accepts the browser close', () => {
    const onOpenChange = jest.fn()
    render(
      <OverlayHost>
        <HostProbe />
        {popover('plain', { open: true, onOpenChange })}
      </OverlayHost>,
    )
    advance(20)
    const panel = document.querySelector('[data-overlaid-popover]') as HTMLElement

    // Trusted press: the browser owns the gesture; the kernel must not fire.
    act(() => {
      hostProbe.current?.dispatchOutsidePress(
        { x: 0, y: 0 },
        document.body,
        { trusted: true },
      )
    })
    expect(onOpenChange).not.toHaveBeenCalled()

    // The browser's light dismiss then lands as a fait accompli `toggle`.
    act(() => {
      panel.hidePopover()
      jest.advanceTimersByTime(20)
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('kernel-handles a synthetic Escape for a delegated dialog and stands down for a trusted one', () => {
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <HostProbe />
          <Dialog open={open} onOpenChange={setOpen} title="Delegated dialog">
            <Text>Dialog body</Text>
          </Dialog>
        </OverlayHost>
      )
    }
    render(<Harness />)
    const dialog = document.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    expect(dialog.getAttribute('closedby')).toBe('closerequest')

    // Trusted Escape: the kernel stands down ('unhandled' — the browser's
    // close watcher owns the gesture, absent in jsdom), so nothing closes.
    let outcome: string | undefined
    act(() => {
      outcome = hostProbe.current?.dispatchEscape({ trusted: true })
    })
    expect(outcome).toBe('unhandled')
    expect(screen.getByText('Delegated dialog')).toBeTruthy()

    // The browser's close watcher surfaces as a cancelable `cancel`
    // proposal, which routes into the kernel and closes with an exit phase.
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(dialog.dataset.overlaidState).toBe('closed')
    advance()
    expect(screen.queryByText('Delegated dialog')).toBeNull()

    // A synthetic Escape must instead route through the kernel directly.
    function SyntheticHarness() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <Dialog open={open} onOpenChange={setOpen} title="Synthetic escape">
            <Text>Dialog body</Text>
          </Dialog>
        </OverlayHost>
      )
    }
    render(<SyntheticHarness />)
    fireEvent.keyDown(document, { key: 'Escape' })
    advance()
    expect(screen.queryByText('Synthetic escape')).toBeNull()
  })

  it('re-asserts a delegated popover on reopen mid-exit', () => {
    // The browser hides a delegated popover at dismissal start (unlike a
    // managed one, which stays :popover-open through the exit), so a reopen
    // while the exit phase is still running must call showPopover again.
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <button type="button" onClick={() => setOpen(true)}>
            reopen
          </button>
          {popover('plain', { open, onOpenChange: setOpen })}
        </OverlayHost>
      )
    }
    render(<Harness />)
    advance(20)
    const panel = document.querySelector('[data-overlaid-popover]') as HTMLElement

    // Browser light dismiss: natively hidden, kernel accepts, exit begins.
    act(() => {
      panel.hidePopover()
      jest.advanceTimersByTime(20)
    })
    expect(panel.matches(':popover-open')).toBe(false)
    expect(panel.isConnected).toBe(true) // still mounted through the exit

    // Reopen before the 120 ms exit budget elapses.
    fireEvent.click(screen.getByText('reopen'))
    advance(20)
    expect(panel.matches(':popover-open')).toBe(true)
    // jsdom never satisfies the layout gate under fake timers, so the
    // reopen lands in 'mounting' here; the pin is that the platform surface
    // was re-asserted and the instance is open-bound again, not dismissing.
    expect(['mounting', 'presented']).toContain(panel.dataset.overlaidPhase)
  })

  it('re-shows a delegated dialog on reopen mid-exit after a forced close', () => {
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <button type="button" onClick={() => setOpen(true)}>
            reopen dialog
          </button>
          <Dialog open={open} onOpenChange={setOpen} title="Reopen target">
            <Text>Dialog body</Text>
          </Dialog>
        </OverlayHost>
      )
    }
    render(<Harness />)
    const dialog = document.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    expect(dialog.open).toBe(true)

    // Browser-forced close (fait accompli), accepted by the kernel.
    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    expect(dialog.open).toBe(false)
    expect(dialog.isConnected).toBe(true)

    // Reopen before the 180 ms exit budget elapses: must re-show.
    fireEvent.click(screen.getByText('reopen dialog'))
    advance(20)
    expect(dialog.open).toBe(true)
  })

  it('displacement remains kernel-owned across channels', () => {
    render(
      <OverlayHost>
        {popover('sticky', { dismissable: false })}
        {popover('displacer')}
      </OverlayHost>,
    )
    // The sticky popover is managed (dismissable=false); the displacer is
    // delegated. Opening the delegated popover must still force-close the
    // managed transient through the kernel's displacement plan.
    fireEvent.click(screen.getByText('sticky trigger'))
    advance(20)
    expect(screen.getByText('sticky panel')).toBeTruthy()

    fireEvent.click(screen.getByText('displacer trigger'))
    advance(20)
    expect(screen.getByText('displacer panel')).toBeTruthy()
    expect(screen.queryByText('sticky panel')).toBeNull()
  })
})
