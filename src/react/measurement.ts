import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Platform, type View } from 'react-native'

export type Measurement = {
  x: number
  y: number
  width: number
  height: number
}

/** Native page coordinates: the space shared by touches and portal placement. */
export function measureNodeInWindow(
  ref: RefObject<View | null>,
): Promise<Measurement | undefined> {
  return new Promise((resolve) => {
    const node = ref.current
    if (!node || typeof node.measure !== 'function') {
      resolve(undefined)
      return
    }
    node.measure((_x, _y, width, height, pageX, pageY) => {
      if (typeof pageX !== 'number' || typeof pageY !== 'number') {
        resolve(undefined)
      } else {
        resolve({ x: pageX, y: pageY, width, height })
      }
    })
  })
}

function sameMeasurement(a?: Measurement, b?: Measurement): boolean {
  return (
    a?.x === b?.x &&
    a?.y === b?.y &&
    a?.width === b?.width &&
    a?.height === b?.height
  )
}

export function useMeasurement(
  ref: RefObject<View | null>,
  { disabled = false }: { disabled?: boolean } = {},
) {
  const [measurement, setMeasurement] = useState<Measurement>()
  const alive = useRef(true)
  const request = useRef(0)
  const frame = useRef<number | null>(null)

  useLayoutEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      request.current += 1
      if (
        typeof cancelAnimationFrame !== 'undefined' &&
        frame.current !== null
      ) {
        cancelAnimationFrame(frame.current)
        frame.current = null
      }
    }
  }, [])

  const updateMeasurement = useCallback(async () => {
    const currentRequest = ++request.current
    const next = await measureNodeInWindow(ref)
    if (alive.current && currentRequest === request.current) {
      setMeasurement((previous) =>
        sameMeasurement(previous, next) ? previous : next,
      )
    }
    return next
  }, [ref])

  useLayoutEffect(() => {
    if (disabled) {
      request.current += 1
      setMeasurement(undefined)
      return
    }

    void updateMeasurement()
    if (Platform.OS !== 'web' || typeof addEventListener === 'undefined') return

    const schedule = () => {
      if (frame.current !== null) return
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        void updateMeasurement()
      })
    }
    const options = { capture: true, passive: true }
    addEventListener('scroll', schedule, options)
    addEventListener('resize', schedule, options)
    return () => {
      removeEventListener('scroll', schedule, options)
      removeEventListener('resize', schedule, options)
      request.current += 1
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current)
        frame.current = null
      }
    }
  }, [disabled, updateMeasurement])

  return { measurement, updateMeasurement }
}
