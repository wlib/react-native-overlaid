import type { Ref, RefCallback, RefObject } from 'react'

/** A small ref fan-out. React 18 invokes the callback with null on cleanup. */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as RefObject<T | null>).current = node
    }
  }
}
