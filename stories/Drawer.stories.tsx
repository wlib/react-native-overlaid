import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  BasicDrawer,
  NarrowDrawer,
  NoBackdropDrawer,
  NonDismissableDrawer,
  StyledDrawer,
} from '../gallery/scenarios'

const meta: Meta = {
  title: 'Overlays/Drawer',
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

export const RightSide: Story = {
  render: () => <BasicDrawer side="right" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open right drawer'))
    const doc = body(canvasElement)
    await doc.findByText('right drawer')

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('right drawer')).not.toBeInTheDocument(),
    )
  },
}

export const LeftSide: Story = {
  render: () => <BasicDrawer side="left" />,
}

export const FixedWidthScrolling: Story = {
  render: () => <NarrowDrawer />,
}

export const NonDismissable: Story = {
  render: () => <NonDismissableDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Open blocking drawer'))
    const doc = body(canvasElement)
    await doc.findByText('Unsaved changes')

    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 250))
    await expect(doc.getByText('Unsaved changes')).toBeInTheDocument()
    // Presented, not merely still-exiting — the refusal must be real.
    await expect(
      canvasElement.ownerDocument.querySelector(
        'dialog[data-overlaid-phase="presented"]',
      ),
    ).not.toBeNull()

    await userEvent.click(doc.getByText('Save and close'))
    await waitFor(() =>
      expect(doc.queryByText('Unsaved changes')).not.toBeInTheDocument(),
    )
  },
}

export const NoBackdrop: Story = {
  render: () => <NoBackdropDrawer />,
}

export const StyledSurface: Story = {
  render: () => <StyledDrawer />,
}
