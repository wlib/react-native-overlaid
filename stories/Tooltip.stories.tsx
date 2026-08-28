import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  BoundedTooltip,
  EscapeDismissesTooltip,
  // Aliased: the story export below must keep this exact name so the
  // story id stays stable.
  HintDoesNotDisplaceAuto as HintDoesNotDisplaceAutoScenario,
  HoverFocusTooltip,
  RenderPropTooltip,
} from '../gallery/scenarios'

const meta: Meta = {
  title: 'Overlays/Tooltip',
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

export const HoverAndFocus: Story = {
  render: () => <HoverFocusTooltip />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)
    const trigger = await canvas.findByText('Hover or focus me')

    await userEvent.hover(trigger)
    await doc.findByText(
      'Shown on mouse hover and keyboard focus; hidden on leave/blur.',
    )

    await userEvent.unhover(trigger)
    await waitFor(() =>
      expect(
        doc.queryByText(
          'Shown on mouse hover and keyboard focus; hidden on leave/blur.',
        ),
      ).not.toBeInTheDocument(),
    )
  },
}

export const EscapeDismissesHint: Story = {
  name: 'Escape dismisses (WCAG 1.4.13)',
  render: () => <EscapeDismissesTooltip />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)
    await userEvent.hover(await canvas.findByText('Hover, then press Escape'))
    await doc.findByText(
      'Escape must dismiss hover content without moving the pointer.',
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        doc.queryByText(
          'Escape must dismiss hover content without moving the pointer.',
        ),
      ).not.toBeInTheDocument(),
    )
  },
}

export const HintDoesNotDisplaceAuto: Story = {
  name: 'Hovering a tooltip never closes an open popover',
  render: () => <HintDoesNotDisplaceAutoScenario />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('1. Open this popover'))
    await doc.findByText('Popover stays open')

    await userEvent.hover(canvas.getByText('2. Then hover me'))
    await doc.findByText('Hovering me must not close the popover.')
    // The load-bearing asymmetry: hint.displacesTransientsOnOpen = false.
    await expect(doc.getByText('Popover stays open')).toBeInTheDocument()
  },
}

export const WithBoundary: Story = {
  render: () => <BoundedTooltip />,
}

export const RenderPropTrigger: Story = {
  render: () => <RenderPropTooltip />,
}
