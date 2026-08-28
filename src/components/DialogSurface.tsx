import { forwardRef, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useDismissAccessibility } from '../chrome/dismissAccessibility'
import {
  useOverlayContext,
  type CrossPlatformStyle,
  type SurfaceA11yProps,
} from '../react/overlayContext'

export type DialogSurfaceProps = {
  children: ReactNode
  className?: string | undefined
  style?: CrossPlatformStyle | undefined
  /** Web-only styling marker, retained on the platform pair. */
  unstyled?: boolean | undefined
  a11y: SurfaceA11yProps
}

export const DialogSurface = forwardRef<unknown, DialogSurfaceProps>(
  function DialogSurface({ children, style, a11y }, ref) {
    const { actions, dismissable } = useOverlayContext()
    const dismissAccessibility = useDismissAccessibility(
      actions,
      undefined,
      dismissable,
    )
    return (
      <View
        ref={ref as never}
        style={style as StyleProp<ViewStyle>}
        {...a11y}
        {...dismissAccessibility}
      >
        {children}
      </View>
    )
  },
)
