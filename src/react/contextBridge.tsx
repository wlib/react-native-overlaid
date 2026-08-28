import {
  useContext,
  useMemo,
  useRef,
  type ComponentType,
  type Context,
  type ReactNode,
} from 'react'

export type ContextBridge = ComponentType<{ children?: ReactNode }>

/** Capture contexts at the portal source and re-provide them at its host. */
export function useContextBridge(
  // `Context` is invariant, so `unknown` would reject Context<string>, etc.
  // Values are never inspected; their precise types remain owned by Provider.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...contexts: ReadonlyArray<Context<any>>
): ContextBridge {
  const initialContexts = useRef(contexts)
  if (
    contexts.length !== initialContexts.current.length ||
    contexts.some(
      (context, index) => context !== initialContexts.current[index],
    )
  ) {
    throw new Error(
      'useContextBridge requires the same context objects in the same order on every render',
    )
  }

  // The context list is invariant, making this fixed-size hook sequence valid.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const values = contexts.map((context) => useContext(context))
  const valuesRef = useRef(values)
  valuesRef.current = values

  return useMemo(() => {
    const capturedContexts = initialContexts.current
    function Bridge({ children }: { children?: ReactNode }) {
      return capturedContexts.reduceRight<ReactNode>(
        (content, context, index) => (
          <context.Provider value={valuesRef.current[index]}>
            {content}
          </context.Provider>
        ),
        children,
      )
    }
    return Bridge
  }, [])
}
