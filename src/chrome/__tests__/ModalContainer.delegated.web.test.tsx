import { fireEvent, render } from '@testing-library/react'
import { ModalContainer } from '../ModalContainer'
import {
  recordDismissInput,
  resetDismissInputRecord,
} from '../../react/dismissInputRecord'

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
  panelId: 'delegated-dialog',
  exitMs: 180,
  kind: 'dialog',
  a11y: { host: { 'aria-label': 'Delegated dialog' } },
  dismissChannel: 'delegated',
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
    if (!this.open) return
    this.removeAttribute('open')
  }
  globalThis.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
  globalThis.cancelAnimationFrame = () => undefined
})

beforeEach(() => {
  mockRequestDismiss.mockReset()
  mockRequestDismiss.mockReturnValue(true)
  mockHostShown.mockReset()
  resetDismissInputRecord()
})

it('maps closedby to the host geometry: closerequest for top-layer hosts', () => {
  // The top-layer host <dialog> spans the viewport (it IS the backdrop
  // container), so browser light dismiss can never fire against it —
  // backdrop presses stay this chrome's own classifier and only close
  // requests delegate.
  const screen = render(
    <ModalContainer backdrop={{}}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  expect(dialog.getAttribute('closedby')).toBe('closerequest')
})

it('maps closedby to any for modeless hosts, whose page presses land outside', () => {
  const screen = render(
    <ModalContainer backdrop={false}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  expect(dialog.getAttribute('closedby')).toBe('any')
})

it('routes a delegated cancel into the kernel and keeps the close kernel-driven', () => {
  const screen = render(
    <ModalContainer backdrop={{}}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  const notPrevented = fireEvent(
    dialog,
    new Event('cancel', { cancelable: true }),
  )
  // The browser's own close is always prevented (it would tear the host out
  // of the top layer before the exit phase); the kernel drives the close.
  expect(notPrevented).toBe(false)
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
  expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  expect(dialog.open).toBe(true)
})

it('reports a forced browser close with a sniffed cause and no re-show', () => {
  const screen = render(
    <ModalContainer backdrop={{}}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  recordDismissInput('escape')
  dialog.removeAttribute('open')
  fireEvent(dialog, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
  expect(mockRequestDismiss).toHaveBeenCalledWith('escape')
  // Accepted: the fait accompli stands; the kernel rides out its exit phase
  // on the already-closed host instead of re-asserting it.
  expect(dialog.open).toBe(false)
})

it('keeps the backdrop press classifier for delegated hosts', () => {
  const screen = render(
    <ModalContainer backdrop={{}}>
      <button type="button">inside</button>
    </ModalContainer>,
  )
  const dialog = screen.container.querySelector('dialog') as HTMLDialogElement
  fireEvent.pointerDown(dialog)
  fireEvent.click(dialog)
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
  expect(mockRequestDismiss).toHaveBeenCalledWith('backdrop-press')
})

it('ignores a nested dialog cancel/close re-dispatched through fiber ancestors', () => {
  // React re-dispatches non-delegated DOM events (dialog close/cancel)
  // through fiber ancestors, so the outer host's handlers also receive the
  // inner dialog's events; the target filter must keep them inert.
  const screen = render(
    <ModalContainer backdrop={{}}>
      <ModalContainer backdrop={{}}>
        <button type="button">inside</button>
      </ModalContainer>
    </ModalContainer>,
  )
  const dialogs = screen.container.querySelectorAll('dialog')
  expect(dialogs).toHaveLength(2)
  const inner = dialogs[1] as HTMLDialogElement

  fireEvent(inner, new Event('cancel', { cancelable: true }))
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)

  mockRequestDismiss.mockClear()
  inner.removeAttribute('open')
  fireEvent(inner, new Event('close'))
  expect(mockRequestDismiss).toHaveBeenCalledTimes(1)
})
