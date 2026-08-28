'use client'

import type { ReactNode } from 'react'
import { LayerHostProvider } from './LayerHostContext'
import { OverlayStylingProvider } from './overlayStyling'

export const ROOT_HOST_NAME = 'app'
export const OVERLAY_ROOT_ID = 'rno-overlay-root'

export type OverlayHostProps = {
  children?: ReactNode
  /**
   * Web-only presentation-layer choice: 'none' stands the stylesheet's
   * defaults and motion layers down app-wide (the reset layer always
   * applies), for consumers whose design system owns every overlay's
   * visuals AND motion — including functional pieces like the sheet's
   * detent geometry and the popover's positioning transform (see
   * docs/STYLING.md). Per-instance `unstyled` remains independent.
   */
  styling?: 'default' | 'none' | undefined
}

export function OverlayHost({
  children,
  styling = 'default',
}: OverlayHostProps) {
  return (
    <LayerHostProvider name={ROOT_HOST_NAME}>
      <OverlayStylingProvider value={styling}>
        {children}
        <div id={OVERLAY_ROOT_ID} />
      </OverlayStylingProvider>
    </LayerHostProvider>
  )
}
