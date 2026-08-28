'use client'

// WEB centered frame. The <dialog> owns modality/backdrop/focus; this box
// only translates the cross-platform size contract into viewport bounds.
import type { CSSProperties } from 'react'
import { useOverlayContext } from '../react/overlayContext'
import { ModalContainer } from './ModalContainer'
import type { CenteredModalProps } from './CenteredModal'

export type { CenteredModalProps }

function percentToViewport(
  value: number | string | undefined,
): CSSProperties['maxHeight'] {
  if (typeof value === 'string' && /^\d+(\.\d+)?%$/.test(value)) {
    return `${value.slice(0, -1)}dvh`
  }
  return value as CSSProperties['maxHeight']
}

export function CenteredModal({ children, backdrop }: CenteredModalProps) {
  const { layout } = useOverlayContext()

  return (
    <ModalContainer
      {...(backdrop === undefined ? {} : { backdrop })}
      {...(layout?.horizontalPadding === undefined
        ? {}
        : { horizontalPadding: layout.horizontalPadding })}
    >
      <div
        data-overlaid-centered-panel=""
        style={{
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          width: (layout?.width as CSSProperties['width']) ?? '100%',
          maxWidth: (layout?.maxWidth as CSSProperties['maxWidth']) ?? 480,
          minWidth: (layout?.minWidth as CSSProperties['minWidth']) ?? 0,
          maxHeight: percentToViewport(layout?.maxHeight) ?? '90dvh',
          minHeight: (layout?.minHeight as CSSProperties['minHeight']) ?? 0,
          overflow: 'visible',
        }}
      >
        {children}
      </div>
    </ModalContainer>
  )
}
