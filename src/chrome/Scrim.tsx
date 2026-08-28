// Interprets: backdrop slot styling. Reports: backdrop press to the kernel.
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useOverlayContext } from '../react/overlayContext'

export const DEFAULT_SCRIM_COLOR = 'rgba(0, 0, 0, 0.3)'

export function Scrim({
  style,
  dismissable = true,
}: {
  style?: StyleProp<ViewStyle>
  dismissable?: boolean
}) {
  const { actions } = useOverlayContext()

  return (
    <Pressable
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: DEFAULT_SCRIM_COLOR },
        style,
      ]}
      accessibilityRole={dismissable ? 'button' : undefined}
      accessibilityLabel={dismissable ? 'Dismiss' : undefined}
      accessible={dismissable}
      onPress={
        dismissable ? () => actions.requestDismiss('backdrop-press') : undefined
      }
    />
  )
}
