import { useCallback, useRef, useState } from 'react'

export type ControllableStateOptions<T> = {
  value?: T
  defaultValue: T
  onChange?: (value: T) => void
}

/** Controlled/uncontrolled state with fresh callbacks and updater support. */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<T>): [T, (next: T | ((previous: T) => T)) => void] {
  const controlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue)
  const current = controlled ? value : internal
  const currentRef = useRef(current)
  const onChangeRef = useRef(onChange)
  currentRef.current = current
  onChangeRef.current = onChange

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (previous: T) => T)(currentRef.current)
          : next
      if (Object.is(resolved, currentRef.current)) return
      if (!controlled) {
        currentRef.current = resolved
        setInternal(resolved)
      }
      onChangeRef.current?.(resolved)
    },
    [controlled],
  )
  return [current, setValue]
}
