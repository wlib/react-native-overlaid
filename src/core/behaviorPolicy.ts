import type {
  Behavior,
  DismissEvent,
  OverlayKind,
  Phase,
  PresentGate,
} from './types'

export type BehaviorPolicy = Readonly<{
  escape: boolean
  backButton: boolean
  outsidePress: boolean
  blocksBelow: boolean
  displacedByNewTransient: boolean
  displacesTransientsOnOpen: boolean
}>

export type BehaviorTable = Readonly<Record<Behavior, BehaviorPolicy>>

/** The complete behavior policy; planners only sequence these facts. */
export const BEHAVIOR: BehaviorTable = Object.freeze({
  modal: Object.freeze({
    escape: true,
    backButton: true,
    outsidePress: true,
    blocksBelow: true,
    displacedByNewTransient: false,
    displacesTransientsOnOpen: false,
  }),
  auto: Object.freeze({
    escape: true,
    backButton: true,
    outsidePress: true,
    blocksBelow: false,
    displacedByNewTransient: true,
    displacesTransientsOnOpen: true,
  }),
  hint: Object.freeze({
    // WCAG 1.4.13: hover/focus content must be keyboard-dismissable.
    escape: true,
    // A transient visual hint must never consume Android navigation.
    backButton: false,
    outsidePress: true,
    blocksBelow: false,
    displacedByNewTransient: true,
    // Showing a tooltip must not displace the popover that contains it.
    displacesTransientsOnOpen: false,
  }),
})

export const PRESENT_GATES: Readonly<
  Record<OverlayKind, readonly PresentGate[]>
> = Object.freeze({
  dialog: Object.freeze(['hostShown'] satisfies PresentGate[]),
  drawer: Object.freeze(['hostShown'] satisfies PresentGate[]),
  sheet: Object.freeze(['hostShown', 'layoutReady'] satisfies PresentGate[]),
  popover: Object.freeze(['layoutReady'] satisfies PresentGate[]),
  tooltip: Object.freeze(['layoutReady'] satisfies PresentGate[]),
})

export function canPresent(
  gates: readonly PresentGate[],
  flags: Readonly<{ hostShown: boolean; layoutReady: boolean }>,
): boolean {
  return gates.every((gate) => flags[gate])
}

export const USER_DISMISS_EVENTS: ReadonlySet<DismissEvent> = new Set([
  'backdrop-press',
  'escape',
  'outside-press',
  'scroll',
  'swipe-down',
  'back-button',
])

export type DismissDecision =
  | Readonly<{
      kind: 'dismiss'
      completion: 'lifecycle' | 'immediate'
      notify: boolean
    }>
  | Readonly<{
      kind: 'refuse'
      reason: 'vetoed' | 'not-dismissable' | 'already-dismissing'
    }>

export type DismissDecisionInput = Readonly<{
  event: DismissEvent
  vetoed: boolean
  force: boolean
  dismissable: boolean
  phase: Phase
}>

/**
 * The one authoritative dismissal precedence:
 * programmatic -> veto -> force -> dismissable -> dying guard.
 *
 * React/chrome layers interpret the returned data; keeping this decision pure
 * prevents individual event sources from silently acquiring different rules.
 */
export function decideDismissRequest(
  input: DismissDecisionInput,
): DismissDecision {
  if (input.event === 'programmatic') {
    return { kind: 'dismiss', completion: 'lifecycle', notify: true }
  }
  if (input.vetoed) return { kind: 'refuse', reason: 'vetoed' }
  if (input.force) {
    return {
      kind: 'dismiss',
      completion: 'immediate',
      notify: input.phase !== 'dismissing',
    }
  }
  if (!input.dismissable) {
    return { kind: 'refuse', reason: 'not-dismissable' }
  }
  if (input.phase === 'dismissing') {
    return { kind: 'refuse', reason: 'already-dismissing' }
  }
  return { kind: 'dismiss', completion: 'lifecycle', notify: true }
}
