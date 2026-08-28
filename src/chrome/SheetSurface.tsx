// NATIVE SheetSurface: an imperative TrueSheet interpreted through the pure
// sheet-host machine. Native completion events, never current props, classify
// user- versus JS-initiated dismissal.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react'
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { TrueSheet, type SheetDetent } from '@lodev09/react-native-true-sheet'
import {
  normalizeDetents,
  resolveNativeSheet,
  type Detent,
} from '../core/detents'
import { reduceSheetHost } from '../core/sheetHostMachine'
import { assertNever, type LayerHost } from '../core/types'
import { LayerHostProvider, useLayerStack } from '../react/LayerHostContext'
import {
  useOverlayContext,
  type CrossPlatformStyle,
} from '../react/overlayContext'
import { PortalHost } from '../react/portal'
import { useReducerWithCommands } from '../react/useReducerWithCommands'
import { useDismissAccessibility } from './dismissAccessibility'

const SHEET_CORNER_RADIUS = 16
const SHEET_BLUR_IOS = 'system-material-light' as const
const SHEET_BACKGROUND_ANDROID = 'rgb(255, 255, 255)'

export type SheetSurfaceProps = {
  detents?: ReadonlyArray<Detent>
  initialDetent?: number
  handle?: boolean
  scrim?: { className?: string; color?: string; opacity?: number } | false
  dismissable?: boolean
  /** Native must disable non-cancellable OS gestures when a veto is installed. */
  hasDismissRequestHandler?: boolean
  accessibilityLabel?: string
  className?: string
  style?: CrossPlatformStyle
  children: ReactNode
}

export function SheetSurface({
  detents,
  initialDetent,
  handle = true,
  scrim,
  dismissable = true,
  hasDismissRequestHandler = false,
  accessibilityLabel,
  style,
  children,
}: SheetSurfaceProps) {
  const context = useOverlayContext()
  const { state, signals, actions, panelId } = context
  const localHostName = `overlaid-sheet-${panelId}`
  const hostRef = useRef<LayerHost | null>(null)
  const sheetRef = useRef<ComponentRef<typeof TrueSheet> | null>(null)
  const [hasNestedLayers, setHasNestedLayers] = useState(false)
  const { height: screenHeight } = useWindowDimensions()
  const dismissAccessibility = useDismissAccessibility(
    context.actions,
    accessibilityLabel,
    context.dismissable,
  )
  const [presentationConfig, setPresentationConfig] = useState(() => ({
    detents,
    initialDetent,
  }))
  const wasOpen = useRef(state.isOpen)

  // Detents are presentation inputs. Ignore live prop churn while a native
  // sheet is open; a close/reopen snapshots the latest configuration.
  useLayoutEffect(() => {
    if (!wasOpen.current && state.isOpen) {
      setPresentationConfig({ detents, initialDetent })
    }
    wasOpen.current = state.isOpen
  }, [detents, initialDetent, state.isOpen])

  const { nativeDetents, presentIndex } = mapDetents(
    presentationConfig.detents,
    presentationConfig.initialDetent,
    screenHeight,
  )

  const reportCommandFailure = useCallback(
    (operation: string, error: unknown) => {
      if ((globalThis as { __DEV__?: boolean }).__DEV__ !== false) {
        console.warn(
          `react-native-overlaid: TrueSheet.${operation}() failed`,
          error,
        )
      }
    },
    [],
  )

  // The OS presentation outlives this component unless someone dismisses
  // it: unmounting while presented (a route change dropping the subtree,
  // list virtualization, a conditional render) would otherwise leak a
  // live sheet over the app and block later modal presentations.
  const needsUnmountDismiss = useRef(false)

  // Layout effect: its unmount cleanup runs in the mutation phase, while
  // the TrueSheet host view (and its ref) still exist — a passive cleanup
  // would run after native teardown, too late to reach the presentation.
  useLayoutEffect(() => {
    const sheetName = localHostName
    return () => {
      if (!needsUnmountDismiss.current) return
      needsUnmountDismiss.current = false
      // Reading the ref at cleanup time is the point: the mutation phase
      // runs parent cleanups before detaching child refs, so this is the
      // last moment the live TrueSheet instance is reachable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const instance = sheetRef.current
      const viaInstance = instance
        ? instance.dismiss()
        : Promise.reject(new Error('unmounted'))
      void viaInstance.catch(() =>
        TrueSheet.dismiss(sheetName).catch(() => {
          // Already torn down natively — nothing left to dismiss.
        }),
      )
    }
  }, [localHostName])

  const [, send] = useReducerWithCommands(
    reduceSheetHost,
    'closed',
    (command) => {
      switch (command) {
        case 'present':
          needsUnmountDismiss.current = true
          void sheetRef.current
            ?.present(presentIndex)
            .catch((error) => reportCommandFailure('present', error))
          break
        case 'dismiss':
          void sheetRef.current
            ?.dismiss()
            .catch((error) => reportCommandFailure('dismiss', error))
          break
        case 'hostShown':
          signals.onHostShown()
          signals.onLayoutReady()
          break
        case 'notifyClosed':
          actions.setOpen(false)
          break
        case 'exitComplete':
          signals.onHostDismissed()
          break
        default:
          assertNever(command)
      }
    },
  )

  useEffect(() => send(state.isOpen ? 'OPEN' : 'CLOSE'), [send, state.isOpen])

  // TrueSheet 3.11 handles Android back internally before invoking
  // onBackPress when dismissible, so Android must go temporarily
  // non-dismissible while a nested layer exists — that lets the deepest
  // layer consume back first. iOS must NOT: it has no routed back channel,
  // and a non-dismissible sheet swallows scrim taps and swipes with no
  // callback, leaving them dead while a tooltip/popover is open inside.
  // The iOS trade-off is that a scrim tap dismisses the sheet natively,
  // taking its nested layers with it (OS-owned channel, documented in
  // PLATFORM-DIVERGENCES) instead of unwinding one layer at a time.
  const nativeDismissible =
    dismissable &&
    !hasDismissRequestHandler &&
    (Platform.OS !== 'android' || !hasNestedLayers)

  // A surface backgroundColor must paint the WHOLE sheet, including the
  // bottom safe-area band below hugging content — that band belongs to
  // TrueSheet's own background, so route the color there and keep the
  // remaining surface styles on the inner view.
  const flatSurfaceStyle =
    StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {}
  const surfaceBackground =
    typeof flatSurfaceStyle.backgroundColor === 'string'
      ? flatSurfaceStyle.backgroundColor
      : undefined

  return (
    <TrueSheet
      ref={sheetRef}
      name={localHostName}
      detents={nativeDetents}
      cornerRadius={SHEET_CORNER_RADIUS}
      {...(Platform.OS === 'ios' && surfaceBackground === undefined
        ? { backgroundBlur: SHEET_BLUR_IOS }
        : {})}
      {...(surfaceBackground !== undefined
        ? { backgroundColor: surfaceBackground }
        : Platform.OS === 'android'
          ? { backgroundColor: SHEET_BACKGROUND_ANDROID }
          : {})}
      grabber={handle}
      dimmed={scrim !== false}
      dismissible={nativeDismissible}
      onBackPress={() => {
        // When dismissible, TrueSheet has already initiated the native
        // dismissal; onDidDismiss will notify the kernel exactly once.
        if (nativeDismissible) return true
        return hostRef.current?.dispatchBackButton() !== 'unhandled'
      }}
      {...(accessibilityLabel
        ? { accessibilityOptions: { paneTitle: accessibilityLabel } }
        : {})}
      onDidPresent={() => send('DID_PRESENT')}
      onDidDismiss={() => {
        needsUnmountDismiss.current = false
        send('DID_DISMISS')
      }}
    >
      <LayerHostProvider name={localHostName} hostRef={hostRef}>
        <NestedLayerObserver onChange={setHasNestedLayers} />
        <View
          ref={context.refs.surface as never}
          {...context.a11y.surface}
          {...dismissAccessibility}
          // The OS grabber floats OVER the content area; without top
          // clearance it draws through the first line of sheet content.
          style={[
            handle ? grabberClearanceStyle : undefined,
            style as StyleProp<ViewStyle>,
          ]}
        >
          {children}
        </View>
        <PortalHost name={localHostName} style={styles.portal} />
      </LayerHostProvider>
    </TrueSheet>
  )
}

function NestedLayerObserver({
  onChange,
}: {
  onChange: (active: boolean) => void
}) {
  const stack = useLayerStack()
  useLayoutEffect(() => onChange(stack.length > 0), [onChange, stack.length])
  return null
}

function mapDetents(
  detents: ReadonlyArray<Detent> | undefined,
  initialDetent: number | undefined,
  screenHeight: number,
): { nativeDetents: SheetDetent[]; presentIndex: number } {
  const list = normalizeDetents(detents)
  if (list.length === 1 && list[0] === 'content') {
    return { nativeDetents: ['auto'], presentIndex: 0 }
  }

  const resolved = resolveNativeSheet(detents, initialDetent, screenHeight)
  return {
    nativeDetents: [...resolved.allowedDetents],
    presentIndex: resolved.initialDetentIndex,
  }
}

const grabberClearanceStyle: ViewStyle = { paddingTop: 16 }

const styles = {
  portal: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
}
