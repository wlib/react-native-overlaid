/** Native reveal animations. Web chromes use CSS transitions. */
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, useWindowDimensions } from 'react-native'
import type { Phase } from '../core/types'

export type RevealShape =
  | { kind: 'fade' }
  | { kind: 'slide'; from: 'left' | 'right' | 'top' | 'bottom' }

function useReduceMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let active = true
    const query = AccessibilityInfo.isReduceMotionEnabled?.()
    void query?.then((value) => {
      // `false` is already the initial value; avoiding that redundant async
      // update also keeps mounts deterministic when the query resolves late.
      if (active && value) setReduced(true)
    })
    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduced,
    )
    return () => {
      active = false
      subscription?.remove()
    }
  }, [])

  return reduced
}

export function useRevealStyle(shape: RevealShape, phase: Phase, ms: number) {
  const presented = phase === 'presented'
  const progress = useRef(new Animated.Value(presented ? 1 : 0)).current
  const reduceMotion = useReduceMotion()
  const { width, height } = useWindowDimensions()

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: presented ? 1 : 0,
      duration: reduceMotion ? 0 : Math.max(0, ms),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [ms, presented, progress, reduceMotion])

  if (shape.kind === 'fade') return { opacity: progress }

  const distance =
    shape.from === 'left'
      ? -width
      : shape.from === 'right'
        ? width
        : shape.from === 'top'
          ? -height
          : height
  const translate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  })

  return {
    opacity: progress,
    transform:
      shape.from === 'left' || shape.from === 'right'
        ? [{ translateX: translate }]
        : [{ translateY: translate }],
  }
}
