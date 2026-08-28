// NATIVE AnchoredContainer.
// Interprets: mounted state -> nearest native portal; page-space placement
// minus portal-host origin -> absolute coordinates; phase -> fade.
// Reports: panel layout and the first host-rebased position ready signal.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react'
import {
  Animated,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import type { OverlayRole } from '../core/types'
import type { ContextBridge } from '../react/contextBridge'
import { useLayerHost } from '../react/LayerHostContext'
import {
  useAnchoredOverlayContext,
  type CrossPlatformStyle,
} from '../react/overlayContext'
import { Portal, useHostOffset } from '../react/portal'
import { DismissUnderlay } from './DismissUnderlay'
import { useDismissAccessibility } from './dismissAccessibility'
import { useRevealStyle } from './useRevealStyle'

export type AnchoredContainerProps = {
  children: ReactNode
  className?: string
  style?: CrossPlatformStyle
  role?: OverlayRole
  accessibilityLabel?: string
  contextBridge?: ContextBridge
}

export function AnchoredContainer(props: AnchoredContainerProps) {
  const context = useAnchoredOverlayContext()
  const host = useLayerHost()

  if (!context.state.isMounted) return null

  return (
    <Portal hostName={host.name}>
      <PortaledPanel context={context} {...props} />
    </Portal>
  )
}

function PortaledPanel({
  context,
  children,
  style,
  role,
  accessibilityLabel,
  contextBridge: Bridge,
}: AnchoredContainerProps & {
  context: ReturnType<typeof useAnchoredOverlayContext>
}) {
  const reveal = useRevealStyle(
    { kind: 'fade' },
    context.state.phase,
    context.exitMs,
  )
  const hostOffset = useHostOffset()
  const window = useWindowDimensions()
  const readyReported = useRef(false)
  const panelSize = useRef<{ width: number; height: number } | null>(null)
  const dismissAccessibility = useDismissAccessibility(
    context.actions,
    accessibilityLabel,
    context.dismissable,
  )

  // A host inside a newly-presented Modal/TrueSheet can still move for a
  // frame. Re-measure twice after this portal arrives, without re-measuring
  // every child on every frame.
  useEffect(() => {
    let secondFrame: number | undefined
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(hostOffset.remeasure)
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame)
    }
  }, [hostOffset.remeasure])

  useEffect(() => {
    if (
      readyReported.current ||
      !context.anchored.isPositioned ||
      !hostOffset.ready
    ) {
      return
    }
    readyReported.current = true
    context.signals.onLayoutReady()
  }, [context.anchored.isPositioned, context.signals, hostOffset.ready])

  const position = context.anchored.panelStyle as {
    top?: number
    left?: number
    opacity?: number
  }
  const updateBounds = useCallback(() => {
    const size = panelSize.current
    if (
      !size ||
      !context.anchored.isPositioned ||
      position.left === undefined ||
      position.top === undefined
    ) {
      context.refs.bounds.current = null
      return
    }
    context.refs.bounds.current = {
      x: position.left,
      y: position.top,
      width: size.width,
      height: size.height,
    }
  }, [
    context.anchored.isPositioned,
    context.refs.bounds,
    position.left,
    position.top,
  ])
  useLayoutEffect(updateBounds, [updateBounds])
  useEffect(
    () => () => {
      context.refs.bounds.current = null
    },
    [context.refs.bounds],
  )
  const onPanelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      context.anchored.onSurfaceLayout?.(event)
      const { width, height } = event.nativeEvent.layout
      panelSize.current = { width, height }
      updateBounds()
    },
    [context.anchored, updateBounds],
  )
  const placed: ViewStyle = {
    position: 'absolute',
    left: (position.left ?? 0) - hostOffset.x,
    top: (position.top ?? 0) - hostOffset.y,
    opacity: position.opacity,
  }

  return (
    <>
      {context.behavior === 'auto' || context.behavior === 'hint' ? (
        <DismissUnderlay
          style={{
            position: 'absolute',
            left: -hostOffset.x,
            top: -hostOffset.y,
            width: window.width,
            height: window.height,
          }}
        />
      ) : null}
      <Animated.View
        ref={context.refs.surface as never}
        role={role}
        onLayout={onPanelLayout}
        style={[placed, reveal, style as StyleProp<ViewStyle>]}
        {...dismissAccessibility}
      >
        {Bridge ? <Bridge>{children}</Bridge> : children}
      </Animated.View>
    </>
  )
}
