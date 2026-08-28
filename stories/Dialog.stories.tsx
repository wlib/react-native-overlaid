import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  BasicDialog,
  ClosedByDialog,
  CompoundDialog,
  NonDismissableDialog,
  ScrollableDialog,
  StyledDialog,
} from '../gallery/scenarios'

const meta: Meta = {
  title: 'Overlays/Dialog',
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

/** Top-layer <dialog> content portals to document.body — query there. */
const body = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body)

export const Basic: Story = {
  render: () => <BasicDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open dialog'))
    const doc = body(canvasElement)
    await doc.findByText('Basic dialog')

    // Escape dismisses through the layer-host keydown channel.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Basic dialog')).not.toBeInTheDocument(),
    )
  },
}

export const NonDismissable: Story = {
  render: () => <NonDismissableDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open blocking dialog'))
    const doc = body(canvasElement)
    await doc.findByText('Confirm irreversible action')

    // Escape must be refused — the dialog stays.
    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 250))
    await expect(
      doc.getByText('Confirm irreversible action'),
    ).toBeInTheDocument()
    // Presented, not merely still-exiting — the refusal must be real.
    await expect(
      canvasElement.ownerDocument.querySelector(
        'dialog[data-overlaid-phase="presented"]',
      ),
    ).not.toBeNull()

    // The programmatic path always goes through.
    await userEvent.click(doc.getByText('Done'))
    await waitFor(() =>
      expect(
        doc.queryByText('Confirm irreversible action'),
      ).not.toBeInTheDocument(),
    )
  },
}

export const ScrollableContent: Story = {
  render: () => <ScrollableDialog />,
}

export const StyledSurfaceAndBackdrop: Story = {
  render: () => <StyledDialog />,
}

export const CompoundParts: Story = {
  render: () => <CompoundDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open compound dialog'))
    const doc = body(canvasElement)
    await doc.findByText('Compound API')
    await userEvent.click(doc.getByLabelText('Close dialog'))
    await waitFor(() =>
      expect(doc.queryByText('Compound API')).not.toBeInTheDocument(),
    )
  },
}

export const BrowserDelegatedClosedBy: Story = {
  name: "web.dismissal='closedby' — the browser owns dismissal",
  render: () => <ClosedByDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open closedby dialog'))
    await doc.findByText('Browser-delegated dialog')
    const dialog = canvasElement.ownerDocument.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    // The delegated instance hands dismissal to <dialog closedby='any'>.
    await expect(dialog.getAttribute('closedby')).toBe('any')
    await expect(dialog.open).toBe(true)

    // The manual backdrop classifier is retired for this instance: the
    // synthetic press pair that closes a managed dialog is inert (untrusted
    // events can never trigger the UA's own light dismiss either).
    dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 200))
    await expect(dialog.open).toBe(true)
    await expect(dialog.dataset.overlaidPhase).toBe('presented')

    // The browser's own close (what its light dismiss / close request
    // performs) is a fait accompli the chrome self-reports into the kernel.
    dialog.close()
    await waitFor(() =>
      expect(
        doc.queryByText('Browser-delegated dialog'),
      ).not.toBeInTheDocument(),
    )
  },
}
