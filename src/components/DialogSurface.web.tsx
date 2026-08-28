import { forwardRef, type CSSProperties } from 'react'
import { flattenToCss } from '../react/flattenStyle'
import type { DialogSurfaceProps } from './DialogSurface'

export type { DialogSurfaceProps }

export const DialogSurface = forwardRef<HTMLDivElement, DialogSurfaceProps>(
  function DialogSurface({ children, className, style, a11y }, ref) {
    const {
      accessibilityViewIsModal: _nativeModal,
      accessibilityLabel: _nativeLabel,
      ...webA11y
    } = a11y
    return (
      <div
        ref={ref}
        className={className}
        style={{
          // RN View layout parity: on native the surface is a View (a flex
          // column), so RNW's inline Texts must stack here too.
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'relative',
          ...(flattenToCss(style) as CSSProperties),
        }}
        {...webA11y}
      >
        {children}
      </div>
    )
  },
)
