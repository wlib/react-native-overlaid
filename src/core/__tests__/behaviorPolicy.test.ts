import {
  BEHAVIOR,
  PRESENT_GATES,
  USER_DISMISS_EVENTS,
  canPresent,
  decideDismissRequest,
} from '../behaviorPolicy'
import type { DismissEvent } from '../types'

const ALL_EVENTS = {
  'backdrop-press': true,
  escape: true,
  'outside-press': true,
  scroll: true,
  'swipe-down': true,
  'back-button': true,
  programmatic: true,
} satisfies Record<DismissEvent, true>

describe('behavior policy', () => {
  it('encodes the intentional hint asymmetries', () => {
    expect(BEHAVIOR.hint.escape).toBe(true)
    expect(BEHAVIOR.hint.backButton).toBe(false)
    expect(BEHAVIOR.hint.displacesTransientsOnOpen).toBe(false)
    expect(BEHAVIOR.auto.displacesTransientsOnOpen).toBe(true)
  })

  it('contains exactly the user dismissal events', () => {
    const userEvents = (Object.keys(ALL_EVENTS) as DismissEvent[]).filter(
      (event) => event !== 'programmatic',
    )
    expect(USER_DISMISS_EVENTS).toEqual(new Set(userEvents))
  })

  it('freezes policy and gate tables deeply', () => {
    expect(Object.isFrozen(BEHAVIOR)).toBe(true)
    expect(Object.values(BEHAVIOR).every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(PRESENT_GATES)).toBe(true)
    expect(Object.values(PRESENT_GATES).every(Object.isFrozen)).toBe(true)
  })

  it('requires every requested presentation gate', () => {
    expect(
      canPresent(PRESENT_GATES.sheet, { hostShown: true, layoutReady: false }),
    ).toBe(false)
    expect(
      canPresent(PRESENT_GATES.sheet, { hostShown: true, layoutReady: true }),
    ).toBe(true)
    expect(canPresent([], { hostShown: false, layoutReady: false })).toBe(true)
  })
})

describe('decideDismissRequest precedence', () => {
  const base = {
    event: 'escape' as const,
    vetoed: false,
    force: false,
    dismissable: true,
    phase: 'presented' as const,
  }

  it('programmatic bypasses every user guard', () => {
    expect(
      decideDismissRequest({
        ...base,
        event: 'programmatic',
        vetoed: true,
        dismissable: false,
        phase: 'dismissing',
      }),
    ).toEqual({ kind: 'dismiss', completion: 'lifecycle', notify: true })
  })

  it('veto outranks force', () => {
    expect(
      decideDismissRequest({ ...base, vetoed: true, force: true }),
    ).toEqual({ kind: 'refuse', reason: 'vetoed' })
  })

  it('force outranks dismissability and fast-forwards without double notify', () => {
    expect(
      decideDismissRequest({ ...base, force: true, dismissable: false }),
    ).toEqual({ kind: 'dismiss', completion: 'immediate', notify: true })
    expect(
      decideDismissRequest({ ...base, force: true, phase: 'dismissing' }),
    ).toEqual({ kind: 'dismiss', completion: 'immediate', notify: false })
  })

  it('dismissability outranks the dying guard', () => {
    expect(
      decideDismissRequest({
        ...base,
        dismissable: false,
        phase: 'dismissing',
      }),
    ).toEqual({ kind: 'refuse', reason: 'not-dismissable' })
    expect(decideDismissRequest({ ...base, phase: 'dismissing' })).toEqual({
      kind: 'refuse',
      reason: 'already-dismissing',
    })
  })
})
