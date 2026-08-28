import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  Dialog,
  Drawer,
  OverlayHost,
  Popover,
  Sheet,
  Tooltip,
} from 'react-native-overlaid'

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  )
}

export function App() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <OverlayHost>
      <View style={{ flex: 1, gap: 20, padding: 24 }}>
        <Button label="Open dialog" onPress={() => setDialogOpen(true)} />
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Delete draft?"
          description="This action cannot be undone."
        >
          <Button label="Delete" onPress={() => setDialogOpen(false)} />
        </Dialog>

        <Button label="Open drawer" onPress={() => setDrawerOpen(true)} />
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} side="right">
          <Text>Account settings</Text>
        </Drawer>

        <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          detents={['content', '66%', 'full']}
          initialDetent={0}
          showCloseButton
          accessibilityLabel="Delivery options"
        >
          <Sheet.ScrollView>
            <Text>Standard delivery</Text>
            <Text>Express delivery</Text>
          </Sheet.ScrollView>
        </Sheet>

        <Popover>
          <Popover.Trigger>
            <Text>Filters</Text>
          </Popover.Trigger>
          <Popover.Content>
            {({ close }) => (
              <View>
                <Text>Filter controls</Text>
                <Button label="Apply" onPress={close} />
              </View>
            )}
          </Popover.Content>
        </Popover>

        <Tooltip text="Archived items remain searchable.">
          <Text>What does archive do?</Text>
        </Tooltip>
      </View>
    </OverlayHost>
  )
}
