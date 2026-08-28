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

import { act, render } from '@testing-library/react'
import { Text } from 'react-native'
import { OverlayHost } from '../../react/OverlayHost'
import { Dialog } from '../Dialog'
import { Popover } from '../Popover'

const advance = (ms = 50) => {
  act(() => jest.advanceTimersByTime(ms))
}

const ui = (styling?: 'default' | 'none') => (
  <OverlayHost {...(styling ? { styling } : {})}>
    <Dialog open onOpenChange={() => {}} title="Styled?">
      <Popover open onOpenChange={() => {}} closeOnScroll={false}>
        <Popover.Trigger>
          <Text>trigger</Text>
        </Popover.Trigger>
        <Popover.Content>
          <Text>popover body</Text>
        </Popover.Content>
      </Popover>
    </Dialog>
  </OverlayHost>
)

// The stylesheet's defaults+motion selectors stand down via
// :not([data-overlaid-styling='none']); jsdom can only pin the attribute
// contract those selectors key on, so the marker must reach every chrome
// element (host and surfaces alike) and must be absent by default.
describe('OverlayHost styling="none" (web)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('renders the data-overlaid-styling marker on host and surfaces', () => {
    render(ui('none'))
    advance()

    const host = document.querySelector('dialog[data-overlaid-modal]')
    const surface = document.querySelector(
      '[data-overlaid-kind="dialog"][data-overlaid-part="surface"]',
    )
    const panel = document.querySelector('[data-overlaid-popover]')
    expect(host?.getAttribute('data-overlaid-styling')).toBe('none')
    expect(surface?.getAttribute('data-overlaid-styling')).toBe('none')
    expect(panel?.getAttribute('data-overlaid-styling')).toBe('none')
  })

  it('renders no marker under the default presentation layer', () => {
    render(ui())
    advance()

    expect(document.querySelector('[data-overlaid-styling]')).toBeNull()
  })
})
