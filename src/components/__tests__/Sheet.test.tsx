import { act, fireEvent, render } from '@testing-library/react-native'
import { Platform, ScrollView, StyleSheet, Text } from 'react-native'
import {
  dismissSpy,
  flushTrueSheetDismissals,
  getLatestTrueSheetProps,
  presentSpy,
  resetTrueSheetMock,
  setTrueSheetDismissDeferred,
  simulateNativeTrueSheetDismiss,
  simulateTrueSheetBack,
  staticDismissSpy,
} from '../../../jest.mocks/true-sheet'
import { OverlayHost } from '../../react/OverlayHost'
import { Popover } from '../Popover'
import { Sheet } from '../Sheet'

const sheet = (
  open: boolean,
  onOpenChange: (next: boolean) => void,
  props: Partial<React.ComponentProps<typeof Sheet>> = {},
) => (
  <OverlayHost>
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      {...props}
    >
      <Text>Sheet body</Text>
    </Sheet>
  </OverlayHost>
)

describe('Sheet native parity', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetTrueSheetMock()
  })

  afterEach(() => {
    setTrueSheetDismissDeferred(false)
    jest.useRealTimers()
  })

  it('maps intrinsic and explicit detents to a TrueSheet 3.11 presentation', async () => {
    const onOpenChange = jest.fn()
    const intrinsic = render(sheet(true, onOpenChange))
    await act(async () => {})

    expect(presentSpy).toHaveBeenCalledWith(0)
    expect(getLatestTrueSheetProps()?.detents).toEqual(['auto'])
    intrinsic.unmount()

    render(
      sheet(true, onOpenChange, {
        detents: ['full', '33%', '66%'],
        initialDetent: 0,
        handle: false,
        scrim: false,
      }),
    )
    await act(async () => {})

    expect(getLatestTrueSheetProps()?.detents).toEqual([0.33, 0.66, 1])
    expect(presentSpy).toHaveBeenLastCalledWith(2)
    expect(getLatestTrueSheetProps()).toMatchObject({
      grabber: false,
      dimmed: false,
    })
  })

  it('dismisses a still-presented OS sheet when unmounted while open', async () => {
    const screen = render(sheet(true, jest.fn()))
    await act(async () => {})
    expect(presentSpy).toHaveBeenCalled()
    expect(dismissSpy).not.toHaveBeenCalled()

    // Unmounting the React tree must not leak the live OS presentation
    // (which would sit over the app and block later modals). The instance
    // dismisses in the layout-cleanup window; the name-addressed static is
    // only the fallback once the instance is gone.
    screen.unmount()
    expect(dismissSpy).toHaveBeenCalledTimes(1)
  })

  it('does not issue an unmount dismissal after a completed close', async () => {
    const onOpenChange = jest.fn()
    const screen = render(sheet(true, onOpenChange))
    await act(async () => {})

    screen.rerender(sheet(false, onOpenChange))
    await act(async () => {})
    expect(dismissSpy).toHaveBeenCalledTimes(1)

    screen.unmount()
    expect(dismissSpy).toHaveBeenCalledTimes(1)
    expect(staticDismissSpy).not.toHaveBeenCalled()
  })

  it('classifies OS dismissal once and does not bounce the sheet open', async () => {
    const onOpenChange = jest.fn()
    const screen = render(sheet(true, onOpenChange))
    await act(async () => {})

    await act(async () => simulateNativeTrueSheetDismiss())

    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(presentSpy).toHaveBeenCalledTimes(1)
    expect(dismissSpy).not.toHaveBeenCalled()
    expect(screen.queryByText('Sheet body')).toBeNull()
  })

  it('re-presents after reopen during a deferred native exit', async () => {
    setTrueSheetDismissDeferred(true)
    const onOpenChange = jest.fn()
    const screen = render(sheet(true, onOpenChange))
    await act(async () => {})

    screen.rerender(sheet(false, onOpenChange))
    await act(async () => {})
    expect(dismissSpy).toHaveBeenCalledTimes(1)

    screen.rerender(sheet(true, onOpenChange))
    act(() => flushTrueSheetDismissals())
    await act(async () => {})

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(presentSpy).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Sheet body')).toBeTruthy()
  })

  it('keeps non-dismissable native gestures disabled but explicit close works', async () => {
    const onOpenChange = jest.fn()
    const screen = render(
      sheet(true, onOpenChange, {
        dismissable: false,
        showCloseButton: true,
      }),
    )
    await act(async () => {})

    expect(getLatestTrueSheetProps()?.dismissible).toBe(false)
    fireEvent.press(screen.getByLabelText('Close sheet'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables non-cancellable OS gestures when a veto exists and routes back through policy', async () => {
    const onOpenChange = jest.fn()
    const onDismissRequest = jest.fn(() => false)
    render(
      sheet(true, onOpenChange, {
        onDismissRequest,
      }),
    )
    await act(async () => {})

    expect(getLatestTrueSheetProps()?.dismissible).toBe(false)
    act(() => {
      expect(simulateTrueSheetBack()).toBe(true)
    })
    expect(onDismissRequest).toHaveBeenCalledWith('back-button')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('Sheet.ScrollView enables nested scrolling and applies bottom safe area', async () => {
    const onOpenChange = jest.fn()
    const screen = render(
      <OverlayHost>
        <Sheet
          open
          onOpenChange={onOpenChange}
          insets={{ bottom: 34 }}
          layout={{ maxHeight: 420 }}
        >
          <Sheet.ScrollView>
            <Text>Scrollable row</Text>
          </Sheet.ScrollView>
        </Sheet>
      </OverlayHost>,
    )
    await act(async () => {})

    const scroll = screen.UNSAFE_getByType(ScrollView)
    expect(scroll.props.nestedScrollEnabled).toBe(true)
    expect(StyleSheet.flatten(scroll.props.style).maxHeight).toBe(420)
    expect(
      StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom,
    ).toBe(34)
  })

  it('routes TrueSheet back through its local host while an anchored child is open', async () => {
    // The dismissible flip below is the ANDROID contract: TrueSheet consumes
    // back itself when dismissible, so back-routing to the nested layer
    // requires temporary non-dismissibility there. iOS keeps the sheet
    // dismissible (see the iOS-specific test below).
    const platform = jest.replaceProperty(Platform, 'OS', 'android')
    const screen = render(
      <OverlayHost>
        <Sheet open onOpenChange={() => {}}>
          <Popover closeOnScroll={false}>
            <Popover.Trigger>
              <Text>Nested sheet trigger</Text>
            </Popover.Trigger>
            <Popover.Content>
              <Text>Nested sheet panel</Text>
            </Popover.Content>
          </Popover>
        </Sheet>
      </OverlayHost>,
    )
    await act(async () => {})

    fireEvent.press(screen.getByText('Nested sheet trigger'))
    expect(screen.getByText('Nested sheet panel')).toBeTruthy()
    expect(getLatestTrueSheetProps()?.dismissible).toBe(false)

    act(() => {
      expect(simulateTrueSheetBack()).toBe(true)
    })
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
    expect(screen.queryByText('Nested sheet panel')).toBeNull()
    expect(getLatestTrueSheetProps()?.dismissible).toBe(true)
    platform.restore()
  })

  it('keeps the iOS sheet dismissible while an anchored child is open', async () => {
    // A non-dismissible iOS sheet swallows scrim taps and swipes with no
    // callback — if the nested-layer flip applied here, both channels would
    // go dead the moment a tooltip or popover opened inside the sheet.
    const screen = render(
      <OverlayHost>
        <Sheet open onOpenChange={() => {}}>
          <Popover closeOnScroll={false}>
            <Popover.Trigger>
              <Text>Nested sheet trigger</Text>
            </Popover.Trigger>
            <Popover.Content>
              <Text>Nested sheet panel</Text>
            </Popover.Content>
          </Popover>
        </Sheet>
      </OverlayHost>,
    )
    await act(async () => {})

    fireEvent.press(screen.getByText('Nested sheet trigger'))
    expect(screen.getByText('Nested sheet panel')).toBeTruthy()
    expect(getLatestTrueSheetProps()?.dismissible).toBe(true)
  })
})
