import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Dialog } from 'react-native-overlaid'

export function AccountDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      accessibilityLabel="Account"
    >
      <Dialog.Trigger>
        <Text>Open account</Text>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Account</Dialog.Title>
        <Dialog.Description>
          Update the public name shown on your profile.
        </Dialog.Description>
        <View style={{ marginTop: 20 }}>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
            <Text>Save</Text>
          </Pressable>
        </View>
        <Dialog.Close />
      </Dialog.Content>
    </Dialog.Root>
  )
}
