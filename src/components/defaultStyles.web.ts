import type { TextStyle, ViewStyle } from 'react-native'

export const dialogSurface = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 32,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
} as ViewStyle

export const drawerSurface = {
  backgroundColor: '#ffffff',
  padding: 16,
  boxShadow: '0 0 24px rgba(0, 0, 0, 0.15)',
} as ViewStyle

export const popoverSurface = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
} as ViewStyle

export const tooltipSurface = {
  maxWidth: 256,
  backgroundColor: '#111827',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
} as ViewStyle

export const tooltipText: TextStyle = {
  fontSize: 12,
  lineHeight: 18,
  color: '#f9fafb',
}

export const dialogTitle: TextStyle = {
  fontSize: 18,
  fontWeight: '600',
  color: '#111827',
}

export const dialogDescription: TextStyle = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 20,
  color: '#4b5563',
}
