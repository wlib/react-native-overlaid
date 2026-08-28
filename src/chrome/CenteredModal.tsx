// NATIVE centered modal frame. The panel and scrim share one reveal.
import type { ReactNode } from 'react'
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native'
import { useOverlayContext, type SlotOverride } from '../react/overlayContext'
import { ModalContainer } from './ModalContainer'
import { Scrim } from './Scrim'
import { useRevealStyle } from './useRevealStyle'

export type CenteredModalProps = {
  children: ReactNode
  dismissable?: boolean
  backdrop?: SlotOverride | false
}

export function CenteredModal({
  children,
  dismissable = true,
  backdrop,
}: CenteredModalProps) {
  const context = useOverlayContext()
  const { layout } = context
  const reveal = useRevealStyle(
    { kind: 'fade' },
    context.state.phase,
    context.exitMs,
  )
  const panelSize: ViewStyle = {
    width: layout?.width ?? '100%',
    maxWidth: layout?.maxWidth ?? 480,
    minWidth: layout?.minWidth,
    maxHeight: layout?.maxHeight ?? '90%',
    minHeight: layout?.minHeight,
  }

  return (
    <ModalContainer {...(backdrop === undefined ? {} : { backdrop })}>
      <Animated.View style={[StyleSheet.absoluteFill, reveal]}>
        <View
          pointerEvents="box-none"
          style={[
            styles.center,
            {
              paddingHorizontal: layout?.horizontalPadding ?? 16,
              paddingTop: context.insets?.top ?? 0,
              paddingBottom: context.insets?.bottom ?? 0,
            },
          ]}
        >
          <View pointerEvents="auto" style={[styles.panelBounds, panelSize]}>
            {children}
          </View>
        </View>
        {backdrop !== false ? (
          <Scrim
            style={backdrop?.style as ViewStyle}
            dismissable={dismissable}
          />
        ) : null}
      </Animated.View>
    </ModalContainer>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  panelBounds: {
    alignSelf: 'center',
    flexShrink: 1,
    minHeight: 0,
  },
})
