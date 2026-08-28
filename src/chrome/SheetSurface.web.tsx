'use client'

// WEB SheetSurface: a detented panel inside the modal top layer. Scrollable
// descendants win vertical gestures unless they are at their top and the
// user pulls down; release decisions remain pure core policy.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefCallback,
} from 'react'
import {
  clampDetentIndex,
  orderDetents,
  resolveDetentHeight,
  type Detent,
} from '../core/detents'
import { decideSheetRelease, releaseVelocity } from '../core/sheetGestures'
import { flattenToCss } from '../react/flattenStyle'
import { useOverlayContext } from '../react/overlayContext'
import { ModalContainer } from './ModalContainer'
import type { SheetSurfaceProps } from './SheetSurface'

export type { SheetSurfaceProps }

const TOP_GAP = 12
const DRAG_START_THRESHOLD = 8

const DEFAULT_SURFACE_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.12)',
}

export function SheetSurface({ scrim, ...panelProps }: SheetSurfaceProps) {
  const backdrop =
    scrim === false
      ? (false as const)
      : {
          className: scrim?.className,
          style: {
            backgroundColor:
              scrim?.color ?? (scrim?.opacity == null ? undefined : 'black'),
            opacity: scrim?.opacity,
          },
        }

  return (
    <ModalContainer backdrop={backdrop}>
      <DraggablePanel {...panelProps} />
    </ModalContainer>
  )
}

function viewportHeight() {
  if (typeof window === 'undefined') return 0
  return window.visualViewport?.height ?? window.innerHeight
}

function DraggablePanel({
  detents,
  initialDetent = 0,
  className,
  style,
  handle = true,
  accessibilityLabel,
  children,
}: Omit<SheetSurfaceProps, 'scrim'>) {
  const context = useOverlayContext()
  const [viewport, setViewport] = useState(viewportHeight)
  const [presentationConfig, setPresentationConfig] = useState(() => ({
    detents,
    initialDetent,
  }))
  const wasOpen = useRef(context.state.isOpen)
  const ordered = useMemo(
    () =>
      orderDetents(
        presentationConfig.detents,
        presentationConfig.initialDetent,
        viewport || 1,
      ),
    [presentationConfig, viewport],
  )
  const normalizedDetents = ordered.detents
  const [currentIndex, setCurrentIndex] = useState(ordered.initialDetentIndex)
  const [contentHeight, setContentHeight] = useState(0)
  const [hasMeasuredContent, setHasMeasuredContent] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const readyReported = useRef(false)
  const drag = useRef({
    pointerId: -1,
    startY: 0,
    startOffset: 0,
    startHeight: 0,
    lastY: 0,
    lastAt: 0,
    velocity: 0,
  })
  const pending = useRef<{
    pointerId: number
    startY: number
    scrollElement: HTMLElement | null
  } | null>(null)

  const maxHeight = context.layout?.maxHeight
  const safeTopGap = Math.max(TOP_GAP, context.insets?.top ?? 0)
  const viewportCap = Math.max(0, viewport - safeTopGap)
  const topCap =
    typeof maxHeight === 'number' && Number.isFinite(maxHeight)
      ? Math.min(viewportCap, maxHeight)
      : viewportCap
  const handleHeight = handle ? 20 : 0
  const detentHeights = useMemo(
    () =>
      normalizedDetents.map((detent: Detent) =>
        resolveDetentHeight(detent, {
          cap: topCap,
          contentHeight: contentHeight + handleHeight,
          hasMeasuredContent,
        }),
      ),
    [
      contentHeight,
      handleHeight,
      hasMeasuredContent,
      normalizedDetents,
      topCap,
    ],
  )
  const clampedIndex = clampDetentIndex(currentIndex, normalizedDetents)
  const selectedHeight = detentHeights[clampedIndex] ?? 0
  const dragHeight =
    isDragging && dragOffset < 0
      ? Math.min(topCap, selectedHeight - dragOffset)
      : selectedHeight
  const visibleHeight = Math.max(0, dragHeight)
  const translateY = context.state.isPresented
    ? Math.max(0, dragOffset)
    : visibleHeight || '100%'

  useLayoutEffect(() => {
    if (!wasOpen.current && context.state.isOpen) {
      const next = { detents, initialDetent }
      setPresentationConfig(next)
      setCurrentIndex(
        orderDetents(next.detents, next.initialDetent, viewport || 1)
          .initialDetentIndex,
      )
      setDragOffset(0)
      setIsDragging(false)
      setHasMeasuredContent(false)
      readyReported.current = false
    }
    wasOpen.current = context.state.isOpen
  }, [context.state.isOpen, detents, initialDetent, viewport])

  const measure = useCallback(() => {
    setViewport(viewportHeight())
    const content = contentRef.current
    if (!content) return
    setHasMeasuredContent(true)
    setContentHeight(content.scrollHeight)
  }, [])

  useEffect(() => {
    if (!context.state.isMounted) readyReported.current = false
  }, [context.state.isMounted])

  useEffect(() => {
    if (!context.state.isMounted || typeof window === 'undefined') return
    measure()
    const frame = requestAnimationFrame(() => {
      measure()
      if (!readyReported.current) {
        readyReported.current = true
        context.signals.onLayoutReady()
      }
    })
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (contentRef.current) observer?.observe(contentRef.current)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [context.signals, context.state.isMounted, measure])

  useEffect(() => {
    setCurrentIndex((index) => clampDetentIndex(index, normalizedDetents))
  }, [normalizedDetents])

  const snapTo = useCallback(
    (index: number) => {
      setCurrentIndex(clampDetentIndex(index, normalizedDetents))
      setDragOffset(0)
      setIsDragging(false)
    },
    [normalizedDetents],
  )

  const beginDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, startY: number) => {
      const now = performance.now()
      drag.current = {
        pointerId: event.pointerId,
        startY,
        startOffset: dragOffset,
        startHeight: selectedHeight,
        lastY: event.clientY,
        lastAt: now,
        velocity: 0,
      }
      setIsDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [dragOffset, selectedHeight],
  )

  const resolveDragOffset = useCallback(
    (raw: number, startHeight: number) => {
      if (raw >= 0) return raw
      const highest = detentHeights[detentHeights.length - 1] ?? 0
      const headroom = Math.max(0, highest - startHeight)
      return raw >= -headroom ? raw : -(headroom + (-raw - headroom) * 0.4)
    },
    [detentHeights],
  )

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!context.state.isPresented) return
      const target = event.target as HTMLElement
      if (target.closest('[data-overlaid-sheet-handle]')) {
        beginDrag(event, event.clientY)
        event.preventDefault()
        return
      }
      // Browsers decide touch-action at pointer-down. Content keeps native
      // pan-y scrolling, so touch/pen sheet drags begin from the handle;
      // mouse input can still arbitrate against nested scrollers below.
      if (event.pointerType && event.pointerType !== 'mouse') return
      pending.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        scrollElement: findArbitratingScroller(target, event.currentTarget),
      }
    },
    [beginDrag, context.state.isPresented],
  )

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) {
        const candidate = pending.current
        if (!candidate || candidate.pointerId !== event.pointerId) return
        const travel = event.clientY - candidate.startY
        if (Math.abs(travel) < DRAG_START_THRESHOLD) return
        if (
          candidate.scrollElement &&
          !(travel > 0 && candidate.scrollElement.scrollTop <= 0)
        ) {
          pending.current = null
          return
        }
        pending.current = null
        beginDrag(event, candidate.startY)
        event.preventDefault()
        return
      }

      if (drag.current.pointerId !== event.pointerId) return
      const now = performance.now()
      const elapsed = Math.max(1, now - drag.current.lastAt)
      drag.current.velocity =
        ((event.clientY - drag.current.lastY) / elapsed) * 1000
      drag.current.lastY = event.clientY
      drag.current.lastAt = now
      const raw = drag.current.startOffset + event.clientY - drag.current.startY
      setDragOffset(resolveDragOffset(raw, drag.current.startHeight))
    },
    [beginDrag, isDragging, resolveDragOffset],
  )

  const onPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pending.current?.pointerId === event.pointerId) pending.current = null
      if (!isDragging || drag.current.pointerId !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (event.type === 'pointercancel') {
        snapTo(clampedIndex)
        return
      }

      const raw = drag.current.startOffset + event.clientY - drag.current.startY
      const nextOffset = resolveDragOffset(raw, drag.current.startHeight)
      const decision = decideSheetRelease({
        velocity: releaseVelocity(
          drag.current.velocity,
          drag.current.lastAt,
          performance.now(),
        ),
        projectedHeight: drag.current.startHeight - nextOffset,
        detentHeights,
        currentIndex: clampedIndex,
      })

      if (decision.kind === 'dismiss') {
        if (!context.actions.requestDismiss('swipe-down')) snapTo(clampedIndex)
        else {
          setIsDragging(false)
          setDragOffset(0)
        }
      } else {
        snapTo(decision.index)
      }
    },
    [
      clampedIndex,
      context.actions,
      detentHeights,
      isDragging,
      resolveDragOffset,
      snapTo,
    ],
  )

  const {
    accessibilityViewIsModal: _nativeModal,
    accessibilityLabel: _nativeLabel,
    ...surfaceA11y
  } = context.a11y.surface

  return (
    <div
      ref={context.refs.surface as RefCallback<HTMLDivElement>}
      data-overlaid-sheet=""
      data-overlaid-reveal=""
      {...surfaceA11y}
      aria-label={accessibilityLabel}
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      style={{
        position: 'fixed',
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: 'auto',
        touchAction: isDragging ? 'none' : undefined,
        ...DEFAULT_SURFACE_STYLE,
        height: visibleHeight || undefined,
        width: (context.layout?.width as CSSProperties['width']) ?? '100%',
        maxWidth: context.layout?.maxWidth as CSSProperties['maxWidth'],
        minWidth: context.layout?.minWidth as CSSProperties['minWidth'],
        maxHeight:
          (context.layout?.maxHeight as CSSProperties['maxHeight']) ??
          `calc(100dvh - ${TOP_GAP}px)`,
        minHeight: context.layout?.minHeight as CSSProperties['minHeight'],
        left: '50%',
        transform:
          typeof translateY === 'number'
            ? `translateX(-50%) translateY(${translateY}px)`
            : `translateX(-50%) translateY(${translateY})`,
        transitionProperty: 'height, transform',
        transitionTimingFunction: 'ease',
        transitionDuration: isDragging ? '0ms' : `${context.exitMs}ms`,
        ...flattenToCss(style),
      }}
    >
      {handle ? (
        <div
          data-overlaid-sheet-handle=""
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: 4,
              width: 36,
              borderRadius: 9999,
              backgroundColor: '#d1d5db',
            }}
          />
        </div>
      ) : null}
      <div
        data-overlaid-sheet-scroll=""
        style={{
          minHeight: 0,
          flex: 1,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          touchAction: isDragging ? 'none' : 'pan-y',
          paddingBottom: `max(${context.insets?.bottom ?? 0}px, env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  )
}

function findArbitratingScroller(start: HTMLElement, panel: HTMLElement) {
  let element: HTMLElement | null = start
  while (element && element !== panel) {
    if (element.hasAttribute('data-overlaid-sheet-scroll')) return element
    if (element.scrollHeight > element.clientHeight) {
      const overflow = getComputedStyle(element).overflowY
      if (overflow === 'auto' || overflow === 'scroll') return element
    }
    element = element.parentElement
  }
  return null
}
