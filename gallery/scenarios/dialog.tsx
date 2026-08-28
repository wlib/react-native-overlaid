import { useState } from 'react'
import { View } from 'react-native'
import { Dialog } from '../../src'
import { Button, Filler, Paragraph } from './helpers'
import { useGalleryInsets } from './insets'

export function BasicDialog() {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Button title="Open dialog" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Basic dialog"
        description="Presented via the platform <dialog> in the browser's top layer; escape and backdrop-click dismiss through the layer host."
      >
        <View style={{ marginTop: 16 }}>
          <Paragraph>Body content goes here.</Paragraph>
        </View>
      </Dialog>
    </View>
  )
}

export function NonDismissableDialog() {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Button title="Open blocking dialog" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        dismissable={false}
        title="Confirm irreversible action"
        description="dismissable={false} refuses escape, backdrop and outside press; only the explicit button (programmatic) closes."
      >
        <View style={{ marginTop: 16 }}>
          <Button title="Done" onPress={() => setOpen(false)} />
        </View>
      </Dialog>
    </View>
  )
}

export function ScrollableDialog() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open long dialog" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Terms and conditions"
        layout={{ maxHeight: 420, maxWidth: 560 }}
        insets={insets}
      >
        <View style={{ marginTop: 12 }}>
          <Filler lines={40} />
        </View>
      </Dialog>
    </View>
  )
}

export function StyledDialog() {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Button title="Open styled dialog" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Custom surface & backdrop"
        surface={{ style: { backgroundColor: '#fffbeb', borderRadius: 0 } }}
        backdrop={{
          style: { backgroundColor: 'rgb(30 41 59)', opacity: 0.65 },
        }}
        layout={{ maxWidth: 720 }}
      >
        <View style={{ marginTop: 16 }}>
          <Paragraph>
            The surface slot restyles the panel; the backdrop slot feeds the
            ::backdrop CSS custom properties on web and the scrim on native.
          </Paragraph>
        </View>
      </Dialog>
    </View>
  )
}

export function CompoundDialog() {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Button title="Open compound dialog" onPress={() => setOpen(true)} />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Title>Compound API</Dialog.Title>
          <Dialog.Description>
            Root/Content/Title/Description/Close — full control over the tree,
            same kernel underneath.
          </Dialog.Description>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
            <Button title="Confirm" onPress={() => setOpen(false)} />
          </View>
          <Dialog.Close />
        </Dialog.Content>
      </Dialog.Root>
    </View>
  )
}
