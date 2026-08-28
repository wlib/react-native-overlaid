import { act, renderHook } from '@testing-library/react-native'
import type { RefObject } from 'react'
import type { View } from 'react-native'
import { useMeasurement } from '../measurement'

type MeasureCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number,
) => void

describe('useMeasurement', () => {
  it('discards an older async result that arrives after a newer request', async () => {
    const callbacks: MeasureCallback[] = []
    const ref = {
      current: {
        measure: (callback: MeasureCallback) => callbacks.push(callback),
      },
    } as unknown as RefObject<View | null>
    const hook = renderHook(() => useMeasurement(ref))
    expect(callbacks).toHaveLength(1)

    void hook.result.current.updateMeasurement()
    expect(callbacks).toHaveLength(2)
    await act(async () => {
      callbacks[1]?.(0, 0, 20, 20, 200, 220)
    })
    await act(async () => {
      callbacks[0]?.(0, 0, 10, 10, 100, 120)
    })

    expect(hook.result.current.measurement).toEqual({
      x: 200,
      y: 220,
      width: 20,
      height: 20,
    })
  })
})
