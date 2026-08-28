// NATIVE ModalContainer.
// Interprets: mounted phase -> RN Modal OS window with a nested host/portal.
// Reports: native onShow and hardware back routed deepest-first.
import { useRef, type ReactNode } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import type { LayerHost } from '../core/types'
import { LayerHostProvider } from '../react/LayerHostContext'
import { useOverlayContext, type SlotOverride } from '../react/overlayContext'
import { PortalHost } from '../react/portal'

export type ModalContainerProps = {
  children: ReactNode
  backdrop?: SlotOverride | false
  /** Web-only layout input, retained on the platform pair. */
  horizontalPadding?: number
}

export function ModalContainer({ children, backdrop }: ModalContainerProps) {
  const { state, signals, actions, panelId } = useOverlayContext()
  const localHostName = `overlaid-modal-${panelId}`
  const hostRef = useRef<LayerHost | null>(null)

  return (
    <Modal
      visible={state.isMounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={signals.onHostShown}
      onRequestClose={() => {
        const host = hostRef.current
        if (host) host.dispatchBackButton()
        else actions.requestDismiss('back-button')
      }}
    >
      <LayerHostProvider name={localHostName} hostRef={hostRef}>
        <View
          pointerEvents={backdrop === false ? 'box-none' : 'auto'}
          style={styles.fill}
        >
          {children}
          <PortalHost name={localHostName} style={styles.portal} />
        </View>
      </LayerHostProvider>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
})
