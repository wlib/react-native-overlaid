import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  ContentSheet,
  DetentedSheet,
  NoScrimSheet,
  NonDismissableSheet,
  ScrollingSheet,
  StyledSheet,
} from '../gallery/scenarios'

const meta: Meta = {
  title: 'Overlays/Sheet',
  decorators: [
    (Story) => (
      <OverlayHost>
        <Story />
      </OverlayHost>
    ),
  ],
}

export default meta
type Story = StoryObj

const body = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body)

export const ContentSized: Story = {
  render: () => <ContentSheet />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open content sheet'))
    const doc = body(canvasElement)
    await doc.findByText('Content-sized sheet')

    await userEvent.click(doc.getByLabelText('Close sheet'))
    await waitFor(() =>
      expect(doc.queryByText('Content-sized sheet')).not.toBeInTheDocument(),
    )
  },
}

export const ThreeDetents: Story = {
  render: () => <DetentedSheet />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)
    const document = canvasElement.ownerDocument

    await userEvent.click(await canvas.findByText('Open detented sheet'))
    await doc.findByText('Three detents')
    await waitFor(() =>
      expect(
        document.querySelector('dialog[data-overlaid-phase="presented"]'),
      ).not.toBeNull(),
    )

    const handle = document.querySelector(
      '[data-overlaid-sheet-handle]',
    ) as HTMLElement
    const panel = handle.parentElement as HTMLElement

    // Synthetic PointerEvents have no active pointer behind them, so
    // set/releasePointerCapture throw NotFoundError in Chrome. The drag
    // math under test never depends on capture (it only pins event routing
    // for real pointers) — stub the capture API on the panel instance so
    // the constructed sequence drives the handlers deterministically.
    panel.setPointerCapture = () => {}
    panel.releasePointerCapture = () => {}
    panel.hasPointerCapture = () => false

    // Downward fling. Real input always yields frames between pointer
    // events, and the chrome's move handlers close over React state that
    // commits between events — dispatching back-to-back in one task leaves
    // them reading a stale pre-drag snapshot. A ~25ms gap per event mirrors
    // real pointer cadence while 40px steps still register ~1600px/s, far
    // above the 800px/s thresholds, and the release consumes a fresh
    // (non-stale) velocity sample.
    const frame = () => new Promise((resolve) => setTimeout(resolve, 25))
    const fling = async (fromY: number) => {
      const opts = (y: number): PointerEventInit => ({
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        clientY: y,
        clientX: 200,
      })
      handle.dispatchEvent(new PointerEvent('pointerdown', opts(fromY)))
      await frame()
      handle.dispatchEvent(new PointerEvent('pointermove', opts(fromY + 40)))
      await frame()
      handle.dispatchEvent(new PointerEvent('pointermove', opts(fromY + 80)))
      handle.dispatchEvent(new PointerEvent('pointerup', opts(fromY + 80)))
    }

    // From a higher detent (the initial 66%), a hard fling must NOT
    // dismiss — it snaps down the detent ladder (here to 33%), like the
    // OS sheets. Inline height is the snap target, set synchronously.
    const heightPx = () => parseFloat(panel.style.height || '0')
    const heightBefore = heightPx()
    await fling(300)
    await waitFor(() => expect(heightPx()).toBeLessThan(heightBefore))
    await expect(doc.getByText('Three detents')).toBeInTheDocument()

    // From the LOWEST detent, the same fling clears the ladder → dismiss.
    await fling(600)
    await waitFor(() =>
      expect(doc.queryByText('Three detents')).not.toBeInTheDocument(),
    )
  },
}

export const ScrollingContent: Story = {
  name: 'Scroll inside vs drag-to-dismiss arbitration',
  render: () => <ScrollingSheet />,
}

export const NonDismissable: Story = {
  render: () => <NonDismissableSheet />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open blocking sheet'))
    const doc = body(canvasElement)
    await doc.findByText('Finish this first')

    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 300))
    await expect(doc.getByText('Finish this first')).toBeInTheDocument()
    // Presented, not merely still-exiting — the refusal must be real.
    await expect(
      canvasElement.ownerDocument.querySelector(
        'dialog[data-overlaid-phase="presented"]',
      ),
    ).not.toBeNull()

    await userEvent.click(doc.getByText('Complete'))
    await waitFor(() =>
      expect(doc.queryByText('Finish this first')).not.toBeInTheDocument(),
    )
  },
}

export const NoScrim: Story = {
  render: () => <NoScrimSheet />,
}

export const StyledAndNarrow: Story = {
  render: () => <StyledSheet />,
}
