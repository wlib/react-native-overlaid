import { useRef } from 'react'
import { Text, View } from 'react-native'
import { Popover, Tooltip } from '../../src'
import { Paragraph } from './helpers'

export function HoverFocusTooltip() {
  return (
    <Tooltip text="Shown on mouse hover and keyboard focus; hidden on leave/blur.">
      <Text>Hover or focus me</Text>
    </Tooltip>
  )
}

export function EscapeDismissesTooltip() {
  return (
    <Tooltip text="Escape must dismiss hover content without moving the pointer.">
      <Text>Hover, then press Escape</Text>
    </Tooltip>
  )
}

export function HintDoesNotDisplaceAuto() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32 }}>
      <Popover>
        <Popover.Trigger>
          <Text>1. Open this popover</Text>
        </Popover.Trigger>
        <Popover.Content>
          <Text>Popover stays open</Text>
        </Popover.Content>
      </Popover>
      <Tooltip text="Hovering me must not close the popover.">
        <Text>2. Then hover me</Text>
      </Tooltip>
    </View>
  )
}

export function BoundedTooltip() {
  const boundaryRef = useRef<View | null>(null)
  return (
    <View
      ref={boundaryRef}
      style={{
        width: 360,
        padding: 24,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
      }}
    >
      <Paragraph>
        The tooltip flips/shifts to stay inside this bordered boundary.
      </Paragraph>
      <View style={{ alignItems: 'flex-start', marginTop: 12 }}>
        <Tooltip
          text="I flip to stay inside the boundary box instead of the window."
          placement="top"
          boundaryRef={boundaryRef}
        >
          <Text>Hover near the edge</Text>
        </Tooltip>
      </View>
    </View>
  )
}

export function TooltipTimingPair() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32 }}>
      <Tooltip text="First tooltip: opens after the hover-intent delay.">
        <Text>Hover me first</Text>
      </Tooltip>
      <Tooltip text="Second tooltip: opens instantly while the host is warm.">
        <Text>Then hover me</Text>
      </Tooltip>
    </View>
  )
}

export function RenderPropTooltip() {
  return (
    <Tooltip text="The render-prop form passes trigger props to your own element.">
      {(triggerProps) => (
        <Text {...(triggerProps as object)}>Custom trigger element</Text>
      )}
    </Tooltip>
  )
}
