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

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    if (!this.open) return
    this.removeAttribute('open')
    setTimeout(() => this.dispatchEvent(new Event('close')), 0)
  }
}

import { useState, type Ref } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Text } from 'react-native'
import { OverlayHost } from '../../react/OverlayHost'
import { Dialog } from '../Dialog'
import { Drawer } from '../Drawer'
import { Popover } from '../Popover'
import { Sheet } from '../Sheet'
import { Tooltip, type TooltipTriggerProps } from '../Tooltip'

const advance = (ms = 500) => {
  act(() => jest.advanceTimersByTime(ms))
}

describe('web component-family parity', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('stacks dialog text in a flex-column scroll body with the close pinned outside', () => {
    render(
      <OverlayHost>
        <Dialog open onOpenChange={jest.fn()} title="Long" description="Desc">
          <Text>Tall body</Text>
        </Dialog>
      </OverlayHost>,
    )

    // RNW Texts are display:inline — every ancestor between them and the
    // flex-column surface must itself be a flex column, or title and
    // description glue together on one line. The Body region is also the
    // ONLY scroller (the surface clips), keeping the absolute ✕ pinned.
    const body = [...document.querySelectorAll('dialog div')].find(
      (node) => (node as HTMLElement).style.overflowY === 'auto',
    ) as HTMLElement
    expect(body).toBeDefined()
    expect(body.style.display).toBe('flex')
    expect(body.style.flexDirection).toBe('column')
    expect(body.style.position).toBe('static')
    expect(body.contains(screen.getByText('Long'))).toBe(true)
    expect(
      body.contains(screen.getByRole('button', { name: 'Close dialog' })),
    ).toBe(false)

    const surface = body.parentElement as HTMLElement
    expect(surface.style.overflow).toBe('hidden')
    expect(surface.style.display).toBe('flex')
  })

  it('Dialog uses the role-bearing <dialog> for naming and backdrop dismissal', () => {
    const onOpenChange = jest.fn()
    render(
      <OverlayHost>
        <Dialog
          open
          onOpenChange={onOpenChange}
          title="Web dialog"
          description="Dialog description"
          layout={{ maxHeight: 420, maxWidth: 560 }}
          surface={{
            className: 'custom-dialog-surface',
            style: { backgroundColor: '#fffbeb' },
          }}
          backdrop={{
            className: 'custom-dialog-backdrop',
            style: { backgroundColor: '#111827', opacity: 0.6 },
          }}
        >
          <span>Dialog body</span>
        </Dialog>
      </OverlayHost>,
    )

    const dialog = document.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(dialog.getAttribute('aria-labelledby')).toBe(`${dialog.id}-title`)
    expect(dialog.getAttribute('aria-describedby')).toBe(
      `${dialog.id}-description`,
    )
    expect(dialog.className).toBe('custom-dialog-backdrop')
    expect(dialog.style.getPropertyValue('--overlaid-backdrop-opacity')).toBe(
      '0.6',
    )
    const surface = document.querySelector(
      '.custom-dialog-surface',
    ) as HTMLElement
    expect(surface.style.maxHeight).toBe('420px')
    expect(surface.style.backgroundColor).toBe('rgb(255, 251, 235)')

    fireEvent.pointerDown(dialog)
    fireEvent.click(dialog)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('classifies one web backdrop interaction exactly once', () => {
    const onDismissRequest = jest.fn(() => false)
    render(
      <OverlayHost>
        <Dialog
          open
          onOpenChange={() => {}}
          onDismissRequest={onDismissRequest}
          title="Single dismissal source"
        >
          <span>Dialog body</span>
        </Dialog>
      </OverlayHost>,
    )

    const dialog = document.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    fireEvent.pointerDown(dialog)
    fireEvent.click(dialog)
    expect(onDismissRequest).toHaveBeenCalledTimes(1)
    expect(onDismissRequest).toHaveBeenCalledWith('backdrop-press')
  })

  it('re-shows the dialog on reopen mid-exit after a forced browser close', () => {
    // An accepted browser-forced close leaves the host natively closed
    // through the exit phase, so a reopen inside the exit budget must call
    // showModal again — the show branch is keyed on isOpen, which
    // isMounted keying would miss (the split brain B's trusted-input QA
    // found; also covers a forced close landing in the mounting window).
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

  it('Drawer applies edge/layout styling and false backdrop semantics', async () => {
    render(
      <OverlayHost>
        <Drawer
          open
          onOpenChange={() => {}}
          side="left"
          backdrop={false}
          accessibilityLabel="Inspector"
          layout={{ width: 320 }}
          insets={{ top: 20, bottom: 12 }}
        >
          <span>Drawer body</span>
        </Drawer>
      </OverlayHost>,
    )
    await act(async () => {})

    const dialog = document.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    const panel = document.querySelector(
      '[data-overlaid-drawer]',
    ) as HTMLElement
    expect(dialog.dataset.overlaidHasBackdrop).toBe('false')
    expect(dialog.dataset.overlaidModalMode).toBe('modeless')
    expect(dialog.style.pointerEvents).toBe('none')
    expect(panel.style.left).toBe('0px')
    expect(panel.style.width).toBe('320px')
    expect(panel.getAttribute('aria-label')).toBe('Inspector')
  })

  it('uses a modeless dialog for backdrop-free Dialog without losing open state', () => {
    render(
      <OverlayHost>
        <Dialog
          open
          onOpenChange={() => {}}
          title="Modeless inspector"
          backdrop={false}
        >
          <span>Interactive page dialog</span>
        </Dialog>
      </OverlayHost>,
    )

    const dialog = document.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    expect(dialog.dataset.overlaidModalMode).toBe('modeless')
    expect(dialog.open).toBe(true)
  })

  it('Sheet renders measured web chrome with detents, safe area, and transparent scrim', () => {
    const onOpenChange = jest.fn()
    render(
      <OverlayHost>
        <Sheet
          open
          onOpenChange={onOpenChange}
          detents={['33%', '66%', 'full']}
          initialDetent={1}
          scrim={false}
          layout={{ maxWidth: 480 }}
          insets={{ bottom: 34 }}
        >
          <span>Sheet body</span>
        </Sheet>
      </OverlayHost>,
    )
    advance(20)

    const panel = document.querySelector('[data-overlaid-sheet]') as HTMLElement
    const scroll = panel.querySelector(
      '[data-overlaid-sheet-scroll]',
    ) as HTMLElement
    const dialog = panel.closest('dialog') as HTMLDialogElement
    expect(panel.style.maxWidth).toBe('480px')
    // The measured detent height is a custom-property input to the motion
    // layer (F2); the CSS `height` itself now lives in styles.css.
    expect(panel.style.getPropertyValue('--overlaid-sheet-height')).not.toBe('')
    expect(scroll).not.toBeNull()
    expect(dialog.dataset.overlaidHasBackdrop).toBe('false')
    expect(dialog.dataset.overlaidModalMode).toBe('modal')

    fireEvent.pointerDown(dialog)
    fireEvent.click(dialog)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('Popover scroll exemption keeps internal scrolling open but page scroll dismisses', () => {
    render(
      <OverlayHost>
        <Popover>
          <Popover.Trigger>
            <Text>Open popover</Text>
          </Popover.Trigger>
          <Popover.Content>
            <div data-testid="popover-scroll">Scrollable panel</div>
          </Popover.Content>
        </Popover>
      </OverlayHost>,
    )

    fireEvent.click(screen.getByText('Open popover'))
    advance(20)
    const panel = document.querySelector(
      '[data-overlaid-popover]',
    ) as HTMLElement
    expect(panel).not.toBeNull()

    fireEvent.scroll(screen.getByTestId('popover-scroll'))
    expect(document.querySelector('[data-overlaid-popover]')).not.toBeNull()

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    fireEvent.scroll(outside)
    advance()
    expect(document.querySelector('[data-overlaid-popover]')).toBeNull()
    outside.remove()
  })

  it('Tooltip opens on focus, answers Escape, and leaves an open popover intact', () => {
    let tooltipTriggerProps: TooltipTriggerProps | undefined
    render(
      <OverlayHost>
        <Popover closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Popover trigger</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Popover body</Text>
          </Popover.Content>
        </Popover>
        <Tooltip text="Tooltip body" closeOnScroll={false}>
          {(props) => {
            tooltipTriggerProps = props
            return (
              <button
                ref={props.ref as Ref<HTMLButtonElement>}
                type="button"
                onFocus={props.onFocus as never}
                onBlur={props.onBlur as never}
              >
                Tooltip trigger
              </button>
            )
          }}
        </Tooltip>
      </OverlayHost>,
    )

    fireEvent.click(screen.getByText('Popover trigger'))
    const trigger = screen.getByText('Tooltip trigger')
    fireEvent.focus(trigger)
    advance(20)
    expect(screen.getByText('Popover body')).toBeTruthy()
    expect(screen.getByText('Tooltip body')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    advance()
    expect(screen.queryByText('Tooltip body')).toBeNull()
    expect(screen.getByText('Popover body')).toBeTruthy()

    act(() => {
      tooltipTriggerProps?.onPointerEnter?.({
        nativeEvent: { pointerType: 'mouse' },
      } as never)
    })
    advance(20)
    expect(screen.getByText('Tooltip body')).toBeTruthy()
    act(() => {
      tooltipTriggerProps?.onPointerLeave?.({
        nativeEvent: { pointerType: 'mouse' },
      } as never)
    })
    advance(149)
    expect(screen.getByText('Tooltip body')).toBeTruthy()
    advance(1)
    expect(screen.getByText('Tooltip body')).toBeTruthy()
    advance(100)
    advance(100)
    expect(screen.queryByText('Tooltip body')).toBeNull()
  })

  it("a nested dialog's close event never dismisses its ancestor host", () => {
    render(
      <OverlayHost>
        <Drawer open onOpenChange={() => {}} accessibilityLabel="Outer drawer">
          <Dialog open onOpenChange={() => {}} title="Inner dialog">
            <span>Inner body</span>
          </Dialog>
        </Drawer>
      </OverlayHost>,
    )
    advance(20)

    const dialogs = document.querySelectorAll('dialog[data-overlaid-modal]')
    expect(dialogs).toHaveLength(2)
    const inner = dialogs[1] as HTMLDialogElement

    // React re-dispatches the non-delegated close event through fiber
    // ancestors, so the drawer's onClose also runs for the inner dialog's
    // close — its target filter must keep the drawer alive while the inner
    // dialog reconciles the (apparent) browser-forced close normally.
    inner.removeAttribute('open')
    act(() => {
      inner.dispatchEvent(new Event('close'))
    })
    advance()
    expect(screen.queryByText('Inner dialog')).toBeNull()
    expect(
      document.querySelector('dialog[data-overlaid-kind="drawer"]'),
    ).not.toBeNull()
  })

  it('unwinds a nested popover before its dialog on consecutive Escape keys', () => {
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <OverlayHost>
          <Dialog open={open} onOpenChange={setOpen} title="Parent dialog">
            <Popover closeOnScroll={false}>
              <Popover.Trigger>
                <Text>Nested trigger</Text>
              </Popover.Trigger>
              <Popover.Content>
                <Text>Nested content</Text>
              </Popover.Content>
            </Popover>
          </Dialog>
        </OverlayHost>
      )
    }

    render(<Harness />)
    fireEvent.click(screen.getByText('Nested trigger'))
    expect(screen.getByText('Nested content')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    advance()
    expect(screen.queryByText('Nested content')).toBeNull()
    expect(screen.getByText('Parent dialog')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    advance()
    expect(screen.queryByText('Parent dialog')).toBeNull()
  })
})
