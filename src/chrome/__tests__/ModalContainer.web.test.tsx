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

it('close-first exit: closes the platform dialog at dismissal start, keeps it rendered', () => {
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

  // Dismissal start: the platform surface closes (the stylesheet's
  // allow-discrete/overlay transition keeps it painted) while the chrome
  // stays mounted until the exit accounting drains.
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
  expect(dialog.open).toBe(false)
  expect(dialog.isConnected).toBe(true)
  // The self-inflicted close must not report a dismissal.
  expect(mockRequestDismiss).not.toHaveBeenCalled()

  // Reopen-mid-exit restores the platform surface.
  mockContext.state = presented
  screen.rerender(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  expect(dialog.open).toBe(true)

  screen.unmount()
  mockContext.state = presented
  setWebCapabilityOverrides(null)
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
