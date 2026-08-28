import { useState } from 'react'
import { Text, View } from 'react-native'
import { Sheet } from '../../src'
import { Button, Filler, Paragraph } from './helpers'
import { useGalleryInsets } from './insets'

export function ContentSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open content sheet" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} showCloseButton insets={insets}>
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            Content-sized sheet
          </Text>
          <Paragraph>
            The default 'content' detent hugs short content: a real OS sheet
            ('auto' detent) on native, a measured panel on web. The ✕ is the
            opt-in showCloseButton (sheets default to none — the grabber and
            swipe are the primary affordance).
          </Paragraph>
        </View>
      </Sheet>
    </View>
  )
}

export function DetentedSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open detented sheet" onPress={() => setOpen(true)} />
      <Sheet
        insets={insets}
        open={open}
        onOpenChange={setOpen}
        detents={['33%', '66%', 'full']}
        initialDetent={1}
      >
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Three detents</Text>
          <Paragraph>
            Drag the handle: fast flicks move one detent (matching OS sheet
            physics), slow drags land on the nearest. Dismissal must clear the
            lowest detent.
          </Paragraph>
          <Sheet.ScrollView>
            <Filler lines={40} />
          </Sheet.ScrollView>
        </View>
      </Sheet>
    </View>
  )
}

export function ScrollingSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open scrolling sheet" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} detents={[0.5]} insets={insets}>
        <View style={{ paddingHorizontal: 24 }}>
          <Sheet.ScrollView>
            <Filler lines={60} />
          </Sheet.ScrollView>
        </View>
      </Sheet>
    </View>
  )
}

export function NonDismissableSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open blocking sheet" onPress={() => setOpen(true)} />
      <Sheet
        open={open}
        onOpenChange={setOpen}
        dismissable={false}
        insets={insets}
      >
        <View style={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            Finish this first
          </Text>
          <Paragraph>
            dismissable=false: swipe-down, escape and backdrop are refused; only
            the button below closes.
          </Paragraph>
          <Button title="Complete" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </View>
  )
}

export function NoScrimSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open scrimless sheet" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} scrim={false} insets={insets}>
        <View style={{ padding: 24 }}>
          <Paragraph>
            scrim=false: no dimming — native maps this to the OS sheet's
            dimmed=false, web to a transparent ::backdrop.
          </Paragraph>
        </View>
      </Sheet>
    </View>
  )
}

export function StyledSheet() {
  const [open, setOpen] = useState(false)
  const insets = useGalleryInsets()
  return (
    <View>
      <Button title="Open styled sheet" onPress={() => setOpen(true)} />
      <Sheet
        insets={insets}
        open={open}
        onOpenChange={setOpen}
        layout={{ maxWidth: 480 }}
        scrim={{ opacity: 0.6 }}
        surface={{
          style: { backgroundColor: '#fffbeb', borderTopLeftRadius: 24 },
        }}
      >
        <View style={{ padding: 24 }}>
          <Paragraph>
            layout.maxWidth narrows the web sheet; the surface slot restyles it.
            Native sheet chrome stays with the OS.
          </Paragraph>
        </View>
      </Sheet>
    </View>
  )
}
