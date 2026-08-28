import { canPresent } from './behaviorPolicy'
import { assertNever, type LifecycleState, type PresentGate } from './types'

export type LifecycleAction =
  | Readonly<{ type: 'open' }>
  | Readonly<{ type: 'host-shown' }>
  | Readonly<{ type: 'layout-ready' }>
  | Readonly<{ type: 'request-close'; notify: boolean }>
  | Readonly<{ type: 'exit-complete' }>

export const UNMOUNTED: LifecycleState = Object.freeze({ phase: 'unmounted' })

function resolveOpenState(
  gates: readonly PresentGate[],
  flags: Readonly<{ hostShown: boolean; layoutReady: boolean }>,
): LifecycleState {
  return canPresent(gates, flags)
    ? { phase: 'presented' }
    : { phase: 'mounting', ...flags }
}

/**
 * Deterministic overlay lifecycle. Chrome remains mounted in `dismissing`
 * until its real completion signal or the React layer's exit budget fires.
 */
export function reduceLifecycle(
  gates: readonly PresentGate[],
  state: LifecycleState,
  action: LifecycleAction,
): LifecycleState {
  switch (action.type) {
    case 'open':
      switch (state.phase) {
        case 'unmounted':
          return resolveOpenState(gates, {
            hostShown: false,
            layoutReady: false,
          })
        case 'dismissing':
          return resolveOpenState(gates, {
            hostShown: state.hostShown,
            layoutReady: state.layoutReady,
          })
        case 'mounting':
        case 'presented':
          return state
        default:
          return assertNever(state)
      }

    case 'host-shown':
      if (state.phase === 'mounting') {
        return resolveOpenState(gates, { ...state, hostShown: true })
      }
      if (state.phase === 'dismissing') return { ...state, hostShown: true }
      return state

    case 'layout-ready':
      if (state.phase === 'mounting') {
        return resolveOpenState(gates, { ...state, layoutReady: true })
      }
      if (state.phase === 'dismissing') return { ...state, layoutReady: true }
      return state

    case 'request-close':
      switch (state.phase) {
        case 'unmounted':
        case 'dismissing':
          return state
        case 'mounting':
          return {
            phase: 'dismissing',
            notify: action.notify,
            hostShown: state.hostShown,
            layoutReady: state.layoutReady,
          }
        case 'presented':
          return {
            phase: 'dismissing',
            notify: action.notify,
            // Every gate required by this instance has been satisfied and
            // its still-mounted chrome will not repeat one-shot signals.
            hostShown: true,
            layoutReady: true,
          }
        default:
          return assertNever(state)
      }

    case 'exit-complete':
      // Native-owned surfaces may report a completed interactive dismissal
      // before the controlled prop update enters `dismissing`.
      return UNMOUNTED

    default:
      return assertNever(action)
  }
}
