import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import {
  useWindowDimensions,
  type LayoutChangeEvent,
  type View,
} from 'react-native'
import {
  computePosition,
  flip,
  offset,
  shift,
  type Middleware,
} from '@floating-ui/core'
import { composeRefs } from './composeRefs'
import { measureNodeInWindow, useMeasurement } from './measurement'
import {
  insetClippingRect,
  type AnchoredPosition,
  type AnchoredPositionOptions,
} from './anchoredPosition'

type Size = { width: number; height: number }
type Position = { x: number; y: number }

/** Native page-space placement. Chrome subtracts its PortalHost origin. */
export function useAnchoredPosition(
  options: AnchoredPositionOptions,
  isOpen: boolean,
  isMounted = isOpen,
): AnchoredPosition {
  const {
    placement = 'bottom-start',
    offset: gap = 8,
    boundaryRef,
    anchor,
    surface,
    insets,
  } = options
  const window = useWindowDimensions()
  const anchorNode = useRef<View | null>(null)
  const [surfaceSize, setSurfaceSize] = useState<Size>()
  const [position, setPosition] = useState<Position>()
  const [boundary, setBoundary] = useState<MeasurementRect>()
  const boundaryRequest = useRef(0)
  const positionRequest = useRef(0)
  const { measurement: anchorRect } = useMeasurement(anchorNode, {
    disabled: !isMounted,
  })

  useEffect(() => {
    const request = ++boundaryRequest.current
    if (!isMounted || !boundaryRef?.current) {
      setBoundary(undefined)
      return
    }
    void measureNodeInWindow(boundaryRef as RefObject<View | null>).then(
      (next) => {
        if (request === boundaryRequest.current) setBoundary(next)
      },
    )
  }, [boundaryRef, isMounted])

  useEffect(() => {
    if (!isMounted) {
      positionRequest.current += 1
      setPosition(undefined)
      setSurfaceSize(undefined)
      return
    }
    if (!anchorRect || !surfaceSize) return

    const request = ++positionRequest.current
    const clippingRect =
      boundary ??
      insetClippingRect(
        { x: 0, y: 0, width: window.width, height: window.height },
        insets,
      )
    const middleware: Middleware[] = [
      offset(gap),
      flip({ boundary: clippingRect as never }),
      shift({ boundary: clippingRect as never, padding: 8 }),
    ]
    const platform = {
      getElementRects: () => ({
        reference: anchorRect,
        floating: { x: 0, y: 0, ...surfaceSize },
      }),
      getClippingRect: () => clippingRect,
      getDimensions: (element: Size) => element,
    }

    void computePosition(anchorRect as never, surfaceSize as never, {
      placement,
      middleware,
      platform: platform as never,
    }).then((next) => {
      if (request === positionRequest.current) {
        setPosition({ x: next.x, y: next.y })
      }
    })
    return () => {
      positionRequest.current += 1
    }
  }, [
    anchorRect,
    boundary,
    gap,
    insets,
    isMounted,
    placement,
    surfaceSize,
    window.height,
    window.width,
  ])

  const onSurfaceLayout = useCallback((event: unknown) => {
    const { width, height } = (event as LayoutChangeEvent).nativeEvent.layout
    setSurfaceSize((previous) =>
      previous?.width === width && previous.height === height
        ? previous
        : { width, height },
    )
  }, [])
  const anchorRef = useMemo(
    () => composeRefs<unknown>(anchorNode as RefObject<unknown>, anchor),
    [anchor],
  )

  return useMemo(
    () => ({
      panelStyle: {
        position: 'absolute',
        top: position?.y ?? -9999,
        left: position?.x ?? 0,
        opacity: position ? 1 : 0,
      },
      isPositioned: Boolean(isOpen && position && surfaceSize),
      refs: { anchor: anchorRef, surface },
      onSurfaceLayout,
    }),
    [anchorRef, isOpen, onSurfaceLayout, position, surface, surfaceSize],
  )
}

type MeasurementRect = {
  x: number
  y: number
  width: number
  height: number
}
