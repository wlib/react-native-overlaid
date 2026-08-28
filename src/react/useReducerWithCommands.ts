import { useCallback, useRef, useState } from 'react'

export type CommandTransition<S, C> = {
  state: S
  commands?: readonly C[]
}

/** Pure transition plus eager, exactly-once command interpretation. */
export function useReducerWithCommands<S, E, C>(
  reduce: (state: S, event: E) => CommandTransition<S, C>,
  initial: S,
  interpret: (command: C) => void,
): [S, (event: E) => void] {
  const [state, setState] = useState(initial)
  const stateRef = useRef(state)
  const interpretRef = useRef(interpret)
  stateRef.current = state
  interpretRef.current = interpret

  const send = useCallback(
    (event: E) => {
      const transition = reduce(stateRef.current, event)
      stateRef.current = transition.state
      setState(transition.state)
      transition.commands?.forEach((command) => interpretRef.current(command))
    },
    [reduce],
  )
  return [state, send]
}
