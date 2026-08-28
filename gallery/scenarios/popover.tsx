import { ScrollView, Text, View } from 'react-native'
import { Popover } from '../../src'
import { Button, Filler, Paragraph } from './helpers'

export function BasicPopover() {
  return (
    <Popover>
      <Popover.Trigger>
        <Text>Toggle popover</Text>
      </Popover.Trigger>
      <Popover.Content>
        {({ close }) => (
          <View style={{ gap: 12, maxWidth: 260 }}>
            <Paragraph>
              Anchored via the HTML Popover API (top layer) on web; a portal
              into the nearest layer host on native.
            </Paragraph>
            <Button title="Close" variant="secondary" onPress={close} />
          </View>
        )}
      </Popover.Content>
    </Popover>
  )
}

export function DisplacingPopovers() {
  return (
    <View style={{ flexDirection: 'row', gap: 32 }}>
      {(['Left', 'Right'] as const).map((label) => (
        <Popover key={label}>
          <Popover.Trigger>
            <Text>{label} trigger</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>{label} panel</Text>
          </Popover.Content>
        </Popover>
      ))}
    </View>
  )
}

export function OutsidePressPopover() {
  return (
    <View style={{ gap: 24 }}>
      <Popover>
        <Popover.Trigger>
          <Text>Open popover</Text>
        </Popover.Trigger>
        <Popover.Content>
          <Text>Popover panel</Text>
        </Popover.Content>
      </Popover>
      <Text>Neutral area</Text>
    </View>
  )
}

export function PopoverPlacements() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {(['top', 'bottom', 'left', 'right'] as const).map((placement) => (
        <Popover key={placement} placement={placement} offset={8}>
          <Popover.Trigger>
            <Text>{placement}</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>{`Placed ${placement}`}</Text>
          </Popover.Content>
        </Popover>
      ))}
    </View>
  )
}

export function NonDismissablePopover() {
  return (
    <Popover dismissable={false}>
      <Popover.Trigger>
        <Text>Open sticky popover</Text>
      </Popover.Trigger>
      <Popover.Content>
        {({ close }) => (
          <View style={{ gap: 12, maxWidth: 240 }}>
            <Paragraph>
              Refuses escape/outside-press; only this button closes it.
            </Paragraph>
            <Button title="Close me" variant="secondary" onPress={close} />
          </View>
        )}
      </Popover.Content>
    </Popover>
  )
}

export function ScrollInsidePopover() {
  return (
    <Popover>
      <Popover.Trigger>
        <Text>Open scrollable popover</Text>
      </Popover.Trigger>
      <Popover.Content>
        <View style={{ maxWidth: 260, gap: 8 }}>
          <Paragraph>
            Scrolling this list must not dismiss the popover — only scrolls that
            move the anchor (page scrolls) do.
          </Paragraph>
          <ScrollView style={{ height: 120 }} nestedScrollEnabled>
            <Filler lines={20} />
          </ScrollView>
        </View>
      </Popover.Content>
    </Popover>
  )
}

export function ForcedDisplacementPopovers() {
  return (
    <View style={{ gap: 16 }}>
      <Paragraph>
        Displacement (opening a new popover) force-closes other transients,
        bypassing dismissable=false — only an onDismissRequest veto outranks it.
      </Paragraph>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
        <Popover dismissable={false}>
          <Popover.Trigger>
            <Text>Open sticky popover (force-displaced)</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Sticky panel: displacement still force-closes me</Text>
          </Popover.Content>
        </Popover>
        <Popover onDismissRequest={() => false}>
          <Popover.Trigger>
            <Text>Toggle veto popover</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Veto panel: onDismissRequest keeps me open</Text>
          </Popover.Content>
        </Popover>
        <Popover>
          <Popover.Trigger>
            <Text>Toggle displacing popover</Text>
          </Popover.Trigger>
          <Popover.Content>
            <Text>Displacing panel</Text>
          </Popover.Content>
        </Popover>
      </View>
    </View>
  )
}

export function CssAnchorPlacements() {
  return (
    <View style={{ gap: 16 }}>
      <Paragraph>
        closeOnScroll=false with no boundary: on supporting browsers these
        panels are positioned by CSS Anchor Positioning (position-area) so
        scrolling tracks the anchor frame-synced; elsewhere Floating UI runs
        unchanged.
      </Paragraph>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {(['top', 'bottom', 'left', 'right'] as const).map((placement) => (
          <Popover
            key={placement}
            placement={placement}
            offset={8}
            closeOnScroll={false}
          >
            <Popover.Trigger>
              <Text>{placement}</Text>
            </Popover.Trigger>
            <Popover.Content>
              <Text>{`Anchored ${placement}`}</Text>
            </Popover.Content>
          </Popover>
        ))}
      </View>
    </View>
  )
}

export function CloseOnScrollPopover() {
  return (
    <View style={{ height: 800, paddingTop: 40 }}>
      <Popover>
        <Popover.Trigger>
          <Text>Open, then scroll the page</Text>
        </Popover.Trigger>
        <Popover.Content>
          <Text>I close when the page scrolls</Text>
        </Popover.Content>
      </Popover>
      <Filler lines={60} />
    </View>
  )
}
