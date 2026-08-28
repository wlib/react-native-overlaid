import { Platform, type TextStyle, type ViewStyle } from 'react-native'

function elevationShadow(
  web: string,
  native: Pick<
    ViewStyle,
    | 'shadowColor'
    | 'shadowOpacity'
    | 'shadowRadius'
    | 'shadowOffset'
    | 'elevation'
  >,
): ViewStyle {
  return Platform.OS === 'web' ? { boxShadow: web } : native
}

/** Conservative defaults; every surface remains slot-overridable. */
export const dialogSurface: ViewStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 32,
  ...elevationShadow('0 8px 24px rgba(0, 0, 0, 0.15)', {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  }),
}

export const drawerSurface: ViewStyle = {
  backgroundColor: '#ffffff',
  padding: 16,
  ...elevationShadow('0 0 24px rgba(0, 0, 0, 0.15)', {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  }),
}

export const popoverSurface: ViewStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 16,
  ...elevationShadow('0 4px 16px rgba(0, 0, 0, 0.18)', {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  }),
}

export const tooltipSurface: ViewStyle = {
  maxWidth: 256,
  backgroundColor: '#111827',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  ...elevationShadow('0 4px 12px rgba(0, 0, 0, 0.2)', {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  }),
}

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
