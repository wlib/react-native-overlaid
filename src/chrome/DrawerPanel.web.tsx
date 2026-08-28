'use client'

// WEB DrawerPanel. The modal dialog owns focus/backdrop; this surface owns
// a scroll area that does not move absolute controls. The edge slide itself
// lives in the layered stylesheet, keyed on data-overlaid-state/-side.
import type { CSSProperties, RefCallback } from 'react'
import { flattenToCss } from '../react/flattenStyle'
import { useOverlayContext } from '../react/overlayContext'
import type { DrawerPanelProps } from './DrawerPanel'
import { useExitTransition } from './useExitTransition'

export type { DrawerPanelProps }

export function DrawerPanel({
  side = 'right',
  maxWidth = 420,
  width = '90%',
  accessibilityLabel,
  className,
  style,
  unstyled,
  children,
}: DrawerPanelProps) {
  const context = useOverlayContext()
  const {
    accessibilityViewIsModal: _nativeModal,
    accessibilityLabel: _nativeLabel,
    ...surfaceA11y
  } = context.a11y.surface

  useExitTransition()

  return (
    <div
      ref={context.refs.surface as RefCallback<HTMLDivElement>}
      data-overlaid-drawer=""
      data-overlaid-kind="drawer"
      data-overlaid-part="surface"
      data-overlaid-state={context.state.isPresented ? 'open' : 'closed'}
      data-overlaid-phase={context.state.phase}
      data-overlaid-side={side}
      data-overlaid-reveal=""
      {...(unstyled ? { 'data-overlaid-unstyled': '' } : {})}
      {...surfaceA11y}
      aria-label={accessibilityLabel}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        [side]: 0,
        // Border-box, or surface padding inflates the panel past the
        // requested width/maxWidth (RN styles are always border-box).
        boxSizing: 'border-box',
        width: width as CSSProperties['width'],
        maxWidth: maxWidth as CSSProperties['maxWidth'],
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...flattenToCss(style),
      }}
    >
      <div
        style={{
          position: 'static',
          boxSizing: 'border-box',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: `max(${context.insets?.top ?? 0}px, env(safe-area-inset-top, 0px))`,
          paddingBottom: `max(${context.insets?.bottom ?? 0}px, env(safe-area-inset-bottom, 0px))`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
