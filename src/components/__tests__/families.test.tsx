import { createContext, useContext, useState } from 'react'
import { act, fireEvent, render, within } from '@testing-library/react-native'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useContextBridge } from '../../react/contextBridge'
import * as measurement from '../../react/measurement'
import { OverlayHost } from '../../react/OverlayHost'
import { Dialog } from '../Dialog'
import { Drawer } from '../Drawer'
import { Popover } from '../Popover'
import { Tooltip } from '../Tooltip'

const flushExit = (ms = 250) => {
  act(() => jest.advanceTimersByTime(ms))
}

describe('native component-family parity', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('Dialog names its modal surface and applies backdrop/programmatic precedence', () => {
    const onOpenChange = jest.fn()
    const veto = jest.fn(() => false)
    const screen = render(
      <OverlayHost>
        <Dialog
          open
          onOpenChange={onOpenChange}
          onDismissRequest={veto}
          title="Delete draft"
          description="This cannot be undone"
        >
          <Text>Dialog body</Text>
        </Dialog>
      </OverlayHost>,
    )

    const dialog = screen.UNSAFE_getByProps({
      role: 'dialog',
      accessibilityViewIsModal: true,
    })
    expect(dialog.props.accessibilityActions).toEqual([{ name: 'dismiss' }])
    dialog.props.onAccessibilityEscape()
    expect(veto).toHaveBeenCalledWith('escape')
    veto.mockClear()
    expect(screen.getByText('Delete draft')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Dismiss'))
    expect(veto).toHaveBeenCalledWith('backdrop-press')
    expect(onOpenChange).not.toHaveBeenCalled()

    fireEvent.press(screen.getByLabelText('Close dialog'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('bounds and scrolls native dialog and drawer content', () => {
    const dialog = render(
      <OverlayHost>
        <Dialog open onOpenChange={jest.fn()} title="Long">
          <Text>Tall body</Text>
        </Dialog>
      </OverlayHost>,
    )
    // Native views overflow visibly, so the surface must clip to the
    // centered wrapper's bound and scroll overflowing content instead of
    // painting past the screen edge — with the Close pinned to the surface,
    // never scrolling away inside the body region.
    const dialogScrollers = dialog.UNSAFE_getAllByType(ScrollView)
    expect(dialogScrollers.length).toBeGreaterThan(0)
    expect(dialog.getByLabelText('Close dialog')).toBeTruthy()
    for (const scroller of dialogScrollers) {
      expect(within(scroller).queryByLabelText('Close dialog')).toBeNull()
    }
    dialog.unmount()

    const drawer = render(
      <OverlayHost>
        <Drawer open onOpenChange={jest.fn()}>
          <Text>Row 40</Text>
        </Drawer>
      </OverlayHost>,
    )
    const scrollers = drawer.UNSAFE_getAllByType(ScrollView)
    expect(scrollers.length).toBeGreaterThan(0)
    expect(drawer.getByLabelText('Close drawer')).toBeTruthy()
    // The pinned close must NOT live inside the scroll content.
    for (const scroller of scrollers) {
      expect(within(scroller).queryByLabelText('Close drawer')).toBeNull()
    }
  })

  it('Dialog compound parts use the same lifecycle and explicit Close action', () => {
    const onOpenChange = jest.fn()
    const screen = render(
      <OverlayHost>
        <Dialog.Root open onOpenChange={onOpenChange}>
          <Dialog.Content>
            <Dialog.Title>Compound title</Dialog.Title>
            <Dialog.Description>Compound description</Dialog.Description>
            <Dialog.Close />
          </Dialog.Content>
        </Dialog.Root>
      </OverlayHost>,
    )

    expect(screen.getByText('Compound title')).toBeTruthy()
    expect(screen.getByText('Compound description')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Close dialog'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('omits unavailable accessibility dismissal on a non-dismissable dialog', () => {
    const screen = render(
      <OverlayHost>
        <Dialog
          open
          onOpenChange={() => {}}
          dismissable={false}
          title="Persistent dialog"
        >
          <Text>Dialog body</Text>
        </Dialog>
      </OverlayHost>,
    )

    const dialog = screen.UNSAFE_getByProps({
      role: 'dialog',
      accessibilityViewIsModal: true,
    })
    expect(dialog.props.accessibilityActions).toBeUndefined()
    expect(dialog.props.onAccessibilityEscape).toBeUndefined()
  })

  it('Drawer honors side, additive safe-area padding, and an interactive no-backdrop mode', () => {
    const onOpenChange = jest.fn()
    const screen = render(
      <OverlayHost>
        <Drawer
          open
          onOpenChange={onOpenChange}
          side="left"
          backdrop={false}
          accessibilityLabel="Filters"
          insets={{ top: 40, bottom: 24 }}
          surface={{ style: { padding: 20 } }}
        >
          <Text>Drawer body</Text>
        </Drawer>
      </OverlayHost>,
    )

    const panel = screen.getByLabelText('Filters')
    expect(StyleSheet.flatten(panel.props.style)).toMatchObject({
      left: 0,
      paddingTop: 60,
      paddingBottom: 44,
    })
    expect(screen.queryByLabelText('Dismiss')).toBeNull()
    fireEvent.press(screen.getByLabelText('Close drawer'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('Popover toggles uncontrolled, exposes render-prop close, and force-displaces auto', async () => {
    const screen = render(
      <OverlayHost>
        <Popover closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Trigger A</Text>
          </Popover.Trigger>
          <Popover.Content>
            {({ close }) => (
              <Text accessibilityRole="button" onPress={close}>
                Close panel A
              </Text>
            )}
          </Popover.Content>
        </Popover>
        <Popover closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Trigger B</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Panel B</Text>
          </Popover.Content>
        </Popover>
      </OverlayHost>,
    )

    fireEvent.press(screen.getByText('Trigger A'))
    expect(screen.getByText('Close panel A')).toBeTruthy()

    fireEvent.press(screen.getByText('Trigger B'))
    expect(screen.getByText('Panel B')).toBeTruthy()
    expect(screen.queryByText('Close panel A')).toBeNull()

    const underlay = screen
      .UNSAFE_getAllByProps({ accessible: false })
      .find((node) => node.props.onPress)
    expect(underlay).toBeDefined()
    fireEvent.press(underlay!, {
      nativeEvent: { pageX: 1, pageY: 1 },
    })
    // The underlay resolves its trigger hit-test (bounded by its deadline
    // timer) before dismissing, so flush timers and microtasks together.
    await act(async () => jest.advanceTimersByTime(150))
    flushExit()
    expect(screen.queryByText('Panel B')).toBeNull()

    fireEvent.press(screen.getByText('Trigger B'))
    expect(screen.getByText('Panel B')).toBeTruthy()
    fireEvent.press(screen.getByText('Trigger B'))
    flushExit()
    expect(screen.queryByText('Panel B')).toBeNull()
  })

  it('veto survives forced popover displacement while dismissable=false does not', async () => {
    const veto = jest.fn(() => false)
    const screen = render(
      <OverlayHost>
        <Popover dismissable={false} closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Sticky trigger</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Sticky panel</Text>
          </Popover.Content>
        </Popover>
        <Popover onDismissRequest={veto} closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Veto trigger</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Veto panel</Text>
          </Popover.Content>
        </Popover>
        <Popover closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Displacer trigger</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Displacer panel</Text>
          </Popover.Content>
        </Popover>
      </OverlayHost>,
    )

    fireEvent.press(screen.getByText('Sticky trigger'))
    expect(screen.getByText('Sticky panel')).toBeTruthy()
    fireEvent.press(screen.getByText('Veto trigger'))
    await act(async () => {})
    expect(screen.queryByText('Sticky panel')).toBeNull()
    expect(screen.getByText('Veto panel')).toBeTruthy()

    fireEvent.press(screen.getByText('Displacer trigger'))
    await act(async () => {})
    expect(veto).toHaveBeenCalledWith('outside-press')
    expect(screen.getByText('Veto panel')).toBeTruthy()
    expect(screen.getByText('Displacer panel')).toBeTruthy()
  })

  it('Tooltip tap toggles, exposes an accessibility hint, and never displaces a popover', () => {
    const screen = render(
      <OverlayHost>
        <Popover closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Popover trigger</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Popover panel</Text>
          </Popover.Content>
        </Popover>
        <Tooltip text="Helpful hint" closeOnScroll={false}>
          {({ ref, onPress, accessibilityHint }) => (
            <Pressable
              ref={ref as never}
              onPress={onPress}
              accessibilityHint={accessibilityHint}
            >
              <Text>Tooltip trigger</Text>
            </Pressable>
          )}
        </Tooltip>
      </OverlayHost>,
    )

    fireEvent.press(screen.getByText('Popover trigger'))
    fireEvent.press(screen.getByHintText('Helpful hint'))
    expect(screen.getByText('Popover panel')).toBeTruthy()
    expect(screen.getByText('Helpful hint')).toBeTruthy()

    fireEvent.press(screen.getByHintText('Helpful hint'))
    flushExit()
    expect(screen.queryByText('Helpful hint')).toBeNull()
    expect(screen.getByText('Popover panel')).toBeTruthy()
  })

  it('an underlay press landing on a hint trigger opens it without dismissing the popover', async () => {
    // On the device the popover's DismissUnderlay owns every outside tap, so
    // the hint-vs-auto rule has to hold on that path too — the registry hit
    // must resolve as a hint and skip the outside-press dismissal.
    const measureSpy = jest
      .spyOn(measurement, 'measureNodeInWindow')
      .mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 })
    try {
      const screen = render(
        <OverlayHost>
          <Popover closeOnScroll={false}>
            <Popover.Trigger>
              <Text>Popover trigger</Text>
            </Popover.Trigger>
            <Popover.Content>
              <Text>Popover panel</Text>
            </Popover.Content>
          </Popover>
          <Tooltip text="Helpful hint" closeOnScroll={false}>
            <Text>Tooltip trigger</Text>
          </Tooltip>
        </OverlayHost>,
      )

      fireEvent.press(screen.getByText('Popover trigger'))
      expect(screen.getByText('Popover panel')).toBeTruthy()

      // Newest registration wins the hit-test, and the Tooltip registered
      // after the Popover — the press resolves to the hint trigger.
      const underlay = screen
        .UNSAFE_getAllByProps({ accessible: false })
        .find((node) => node.props.onPress)
      expect(underlay).toBeDefined()
      fireEvent.press(underlay!, { nativeEvent: { pageX: 5, pageY: 5 } })
      await act(async () => {})
      flushExit()

      expect(screen.getByText('Helpful hint')).toBeTruthy()
      expect(screen.getByText('Popover panel')).toBeTruthy()
    } finally {
      measureSpy.mockRestore()
    }
  })
})

describe('native nesting and portal integration', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('routes a modal-window back request to a nested popover before its dialog', () => {
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
                <Text>Nested panel</Text>
              </Popover.Content>
            </Popover>
          </Dialog>
        </OverlayHost>
      )
    }

    const screen = render(<Harness />)
    fireEvent.press(screen.getByText('Nested trigger'))
    expect(screen.getByText('Nested panel')).toBeTruthy()

    const modal = screen.UNSAFE_getByType(Modal)
    act(() => modal.props.onRequestClose())
    flushExit()
    expect(screen.queryByText('Nested panel')).toBeNull()
    expect(screen.getByText('Parent dialog')).toBeTruthy()

    act(() => modal.props.onRequestClose())
    flushExit()
    expect(screen.queryByText('Parent dialog')).toBeNull()
  })

  it('uses contextBridge to preserve source context through a native portal', () => {
    const SourceContext = createContext('host-default')

    function PortaledValue() {
      return <Text>{useContext(SourceContext)}</Text>
    }

    function AnchoredConsumer() {
      const Bridge = useContextBridge(SourceContext)
      return (
        <Popover contextBridge={Bridge} closeOnScroll={false}>
          <Popover.Trigger>
            <Text>Open bridged panel</Text>
          </Popover.Trigger>
          <Popover.Content>
            <View>
              <PortaledValue />
            </View>
          </Popover.Content>
        </Popover>
      )
    }

    const screen = render(
      <OverlayHost>
        <SourceContext.Provider value="source-value">
          <AnchoredConsumer />
        </SourceContext.Provider>
      </OverlayHost>,
    )
    fireEvent.press(screen.getByText('Open bridged panel'))
    expect(screen.getByText('source-value')).toBeTruthy()
  })
})
