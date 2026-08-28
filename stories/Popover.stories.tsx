import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  BasicPopover,
  CloseOnScrollPopover,
  DisplacingPopovers,
  ForcedDisplacementPopovers,
  NonDismissablePopover,
  OutsidePressPopover,
  PopoverPlacements,
  ScrollInsidePopover,
} from '../gallery/scenarios'

const meta: Meta = {
  title: 'Overlays/Popover',
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

export const Basic: Story = {
  render: () => <BasicPopover />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText('Toggle popover'))
    const doc = body(canvasElement)
    await doc.findByText('Close')
    // Escape dismisses the transient.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Close')).not.toBeInTheDocument(),
    )
  },
}

export const DisplacesOtherPopover: Story = {
  name: 'Opening one popover closes the other (auto displaces auto)',
  render: () => <DisplacingPopovers />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Left trigger'))
    await doc.findByText('Left panel')

    await userEvent.click(canvas.getByText('Right trigger'))
    await doc.findByText('Right panel')
    await waitFor(() =>
      expect(doc.queryByText('Left panel')).not.toBeInTheDocument(),
    )
  },
}

export const OutsidePressDismisses: Story = {
  render: () => <OutsidePressPopover />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open popover'))
    await doc.findByText('Popover panel')

    await userEvent.click(canvas.getByText('Neutral area'))
    await waitFor(() =>
      expect(doc.queryByText('Popover panel')).not.toBeInTheDocument(),
    )
  },
}

export const Placements: Story = {
  render: () => <PopoverPlacements />,
}

export const NonDismissable: Story = {
  render: () => <NonDismissablePopover />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open sticky popover'))
    await doc.findByText('Close me')

    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 200))
    // Still there AND still presented (opacity 1) — not vacuously present
    // because a slow exit animation hasn't finished yet.
    const panel = doc
      .getByText('Close me')
      .closest('[data-overlaid-popover]') as HTMLElement
    await expect(panel).not.toBeNull()
    await expect(panel.style.opacity).toBe('1')

    await userEvent.click(doc.getByText('Close me'))
    await waitFor(() =>
      expect(doc.queryByText('Close me')).not.toBeInTheDocument(),
    )
  },
}

export const CloseOnScroll: Story = {
  name: 'closeOnScroll (default) — page scroll dismisses',
  render: () => <CloseOnScrollPopover />,
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open, then scroll the page'))
    await doc.findByText('I close when the page scrolls')

    // The hook's listener is a capture-phase window listener in the canvas
    // document — a scroll dispatched anywhere outside the panel reaches it.
    const win = canvasElement.ownerDocument.defaultView as Window
    win.dispatchEvent(new Event('scroll'))
    await waitFor(() =>
      expect(
        doc.queryByText('I close when the page scrolls'),
      ).not.toBeInTheDocument(),
    )
  },
}

export const ScrollInsidePanelDoesNotDismiss: Story = {
  name: 'closeOnScroll exemption — scrolling inside the panel',
  render: () => <ScrollInsidePopover />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open scrollable popover'))
    const row = await doc.findByText('Row 1 — scrollable filler content')

    // Same capture-phase channel, but the event target is inside the
    // popover's own panel — the panelRef exemption must keep it open.
    row.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 200))
    const panel = doc
      .getByText('Row 1 — scrollable filler content')
      .closest('[data-overlaid-popover]') as HTMLElement
    await expect(panel).not.toBeNull()
    await expect(panel.style.opacity).toBe('1')
  },
}

export const DisplacementVsNonDismissable: Story = {
  name: 'Displacement force-closes dismissable=false; veto survives',
  render: () => <ForcedDisplacementPopovers />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    // 1. dismissable={false} does NOT protect against displacement: opening
    //    another popover fires with force, which bypasses dismissability.
    await userEvent.click(
      await canvas.findByText('Open sticky popover (force-displaced)'),
    )
    await doc.findByText('Sticky panel: displacement still force-closes me')

    await userEvent.click(canvas.getByText('Toggle displacing popover'))
    await doc.findByText('Displacing panel')
    await waitFor(() =>
      expect(
        doc.queryByText('Sticky panel: displacement still force-closes me'),
      ).not.toBeInTheDocument(),
    )

    // 2. An onDismissRequest veto outranks force: the veto popover survives
    //    the displacing popover opening. (Clicking the veto trigger first
    //    outside-presses the displacer away — expected auto behavior.)
    await userEvent.click(canvas.getByText('Toggle veto popover'))
    await doc.findByText('Veto panel: onDismissRequest keeps me open')

    await userEvent.click(canvas.getByText('Toggle displacing popover'))
    await doc.findByText('Displacing panel')
    await new Promise((resolve) => setTimeout(resolve, 200))
    await expect(
      doc.getByText('Veto panel: onDismissRequest keeps me open'),
    ).toBeInTheDocument()
  },
}
