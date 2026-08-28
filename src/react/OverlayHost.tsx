'use client'

import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { LayerHostProvider } from './LayerHostContext'
import { PortalHost, PortalScope } from './portal'

export const ROOT_HOST_NAME = 'app'

export type OverlayHostProps = {
  children?: ReactNode
  /** Web-only (selects the web presentation layer); ignored on native. */
  styling?: 'default' | 'none' | undefined
}

export function OverlayHost({ children }: OverlayHostProps) {
  return (
    <LayerHostProvider name={ROOT_HOST_NAME}>
      <PortalScope>
        <View style={styles.root}>
          {children}
          <PortalHost name={ROOT_HOST_NAME} style={styles.portalHost} />
        </View>
      </PortalScope>
    </LayerHostProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  portalHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
})
