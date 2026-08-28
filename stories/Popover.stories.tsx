import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  BasicPopover,
  CloseOnScrollPopover,
  CssAnchorPlacements,
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
    // Still there AND still presented (data-overlaid-state="open") — not
    // vacuously present because a slow exit animation hasn't finished yet.
    const panel = doc
      .getByText('Close me')
      .closest('[data-overlaid-popover]') as HTMLElement
    await expect(panel).not.toBeNull()
    await expect(panel.dataset.overlaidState).toBe('open')

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
    await expect(panel.dataset.overlaidState).toBe('open')
  },
}

export const MixedChannels: Story = {
  name: 'Mixed channels: managed veto + delegated plain popover in one host',
  render: () => <ForcedDisplacementPopovers />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)
    const veto = 'Veto panel: onDismissRequest keeps me open'

    // Open the managed (veto) popover, then the delegated (plain) one on
    // top: the plain popover's kernel displacement fires at the veto
    // popover and the veto outranks the force, so both stay open.
    await userEvent.click(await canvas.findByText('Toggle veto popover'))
    await doc.findByText(veto)
    await userEvent.click(canvas.getByText('Toggle displacing popover'))
    await doc.findByText('Displacing panel')
    await expect(doc.getByText(veto)).toBeInTheDocument()

    // Channel split is visible at the mechanism level only: the vetoless
    // popover joined the browser's auto stack, the veto one stayed manual.
    const vetoPanel = doc
      .getByText(veto)
      .closest('[data-overlaid-popover]') as HTMLElement
    const plainPanel = doc
      .getByText('Displacing panel')
      .closest('[data-overlaid-popover]') as HTMLElement
    await expect(vetoPanel.getAttribute('popover')).toBe('manual')
    await expect(plainPanel.getAttribute('popover')).toBe('auto')

    // A synthetic outside press never reaches the browser's light dismiss,
    // so the kernel handles the delegated popover for it (trust gate) —
    // and the veto still refuses through the kernel.
    await userEvent.click(canvas.getByText(/Displacement \(opening a new/))
    await waitFor(() =>
      expect(doc.queryByText('Displacing panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText(veto)).toBeInTheDocument()

    // The real delegated path is a browser fait accompli: hidePopover()
    // fires the same toggle(closed) the auto stack produces, and the
    // kernel accepts the self-report. The veto popover is untouched.
    await userEvent.click(canvas.getByText('Toggle displacing popover'))
    const reopened = await doc.findByText('Displacing panel')
    ;(reopened.closest('[data-overlaid-popover]') as HTMLElement).hidePopover()
    await waitFor(() =>
      expect(doc.queryByText('Displacing panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText(veto)).toBeInTheDocument()
  },
}

export const MixedChannelsFallback: Story = {
  name: 'Mixed channels story under the no-caps mix (all managed, portal chrome)',
  render: () => <ForcedDisplacementPopovers />,
  parameters: { overlaidCaps: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)
    const veto = 'Veto panel: onDismissRequest keeps me open'

    // Identical semantics with every capability pinned off: the same
    // interactions, now entirely kernel-managed in the portal fallback.
    await userEvent.click(await canvas.findByText('Toggle veto popover'))
    await doc.findByText(veto)
    await userEvent.click(canvas.getByText('Toggle displacing popover'))
    await doc.findByText('Displacing panel')
    await expect(doc.getByText(veto)).toBeInTheDocument()

    const plainPanel = doc
      .getByText('Displacing panel')
      .closest('[data-overlaid-popover]') as HTMLElement
    await expect(plainPanel.getAttribute('popover')).toBeNull()

    await userEvent.click(canvas.getByText(/Displacement \(opening a new/))
    await waitFor(() =>
      expect(doc.queryByText('Displacing panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText(veto)).toBeInTheDocument()
  },
}

export const CssAnchorPositioning: Story = {
  name: 'CSS Anchor Positioning engine (closeOnScroll=false)',
  render: () => <CssAnchorPlacements />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    const trigger = await canvas.findByText('top')
    await userEvent.click(trigger)
    const panel = (await doc.findByText('Anchored top')).closest(
      '[data-overlaid-popover]',
    ) as HTMLElement

    // The CSS engine emits position-area (no Floating UI top/left), and the
    // browser resolves it: the panel sits above its trigger with the offset.
    await expect(panel.style.getPropertyValue('position-area')).toBe('top')
    await waitFor(() => {
      const panelRect = panel.getBoundingClientRect()
      const triggerRect = trigger.getBoundingClientRect()
      expect(panelRect.height).toBeGreaterThan(0)
      expect(panelRect.bottom).toBeLessThanOrEqual(triggerRect.top + 1)
    })

    // Semantics unchanged: a (synthetic) Escape dismisses through the
    // kernel's trust gate.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Anchored top')).not.toBeInTheDocument(),
    )
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
