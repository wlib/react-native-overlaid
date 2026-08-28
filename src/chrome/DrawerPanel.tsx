// NATIVE DrawerPanel.
// Interprets: phase -> edge slide; insets -> content padding in Modal window.
import type { ReactNode } from 'react'
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import {
  useOverlayContext,
  type CrossPlatformStyle,
} from '../react/overlayContext'
import { useDismissAccessibility } from './dismissAccessibility'
import { useRevealStyle } from './useRevealStyle'

export type DrawerPanelProps = {
  side?: 'left' | 'right'
  maxWidth?: number | string
  width?: number | string
  accessibilityLabel?: string
  className?: string
  style?: CrossPlatformStyle
  /** Web-only styling marker, retained on the platform pair. */
  unstyled?: boolean | undefined
  children: ReactNode
}

export function DrawerPanel({
  side = 'right',
  maxWidth = 420,
  width = '90%',
  accessibilityLabel,
  style,
  children,
}: DrawerPanelProps) {
  const context = useOverlayContext()
  const reveal = useRevealStyle(
    { kind: 'slide', from: side },
    context.state.phase,
    context.exitMs,
  )
  const dismissAccessibility = useDismissAccessibility(
    context.actions,
    accessibilityLabel,
    context.dismissable,
  )
  const insetTop = context.insets?.top ?? 0
  const insetBottom = context.insets?.bottom ?? 0

  // Insets are additive to consumer padding. Applying them last avoids a
  // shorthand `padding` silently erasing the safe-area correction.
  const insetPadding = (() => {
    if (insetTop === 0 && insetBottom === 0) return undefined
    const flattened = StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {}
    const number = (value: unknown) =>
      typeof value === 'number' ? value : undefined
    const base = (edge: 'Top' | 'Bottom') => {
      const edgeValue =
        edge === 'Top' ? flattened.paddingTop : flattened.paddingBottom
      return (
        number(edgeValue) ??
        number(flattened.paddingVertical) ??
        number(flattened.padding) ??
        0
      )
    }
    return {
      paddingTop: base('Top') + insetTop,
      paddingBottom: base('Bottom') + insetBottom,
    }
  })()

  return (
    <View pointerEvents="box-none" style={styles.fill}>
      <Animated.View
        ref={context.refs.surface as never}
        {...context.a11y.surface}
        {...dismissAccessibility}
        style={[
          styles.panel,
          { [side]: 0, width, maxWidth } as ViewStyle,
          reveal,
          style as StyleProp<ViewStyle>,
          insetPadding,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // No overflow:'hidden' here: on iOS it sets masksToBounds and clips the
    // surface's edge shadow away. The scroll container inside the preset
    // (and any consumer scroller) clips its own content.
    backgroundColor: '#ffffff',
  },
})
