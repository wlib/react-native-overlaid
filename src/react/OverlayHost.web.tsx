'use client'

import type { ReactNode } from 'react'
import { LayerHostProvider } from './LayerHostContext'

export const ROOT_HOST_NAME = 'app'
export const OVERLAY_ROOT_ID = 'rno-overlay-root'

export function OverlayHost({ children }: { children?: ReactNode }) {
  return (
    <LayerHostProvider name={ROOT_HOST_NAME}>
      {children}
      <div id={OVERLAY_ROOT_ID} />
    </LayerHostProvider>
  )
}
