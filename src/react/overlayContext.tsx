import { createContext, useContext } from 'react'
import type { CSSProperties, RefCallback, RefObject } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type {
  Behavior,
  Bounds,
  DismissEvent,
  OverlayKind,
  OverlayRole,
  Phase,
} from '../core/types'
import type { AnchoredPosition } from './anchoredPosition'
import type { DismissChannel } from './dismissChannel'

export type CrossPlatformStyle = StyleProp<ViewStyle> | CSSProperties
export type SlotOverride = {
  className?: string | undefined
  style?: CrossPlatformStyle | undefined
}

/** Values must be representable by both RN and CSS (numbers or percentages). */
export type OverlayLayoutValue = number | `${number}%`
export type OverlayLayout = {
  width?: OverlayLayoutValue | undefined
  maxWidth?: OverlayLayoutValue | undefined
  minWidth?: OverlayLayoutValue | undefined
  maxHeight?: OverlayLayoutValue | undefined
  minHeight?: OverlayLayoutValue | undefined
  horizontalPadding?: number | undefined
}

export type OverlayInsets = {
  top?: number | undefined
  bottom?: number | undefined
}

export type TriggerA11yProps = {
  'aria-haspopup'?: 'dialog' | undefined
  'aria-expanded'?: boolean | undefined
  'aria-controls'?: string | undefined
  'aria-describedby'?: string | undefined
}

export type SurfaceA11yProps = {
  role?: OverlayRole | undefined
  id?: string | undefined
  accessibilityViewIsModal?: boolean | undefined
  accessibilityLabel?: string | undefined
  'aria-labelledby'?: string | undefined
  'aria-describedby'?: string | undefined
}

export type HostA11yProps = {
  'aria-labelledby'?: string | undefined
  'aria-describedby'?: string | undefined
  'aria-label'?: string | undefined
}

export type OverlayContextValue = {
  id: string
  kind: OverlayKind
  behavior: Behavior
  dismissable: boolean
  /**
   * Which instrument owns this instance's user-gesture dismissal for the
   * current presentation: `managed` (kernel listeners, today's machinery)
   * or `delegated` (the platform runs the dismissal contract and the chrome
   * self-reports its outcomes). Mechanism only — semantics are identical.
   */
  dismissChannel: DismissChannel
  role: OverlayRole
  panelId: string
  titleId: string
  descriptionId: string
  exitMs: number
  layout?: OverlayLayout | undefined
  insets?: OverlayInsets | undefined
  state: {
    phase: Phase
    isMounted: boolean
    isOpen: boolean
    isPresented: boolean
  }
  signals: {
    onHostShown: () => void
    onLayoutReady: () => void
    onExitComplete: () => void
    /** A platform host is observably gone; its host machine rejects stale events. */
    onHostDismissed: () => void
  }
  actions: {
    setOpen: (next: boolean) => void
    toggle: () => void
    requestClose: () => void
    requestDismiss: (event: DismissEvent) => boolean
  }
  refs: {
    anchor: RefCallback<unknown>
    surface: RefCallback<unknown>
    panel: RefObject<unknown>
    trigger: RefObject<unknown>
    bounds: { current: Bounds | null }
  }
  anchored?: AnchoredPosition | undefined
  a11y: {
    trigger: TriggerA11yProps
    surface: SurfaceA11yProps
    host: HostA11yProps
  }
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

export const OverlayProvider = OverlayContext.Provider

export function useOverlayContext(): OverlayContextValue {
  const value = useContext(OverlayContext)
  if (!value) throw new Error('Overlay subcomponent used outside its root')
  return value
}

export function useOptionalOverlayContext(): OverlayContextValue | null {
  return useContext(OverlayContext)
}

export function useAnchoredOverlayContext(): OverlayContextValue & {
  anchored: AnchoredPosition
} {
  const value = useOverlayContext()
  if (!value.anchored) {
    throw new Error(
      `Overlay kind '${value.kind}' does not have anchored positioning`,
    )
  }
  return value as OverlayContextValue & { anchored: AnchoredPosition }
}
