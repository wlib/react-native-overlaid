import { useState } from 'react'
import { Text, View } from 'react-native'
import { Dialog, Drawer, Popover, Sheet, Tooltip } from '../../src'
import { Button, Paragraph } from './helpers'
import { useGalleryInsets } from './insets'

export function PopoverInDialog() {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Button title="Open dialog" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Dialog with a popover"
        description="Open the popover, then: escape closes the popover first; a click inside the dialog closes the popover but not the dialog."
      >
        <View style={{ marginTop: 24, alignItems: 'flex-start', gap: 12 }}>
          <Popover>
            <Popover.Trigger>
              <Text>Toggle nested popover</Text>
            </Popover.Trigger>
            <Popover.Content>
              <Text>Nested popover panel</Text>
            </Popover.Content>
          </Popover>
          <Text>Dialog body area</Text>
        </View>
      </Dialog>
    </View>
  )
}

export function DialogFromDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open drawer" onPress={() => setDrawerOpen(true)} />
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} insets={insets}>
        <View style={{ gap: 16, paddingTop: 48 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Drawer layer</Text>
          <Paragraph>
            Open the dialog on top; escape closes the dialog first, then the
            drawer.
          </Paragraph>
          <Button
            title="Open confirmation dialog"
            onPress={() => setDialogOpen(true)}
          />
        </View>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Discard changes?"
          description="A modal stacked above the drawer."
          layout={{ maxWidth: 360 }}
        >
          <View
            style={{
              marginTop: 24,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <Button
              title="Keep editing"
              variant="secondary"
              onPress={() => setDialogOpen(false)}
            />
            <Button
              title="Discard"
              onPress={() => {
                setDialogOpen(false)
                setDrawerOpen(false)
              }}
            />
          </View>
        </Dialog>
      </Drawer>
    </View>
  )
}

export function TooltipInSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open sheet" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} insets={insets}>
        <View style={{ padding: 24, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              Deposit terms
            </Text>
            <Tooltip text="Anchored inside the sheet: on native this portals into the sheet's own host instead of underneath it.">
              <Text>ⓘ</Text>
            </Tooltip>
          </View>
          <Paragraph>
            Trigger the tooltip — it must appear above the sheet surface,
            anchored to the icon.
          </Paragraph>
        </View>
      </Sheet>
    </View>
  )
}

export function KitchenSink() {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Button title="Open kitchen sink" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Three layers deep"
        description="Dialog hosting a popover whose content hosts a tooltip. Escape unwinds one layer at a time."
      >
        <View style={{ marginTop: 24, alignItems: 'flex-start' }}>
          <Popover>
            <Popover.Trigger>
              <Text>Open popover</Text>
            </Popover.Trigger>
            <Popover.Content>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text>Hover for layer three</Text>
                <Tooltip text="Tooltip anchored inside a popover inside a dialog.">
                  <Text>ⓘ</Text>
                </Tooltip>
              </View>
            </Popover.Content>
          </Popover>
        </View>
      </Dialog>
    </View>
  )
}
