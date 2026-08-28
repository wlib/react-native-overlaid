import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  BasicDialog,
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

export const DelegatedCloseRequest: Story = {
  name: 'Delegated close request: browser cancel routes through the kernel',
  render: () => <BasicDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open dialog'))
    const doc = body(canvasElement)
    await doc.findByText('Basic dialog')

    // A vetoless dismissable dialog auto-delegates where closedby ships:
    // the kernel's keydown stands down and the browser's close watcher owns
    // Escape, surfacing as a cancelable `cancel` proposal.
    const dialog = canvasElement.ownerDocument.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLDialogElement
    await expect(dialog.getAttribute('closedby')).toBe('closerequest')

    // Drive the proposal itself (synthetic input cannot reach the real
    // close watcher): the chrome must preventDefault it and close through
    // the kernel lifecycle — dialog still open, exit phase running.
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await expect(dialog.open).toBe(true)
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
