import { createContext, useContext } from 'react'
import { Text, View } from 'react-native'
import { Popover, Tooltip, useContextBridge } from 'react-native-overlaid'

const ThemeContext = createContext({ foreground: '#111827' })

function ThemeAwarePanel() {
  const theme = useContext(ThemeContext)
  return <Text style={{ color: theme.foreground }}>Uses the source theme</Text>
}

/**
 * Native Popover and Tooltip panels render at the nearest PortalHost and read
 * context there. Capture only the source-position contexts the panel needs.
 * Web preserves source context and safely ignores contextBridge.
 */
export function BridgedAnchoredOverlays() {
  const Bridge = useContextBridge(ThemeContext)

  return (
    <View style={{ gap: 16 }}>
      <Popover contextBridge={Bridge}>
        <Popover.Trigger>
          <Text>Open themed panel</Text>
        </Popover.Trigger>
        <Popover.Content>
          <ThemeAwarePanel />
        </Popover.Content>
      </Popover>

      <Tooltip
        content={<ThemeAwarePanel />}
        accessibilityLabel="Uses the source theme"
        contextBridge={Bridge}
      >
        <Text>Theme details</Text>
      </Tooltip>
    </View>
  )
}
