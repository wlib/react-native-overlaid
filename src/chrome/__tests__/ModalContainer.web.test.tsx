import { fireEvent, render } from '@testing-library/react'
import { ModalContainer } from '../ModalContainer'
import { setWebCapabilityOverrides } from '../webCapabilities'

const mockRequestDismiss = jest.fn<boolean, [string]>()
const mockHostShown = jest.fn()
const mockContext = {
  state: {
    phase: 'presented',
    isMounted: true,
    isOpen: true,
    isPresented: true,
  },
  signals: { onHostShown: mockHostShown },
  actions: { requestDismiss: mockRequestDismiss },
  panelId: 'test-dialog',
  exitMs: 180,
  a11y: { host: { 'aria-label': 'Test dialog' } },
}

jest.mock('../../react/overlayContext', () => ({
  useOverlayContext: () => mockContext,
}))

type DialogWithFocus = HTMLDialogElement & {
  previouslyFocused?: HTMLElement | null
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: DialogWithFocus) {
    if (this.open) throw new DOMException('Already open', 'InvalidStateError')
    this.previouslyFocused = document.activeElement as HTMLElement | null
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: DialogWithFocus) {
    if (!this.open) return
    this.removeAttribute('open')
    this.previouslyFocused?.focus()
  }
  globalThis.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
  globalThis.cancelAnimationFrame = () => undefined
})

beforeEach(() => {
  mockRequestDismiss.mockReset()
  mockHostShown.mockReset()
})

it('shows modally, names the role-bearing host, and restores focus on removal', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()

  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog')

  expect(dialog?.open).toBe(true)
  expect(dialog?.getAttribute('aria-label')).toBe('Test dialog')
  expect(mockHostShown).toHaveBeenCalledTimes(1)

  screen.getByRole('button', { name: 'inside' }).focus()
  screen.unmount()
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})

it('guards backdrop clicks and re-shows a browser-forced close the kernel refuses', () => {
  mockRequestDismiss.mockReturnValue(false)
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  const inside = screen.getByRole('button', { name: 'inside' })

  fireEvent.pointerDown(inside)
  fireEvent.click(dialog)
  expect(mockRequestDismiss).not.toHaveBeenCalled()

  fireEvent.pointerDown(dialog)
  fireEvent.click(dialog)
  expect(mockRequestDismiss).toHaveBeenCalledWith('backdrop-press')

  mockRequestDismiss.mockClear()
  dialog.removeAttribute('open')
  fireEvent(dialog, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  expect(dialog.open).toBe(true)
})

it('stays open through dismissing even with the close-first capabilities', () => {
  // The dialog host has NO close-first mode: its exit reveal animates on
  // the surface child, and Chromium completes a discrete-only
  // overlay/display transition instantly — a close-first host would
  // vanish before the surface's exit reveal ever ran. Regression for a
  // 0.2.0 field report of instant dialog/drawer/sheet closes.
  setWebCapabilityOverrides({
    discreteTransitions: true,
    overlayProperty: true,
  })
  const presented = mockContext.state
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  expect(dialog.open).toBe(true)

  mockContext.state = {
    phase: 'dismissing',
    isMounted: true,
    isOpen: false,
    isPresented: false,
  }
  screen.rerender(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  // Mounted-through-exit: the platform surface only closes at unmount.
  expect(dialog.open).toBe(true)
  expect(mockRequestDismiss).not.toHaveBeenCalled()

  screen.unmount()
  mockContext.state = presented
  setWebCapabilityOverrides(null)
})

it('re-delivers onHostShown when a re-run cancels the pending frame', () => {
  // The show branch schedules onHostShown on a frame; any effect re-run
  // before that frame cancels it. While the entry is still gated on the
  // signal (mounting, dialog already open), the effect must re-schedule
  // instead of stranding the overlay invisible-but-open.
  const presented = mockContext.state
  mockContext.state = {
    phase: 'mounting',
    isMounted: true,
    isOpen: true,
    isPresented: false,
  }
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  expect(mockHostShown).toHaveBeenCalledTimes(1)

  // Signals identity churn re-runs the effect while still mounting; the
  // dialog is already open, so only the re-arm branch can deliver again.
  mockHostShown.mockClear()
  mockContext.signals = { onHostShown: mockHostShown }
  screen.rerender(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  expect(mockHostShown.mock.calls.length).toBeGreaterThanOrEqual(1)

  screen.unmount()
  mockContext.state = presented
})

it('without the capabilities the dialog stays open through dismissing', () => {
  const presented = mockContext.state
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement

  mockContext.state = {
    phase: 'dismissing',
    isMounted: true,
    isOpen: false,
    isPresented: false,
  }
  screen.rerender(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  // Mounted-through-exit: the platform surface only closes at unmount.
  expect(dialog.open).toBe(true)

  screen.unmount()
  mockContext.state = presented
})

it('snapshots modal ownership until the mounted presentation ends', () => {
  const screen = render(
    <ModalContainer backdrop={{}}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  expect(dialog.dataset.overlaidModalMode).toBe('modal')

  screen.rerender(
    <ModalContainer backdrop={false}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  expect(dialog.dataset.overlaidModalMode).toBe('modal')
  expect(dialog.dataset.overlaidHasBackdrop).toBe('true')
})
