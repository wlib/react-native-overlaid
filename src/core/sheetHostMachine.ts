import { assertNever } from './types'

export type Transition<S, C> = Readonly<{
  state: S
  commands?: readonly C[]
}>

/** Native OS-sheet state, including reopen while dismissal is in flight. */
export type SheetHostState = 'closed' | 'open' | 'closing' | 'reopening'

export type SheetHostEvent = 'OPEN' | 'CLOSE' | 'DID_PRESENT' | 'DID_DISMISS'

export type SheetHostCommand =
  'present' | 'dismiss' | 'hostShown' | 'notifyClosed' | 'exitComplete'

function stay(state: SheetHostState): Transition<SheetHostState, never> {
  return { state }
}

/**
 * Bridge declarative open state to an imperative OS sheet. Dismissal is
 * classified by recorded machine state, never by the latest React prop:
 * `open x DID_DISMISS` is native-initiated, while
 * `closing x DID_DISMISS` completes a dismissal already known to the kernel.
 */
export function reduceSheetHost(
  state: SheetHostState,
  event: SheetHostEvent,
): Transition<SheetHostState, SheetHostCommand> {
  switch (state) {
    case 'closed':
      return event === 'OPEN'
        ? { state: 'open', commands: ['present'] }
        : stay(state)

    case 'open':
      if (event === 'DID_PRESENT') {
        return { state, commands: ['hostShown'] }
      }
      if (event === 'CLOSE') {
        return { state: 'closing', commands: ['dismiss'] }
      }
      if (event === 'DID_DISMISS') {
        return {
          state: 'closed',
          commands: ['notifyClosed', 'exitComplete'],
        }
      }
      return stay(state)

    case 'closing':
      if (event === 'DID_DISMISS') {
        return { state: 'closed', commands: ['exitComplete'] }
      }
      if (event === 'OPEN') return { state: 'reopening' }
      return stay(state)

    case 'reopening':
      if (event === 'DID_DISMISS') {
        return { state: 'open', commands: ['present'] }
      }
      if (event === 'CLOSE') return { state: 'closing' }
      return stay(state)

    default:
      return assertNever(state)
  }
}
