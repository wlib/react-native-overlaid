import type { ReactNode } from 'react'
import {
  Pressable,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useAutoPress } from '../autoPress'

const base: ViewStyle = {
  alignSelf: 'flex-start',
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 10,
}

const variants: Record<'primary' | 'secondary', ViewStyle> = {
  primary: { backgroundColor: '#111827' },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
}

const labelStyles: Record<'primary' | 'secondary', TextStyle> = {
  primary: { color: '#ffffff', fontWeight: '600' },
  secondary: { color: '#111827', fontWeight: '600' },
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
}: {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'secondary'
  style?: StyleProp<ViewStyle>
}) {
  useAutoPress(title, onPress)
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[base, variants[variant], style]}
    >
      <Text style={labelStyles[variant]}>{title}</Text>
    </Pressable>
  )
}

export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 14, lineHeight: 20, color: '#374151' }}>
      {children}
    </Text>
  )
}

export function Filler({ lines = 30 }: { lines?: number }) {
  return (
    <>
      {Array.from({ length: lines }, (_, i) => (
        <Text key={i} style={{ paddingVertical: 6, color: '#4b5563' }}>
          Row {i + 1} — scrollable filler content
        </Text>
      ))}
    </>
  )
}
