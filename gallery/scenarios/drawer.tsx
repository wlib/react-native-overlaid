import { useState } from 'react'
import { Text, View } from 'react-native'
import { Drawer } from '../../src'
import { Button, Filler, Paragraph } from './helpers'
import { useGalleryInsets } from './insets'

export function BasicDrawer({ side }: { side: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title={`Open ${side} drawer`} onPress={() => setOpen(true)} />
      <Drawer open={open} onOpenChange={setOpen} side={side} insets={insets}>
        <View style={{ gap: 12, paddingTop: 48 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            {`${side} drawer`}
          </Text>
          <Paragraph>
            Edge-pinned panel sliding from the {side}; backdrop click and escape
            dismiss.
          </Paragraph>
        </View>
      </Drawer>
    </View>
  )
}

export function RightDrawer() {
  return <BasicDrawer side="right" />
}

export function LeftDrawer() {
  return <BasicDrawer side="left" />
}

export function NarrowDrawer() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open narrow drawer" onPress={() => setOpen(true)} />
      <Drawer
        open={open}
        onOpenChange={setOpen}
        layout={{ width: 320 }}
        insets={insets}
      >
        <View style={{ paddingTop: 48 }}>
          <Paragraph>Fixed 320px width via layout.width.</Paragraph>
          <Filler lines={40} />
        </View>
      </Drawer>
    </View>
  )
}

export function NonDismissableDrawer() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open blocking drawer" onPress={() => setOpen(true)} />
      <Drawer
        open={open}
        onOpenChange={setOpen}
        dismissable={false}
        showCloseButton={false}
        insets={insets}
      >
        <View style={{ gap: 16, paddingTop: 48 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            Unsaved changes
          </Text>
          <Paragraph>
            Refuses escape/backdrop; close it with the explicit button.
          </Paragraph>
          <Button title="Save and close" onPress={() => setOpen(false)} />
        </View>
      </Drawer>
    </View>
  )
}

export function NoBackdropDrawer() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View style={{ gap: 16 }}>
      <Button title="Toggle inspector drawer" onPress={() => setOpen(!open)} />
      <Paragraph>
        backdrop=false keeps the page interactive (inspector/utility panel
        pattern) — this text stays clickable while the drawer is open.
      </Paragraph>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        backdrop={false}
        layout={{ width: 300 }}
        insets={insets}
      >
        <View style={{ paddingTop: 48 }}>
          <Paragraph>No backdrop behind me.</Paragraph>
        </View>
      </Drawer>
    </View>
  )
}

export function StyledDrawer() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open styled drawer" onPress={() => setOpen(true)} />
      <Drawer
        open={open}
        onOpenChange={setOpen}
        surface={{ style: { backgroundColor: '#f5f5f4', padding: 24 } }}
        backdrop={{ style: { backgroundColor: 'rgba(15,23,42,0.5)' } }}
        insets={insets}
      >
        <View style={{ paddingTop: 32 }}>
          <Paragraph>Custom surface and backdrop styles.</Paragraph>
        </View>
      </Drawer>
    </View>
  )
}
