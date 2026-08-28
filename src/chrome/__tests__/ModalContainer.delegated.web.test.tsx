import { fireEvent, render } from '@testing-library/react'
import {
  recordDismissInput,
  resetDismissInputRecord,
} from '../../react/dismissInputRecord'
import { ModalContainer } from '../ModalContainer'

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
  a11y: { host: { 'aria-label': 'Delegated dialog' } },
  webDismissal: 'delegated',
}

jest.mock('../../react/overlayContext', () => ({
  useOverlayContext: () => mockContext,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    if (this.open) throw new DOMException('Already open', 'InvalidStateError')
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.show = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  globalThis.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
  globalThis.cancelAnimationFrame = () => undefined
})

beforeEach(() => {
  jest.useFakeTimers()
  mockRequestDismiss.mockReset()
  mockRequestDismiss.mockReturnValue(true)
  mockHostShown.mockReset()
  mockContext.webDismissal = 'delegated'
  resetDismissInputRecord()
})

afterEach(() => jest.useRealTimers())

it('maps closedby to the backdrop mode and never intercepts cancel', () => {
  const withBackdrop = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = withBackdrop.container.querySelector(
    'dialog',
  ) as HTMLDialogElement
  expect(dialog.getAttribute('closedby')).toBe('any')

  // The browser's close request must not be blocked: cancel passes through
  // unprevented for a delegated instance.
  const cancelUnprevented = fireEvent(
    dialog,
    new Event('cancel', { cancelable: true }),
  )
  expect(cancelUnprevented).toBe(true)
  withBackdrop.unmount()

  const modeless = render(
    <ModalContainer backdrop={false}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  expect(
    modeless.container.querySelector('dialog')?.getAttribute('closedby'),
  ).toBe('closerequest')
})

it('retires the manual backdrop classifier for the delegated instance', () => {
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement

  // The press pair that classifies backdrop presses in managed mode must be
  // inert: the browser's own light dismiss (closedby='any') owns it.
  fireEvent.pointerDown(dialog)
  fireEvent.click(dialog)
  expect(mockRequestDismiss).not.toHaveBeenCalled()
})

it('self-reports a browser close with the sniffed cause and never re-shows', () => {
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement

  // Browser light dismiss: pointerdown recorded by the root listeners, the
  // dialog closes itself, and the close event is the fait accompli.
  recordDismissInput('pointerdown')
  dialog.removeAttribute('open')
  fireEvent(dialog, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
  expect(mockRequestDismiss).toHaveBeenCalledWith('backdrop-press')
  expect(dialog.open).toBe(false)

  // A close request (Escape) sniffs as escape — and even a refusal (only
  // the dying guard can produce one here) must not re-show a delegated
  // dialog: the re-show path is retired for this instance.
  mockRequestDismiss.mockClear()
  mockRequestDismiss.mockReturnValue(false)
  dialog.setAttribute('open', '')
  recordDismissInput('escape')
  dialog.removeAttribute('open')
  fireEvent(dialog, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  expect(dialog.open).toBe(false)
})

it('falls back to escape when no input was recorded recently', () => {
  const screen = render(
    <ModalContainer>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  recordDismissInput('pointerdown')
  jest.advanceTimersByTime(500)
  dialog.removeAttribute('open')
  fireEvent(dialog, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
})

it('ignores a nested dialog close re-dispatched through the parent chrome', () => {
  // React re-dispatches non-delegated DOM events (dialog cancel/close)
  // through fiber ancestors; the parent handler must filter on
  // event.target === event.currentTarget or it would classify the child's
  // close a second time.
  const screen = render(
    <ModalContainer>
      <ModalContainer>
        <button type="button">inside</button>
      </ModalContainer>
    </ModalContainer>,
  )
  const dialogs = screen.container.querySelectorAll('dialog')
  const inner = dialogs[1] as HTMLDialogElement

  inner.removeAttribute('open')
  fireEvent(inner, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
})
