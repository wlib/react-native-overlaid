import { forwardRef, type CSSProperties } from 'react'
import { useExitTransition } from '../chrome/useExitTransition'
import { flattenToCss } from '../react/flattenStyle'
import { useOverlayContext } from '../react/overlayContext'
import { stylingAttributes, useOverlayStyling } from '../react/overlayStyling'
import type { DialogSurfaceProps } from './DialogSurface'

export type { DialogSurfaceProps }

export const DialogSurface = forwardRef<HTMLDivElement, DialogSurfaceProps>(
  function DialogSurface({ children, className, style, unstyled, a11y }, ref) {
    const { state } = useOverlayContext()
    const styling = useOverlayStyling()
    const {
      accessibilityViewIsModal: _nativeModal,
      accessibilityLabel: _nativeLabel,
      ...webA11y
    } = a11y

    useExitTransition()

    return (
      <div
        ref={ref}
        className={className}
        data-overlaid-kind="dialog"
        data-overlaid-part="surface"
        data-overlaid-state={state.isPresented ? 'open' : 'closed'}
        data-overlaid-phase={state.phase}
        data-overlaid-reveal=""
        {...(unstyled ? { 'data-overlaid-unstyled': '' } : {})}
        {...stylingAttributes(styling)}
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
