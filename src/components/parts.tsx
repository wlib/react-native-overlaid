import type { ReactNode, RefCallback } from 'react'
import {
  Pressable,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import {
  useOverlayContext,
  type CrossPlatformStyle,
  type TriggerA11yProps,
} from '../react/overlayContext'
import { useTriggerRegistration } from '../react/useTriggerRegistration'

export type OverlayTriggerRenderProps = TriggerA11yProps & {
  ref: RefCallback<unknown>
  onPress: (event?: GestureResponderEvent) => void
  isOpen: boolean
}

export type OverlayTriggerProps = {
  children: ReactNode | ((props: OverlayTriggerRenderProps) => ReactNode)
  style?: CrossPlatformStyle | undefined
}

export function OverlayTrigger({ children, style }: OverlayTriggerProps) {
  const context = useOverlayContext()
  useTriggerRegistration(
    context.id,
    context.refs.trigger,
    context.actions.toggle,
    context.behavior,
  )

  const renderProps: OverlayTriggerRenderProps = {
    ref: context.refs.anchor,
    onPress: context.actions.toggle,
    isOpen: context.state.isOpen,
    ...context.a11y.trigger,
  }
  if (typeof children === 'function') return <>{children(renderProps)}</>

  return (
    <Pressable
      ref={context.refs.anchor as never}
      onPress={context.actions.toggle}
      accessibilityRole="button"
      style={style as StyleProp<ViewStyle>}
      {...context.a11y.trigger}
    >
      {children}
    </Pressable>
  )
}

export type OverlayCloseProps = {
  /** Custom close element; the default deliberately needs no icon package. */
  children?: ReactNode | undefined
  style?: StyleProp<ViewStyle> | undefined
  textStyle?: StyleProp<TextStyle> | undefined
  accessibilityLabel?: string | undefined
}

// A 32px square target (plus hitSlop on top): the glyph alone measures
// ~14x20 and lands under accessible minimum target sizes; the offsets keep
// the glyph itself where the old 16/16 position put it.
const closeStyle: ViewStyle = {
  position: 'absolute',
  right: 8,
  top: 8,
  zIndex: 10,
  minWidth: 32,
  minHeight: 32,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 16,
}

const glyphStyle: TextStyle = {
  fontSize: 16,
  lineHeight: 18,
  color: '#374151',
}

export function OverlayClose({
  children,
  style,
  textStyle,
  accessibilityLabel = 'Close',
}: OverlayCloseProps) {
  const context = useOverlayContext()
  return (
    <Pressable
      onPress={context.actions.requestClose}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={14}
      style={[closeStyle, style]}
    >
      {children ?? (
        <Text style={[glyphStyle, textStyle]} importantForAccessibility="no">
          ✕
        </Text>
      )}
    </Pressable>
  )
}
