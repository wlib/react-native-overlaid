import type { Meta, StoryObj } from '@storybook/react-native-web-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { OverlayHost } from '../src'
import {
  DialogFromDrawer,
  KitchenSink,
  NestedPopovers,
  PopoverInDialog,
  TooltipInSheet,
} from '../gallery/scenarios'

const meta: Meta = {
  title: 'Overlays/Stacking & Nesting',
  decorators: [
    (Story) => (
      <OverlayHost>
        <Story />
      </OverlayHost>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Layer-host arbitration across nested overlays: escape/outside-press walk the stack top-down; nesting (parentEntryId) spares ancestors; hints never displace deliberately opened popovers.',
      },
    },
  },
}

export default meta
type Story = StoryObj

const body = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body)

export const PopoverInsideDialog: Story = {
  render: () => <PopoverInDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open dialog'))
    await doc.findByText('Dialog with a popover')

    await userEvent.click(doc.getByText('Toggle nested popover'))
    await doc.findByText('Nested popover panel')

    // First escape unwinds only the popover…
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Nested popover panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Dialog with a popover')).toBeInTheDocument()

    // …second escape closes the dialog.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Dialog with a popover')).not.toBeInTheDocument(),
    )
  },
}

export const ClickInsideDialogSparesIt: Story = {
  name: 'Press inside the dialog closes only the popover',
  render: () => <PopoverInDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open dialog'))
    await userEvent.click(doc.getByText('Toggle nested popover'))
    await doc.findByText('Nested popover panel')

    // A press inside the dialog body is outside the popover but inside its
    // ancestor: the popover dismisses, the dialog must not.
    await userEvent.click(doc.getByText('Dialog body area'))
    await waitFor(() =>
      expect(doc.queryByText('Nested popover panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Dialog with a popover')).toBeInTheDocument()
  },
}

export const PopoverInsideDialogManagedDialog: Story = {
  name: 'Popover inside dialog — managed dialog + delegated popover mix',
  render: () => <PopoverInDialog />,
  // Popover capabilities on, closedby off: the dialog runs today's managed
  // machinery (the permanent Safari mode) while the nested popover
  // delegates — the cross-mode mix the automatic resolution produces on a
  // closedby-less engine. Semantics must match the fully-delegated story.
  parameters: { overlaidCaps: ['popover', 'popoverHint'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open dialog'))
    await doc.findByText('Dialog with a popover')
    const dialog = canvasElement.ownerDocument.querySelector(
      'dialog[data-overlaid-modal]',
    ) as HTMLElement
    await expect(dialog.getAttribute('closedby')).toBeNull()

    await userEvent.click(doc.getByText('Toggle nested popover'))
    const panel = (await doc.findByText('Nested popover panel')).closest(
      '[data-overlaid-popover]',
    ) as HTMLElement
    await expect(panel.getAttribute('popover')).toBe('auto')

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Nested popover panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Dialog with a popover')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Dialog with a popover')).not.toBeInTheDocument(),
    )
  },
}

export const NestedDelegatedPopovers: Story = {
  name: 'Nested delegated popovers unwind and spare ancestors',
  render: () => <NestedPopovers />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open outer popover'))
    await doc.findByText('Outer panel')
    await userEvent.click(doc.getByText('Toggle inner popover'))
    await doc.findByText('Inner panel')

    // Both vetoless popovers delegate; the inner one's invoker lives inside
    // the outer panel, so the browser stack mirrors the kernel's nesting.
    const outerPanel = doc
      .getByText('Outer panel')
      .closest('[data-overlaid-popover]') as HTMLElement
    const innerPanel = doc
      .getByText('Inner panel')
      .closest('[data-overlaid-popover]') as HTMLElement
    await expect(outerPanel.getAttribute('popover')).toBe('auto')
    await expect(innerPanel.getAttribute('popover')).toBe('auto')

    // Synthetic Escape routes through the kernel (trust gate): inner first.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Inner panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Outer panel')).toBeInTheDocument()

    // A press inside the outer panel closes only the inner popover.
    await userEvent.click(doc.getByText('Toggle inner popover'))
    await doc.findByText('Inner panel')
    await userEvent.click(doc.getByText(/A press here/))
    await waitFor(() =>
      expect(doc.queryByText('Inner panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Outer panel')).toBeInTheDocument()

    // The real delegated path: the browser's fait accompli on the inner
    // popover reports through its own toggle; the outer ancestor survives.
    await userEvent.click(doc.getByText('Toggle inner popover'))
    const reopened = await doc.findByText('Inner panel')
    ;(reopened.closest('[data-overlaid-popover]') as HTMLElement).hidePopover()
    await waitFor(() =>
      expect(doc.queryByText('Inner panel')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Outer panel')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Outer panel')).not.toBeInTheDocument(),
    )
  },
}

export const BrowserForcedCloseInNestedStack: Story = {
  name: 'Browser-forced dialog close spares the drawer beneath it',
  render: () => <DialogFromDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open drawer'))
    await doc.findByText('Drawer layer')
    await userEvent.click(doc.getByText('Open confirmation dialog'))
    const title = await doc.findByText('Discard changes?')

    // A real fait accompli on a still-mounted nested dialog: close() fires
    // the platform close event, which React also re-dispatches through
    // fiber ancestors — the drawer's chrome must ignore the child's event
    // (target filter) while the dialog reports its own close to the kernel.
    ;(title.closest('dialog') as HTMLDialogElement).close()
    await waitFor(() =>
      expect(doc.queryByText('Discard changes?')).not.toBeInTheDocument(),
    )
    await new Promise((resolve) => setTimeout(resolve, 150))
    await expect(doc.getByText('Drawer layer')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Drawer layer')).not.toBeInTheDocument(),
    )
  },
}

export const DialogAboveDrawer: Story = {
  render: () => <DialogFromDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open drawer'))
    await doc.findByText('Drawer layer')

    await userEvent.click(doc.getByText('Open confirmation dialog'))
    await doc.findByText('Discard changes?')

    // Escape unwinds one modal layer at a time, top-down.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Discard changes?')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Drawer layer')).toBeInTheDocument()

    // The dialog's DOM unmounts a passive-effect pass before its layer-host
    // entry unregisters, and an exiting modal still swallows Escape by
    // design. Give that cleanup a beat so this Escape reaches the drawer.
    await new Promise((resolve) => setTimeout(resolve, 80))
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Drawer layer')).not.toBeInTheDocument(),
    )
  },
}

export const TooltipInsideSheet: Story = {
  render: () => <TooltipInSheet />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open sheet'))
    await doc.findByText('Deposit terms')

    // Web top-layer ordering: the tooltip is a [popover] promoted AFTER the
    // sheet's <dialog>, so it paints above it. The panel rendering at all
    // while the sheet is open is the web half of the assertion; z-order
    // itself is the browser's top-layer contract.
    await userEvent.hover(doc.getByText('ⓘ'))
    await doc.findByText(/portals into the sheet's own host/)
    await expect(doc.getByText('Deposit terms')).toBeInTheDocument()
  },
}

export const KitchenSinkThreeDeep: Story = {
  name: 'Kitchen sink: dialog → popover → tooltip',
  render: () => <KitchenSink />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const doc = body(canvasElement)

    await userEvent.click(await canvas.findByText('Open kitchen sink'))
    await doc.findByText('Three layers deep')
    await userEvent.click(doc.getByText('Open popover'))
    await doc.findByText('Hover for layer three')

    await userEvent.hover(doc.getByText('ⓘ'))
    await doc.findByText('Tooltip anchored inside a popover inside a dialog.')

    // Escape unwinds: tooltip → popover → dialog.
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        doc.queryByText('Tooltip anchored inside a popover inside a dialog.'),
      ).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Hover for layer three')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Hover for layer three')).not.toBeInTheDocument(),
    )
    await expect(doc.getByText('Three layers deep')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(doc.queryByText('Three layers deep')).not.toBeInTheDocument(),
    )
  },
}
