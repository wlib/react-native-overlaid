import { act, renderHook } from '@testing-library/react-native'
import { useControllableState } from '../useControllableState'

describe('useControllableState', () => {
  it('owns an uncontrolled value and emits changes', () => {
    const onChange = jest.fn()
    const hook = renderHook(() =>
      useControllableState({ defaultValue: 1, onChange }),
    )
    act(() => hook.result.current[1]((value) => value + 1))
    expect(hook.result.current[0]).toBe(2)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('does not mutate a controlled value locally', () => {
    const onChange = jest.fn()
    const hook = renderHook(
      ({ value }: { value: number }) =>
        useControllableState({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 4 } },
    )
    act(() => hook.result.current[1](5))
    expect(hook.result.current[0]).toBe(4)
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('keeps the controlled prop authoritative when a consumer ignores change', () => {
    const onChange = jest.fn()
    const hook = renderHook(() =>
      useControllableState({ value: false, defaultValue: false, onChange }),
    )

    act(() => {
      hook.result.current[1]((value) => !value)
      hook.result.current[1]((value) => !value)
    })

    expect(onChange).toHaveBeenNthCalledWith(1, true)
    expect(onChange).toHaveBeenNthCalledWith(2, true)
    expect(hook.result.current[0]).toBe(false)
  })
})
