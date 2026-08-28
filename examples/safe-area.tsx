import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import {
  Dialog,
  Drawer,
  Popover,
  Sheet,
  Tooltip,
  type OverlayInsets,
} from 'react-native-overlaid'

/**
 * Read these numbers once in the app window (for example with
 * react-native-safe-area-context's useSafeAreaInsets) and pass them into
 * overlays, whose native windows cannot inherit an outer SafeAreaView.
 */
export function SafeAreaExamples({
  insets,
  open,
  onOpenChange,
  children,
}: {
  insets: OverlayInsets
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: ReactNode
}) {
  return (
    <View>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Safe dialog"
        insets={insets}
      >
        {children}
      </Dialog>

      <Drawer open={false} onOpenChange={() => undefined} insets={insets}>
        <Text>Full-height drawer content</Text>
      </Drawer>

      <Sheet open={false} onOpenChange={() => undefined} insets={insets}>
        <Sheet.ScrollView>
          <Text>Bottom-inset sheet content</Text>
        </Sheet.ScrollView>
      </Sheet>

      <Popover insets={insets}>
        <Popover.Trigger>
          <Text>Anchored panel</Text>
        </Popover.Trigger>
        <Popover.Content>
          <Text>Stays within native safe-area bounds</Text>
        </Popover.Content>
      </Popover>

      <Tooltip text="Safe-area-aware on native" insets={insets}>
        <Text>Hint</Text>
      </Tooltip>
    </View>
  )
}
