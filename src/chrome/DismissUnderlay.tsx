// Native anchored-overlay underlay. Reports a page-space outside press and
// re-fires a different trigger under that press after dismissal.
import type { RefObject } from 'react'
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native'
import { findTriggerAt } from '../core/triggerRegistry'
import { useLayerHost } from '../react/LayerHostContext'
import { measureNodeInWindow } from '../react/measurement'

export function DismissUnderlay({ style }: { style?: StyleProp<ViewStyle> }) {
  const host = useLayerHost()

  return (
    <Pressable
      accessible={false}
      importantForAccessibility="no"
      style={style ?? StyleSheet.absoluteFill}
      onPress={(event: GestureResponderEvent) => {
        const point = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        }
        const ownerAtPress = host.getTopEntry()?.id
        const match = findTriggerAt(host.name, point, (ref) =>
          measureNodeInWindow(ref as RefObject<View | null>),
        )

        // The hit-test must resolve BEFORE dismissal: a press landing on a
        // hint trigger only shows the tooltip — hints never displace a
        // deliberately opened auto, and that includes this outside-press
        // channel. Measurement is a UI-thread round trip (~a frame); the
        // deadline bounds the added dismissal latency and treats a hung
        // measurement as a plain outside press.
        const deadline = new Promise<undefined>((resolve) =>
          setTimeout(() => resolve(undefined), 100),
        )
        void Promise.race([match.catch(() => undefined), deadline]).then(
          (trigger) => {
            const refire = trigger && trigger.ownerEntryId !== ownerAtPress
            if (refire && trigger.behavior === 'hint') {
              trigger.onPress()
              return
            }
            const handled = host.dispatchOutsidePress(point, null)
            if (handled && refire) trigger.onPress()
          },
        )
      }}
    />
  )
}
