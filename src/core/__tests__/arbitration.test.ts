import {
  isAncestorOf,
  planBackButton,
  planEscape,
  planOutsidePress,
  planTransientDisplacement,
  type StackEntrySnapshot,
} from '../arbitration'
import type { Behavior } from '../types'

function entry(
  id: string,
  behavior: Behavior,
  parentEntryId: string | null = null,
): StackEntrySnapshot {
  return { id, behavior, parentEntryId }
}

function platformEntry(
  id: string,
  behavior: Behavior,
  parentEntryId: string | null = null,
): StackEntrySnapshot {
  return { id, behavior, parentEntryId, channel: 'platform' }
}

describe('key dismissal plans', () => {
  it('walks top-down, while back skips hints', () => {
    const stack = [
      entry('parent', 'auto'),
      entry('hint', 'hint', 'parent'),
      entry('child', 'auto', 'parent'),
    ]
    expect(planEscape(stack).map(({ id }) => id)).toEqual([
      'child',
      'hint',
      'parent',
    ])
    expect(planBackButton(stack).map(({ id }) => id)).toEqual([
      'child',
      'parent',
    ])
  })

  it('stops unconditionally at a modal after planning layers above it', () => {
    const stack = [
      entry('below', 'auto'),
      entry('modal', 'modal'),
      entry('above', 'auto'),
    ]
    expect(planEscape(stack)).toEqual([
      { id: 'above', event: 'escape', stopIfHandled: true },
      {
        id: 'modal',
        event: 'escape',
        stopIfHandled: true,
        stopAlways: true,
      },
    ])
  })
})

describe('outside press plans', () => {
  it('treats a descendant as inside every ancestor', () => {
    const stack = [
      entry('dialog', 'modal'),
      entry('popover', 'auto', 'dialog'),
      entry('tooltip', 'hint', 'popover'),
    ]
    expect(planOutsidePress(stack, 'tooltip')).toEqual([])
  })

  it('dismisses the entire transient branch for a press outside everything', () => {
    const stack = [
      entry('dialog', 'modal'),
      entry('popover', 'auto', 'dialog'),
      entry('tooltip', 'hint', 'popover'),
    ]
    expect(planOutsidePress(stack, null)).toEqual([
      { id: 'tooltip', event: 'outside-press' },
      { id: 'popover', event: 'outside-press' },
      { id: 'dialog', event: 'outside-press', stopAlways: true },
    ])
  })

  it('ends safely when parent ids form a cycle', () => {
    const stack = [
      entry('dialog', 'modal'),
      entry('a', 'auto', 'b'),
      entry('b', 'auto', 'a'),
    ]
    expect(planOutsidePress(stack, 'b')).toEqual([
      { id: 'dialog', event: 'outside-press', stopAlways: true },
    ])
  })
})

describe('transient displacement plans', () => {
  it('spares the opening layer and every ancestor', () => {
    const stack = [
      entry('unrelated', 'auto'),
      entry('parent', 'auto'),
      entry('child', 'auto', 'parent'),
    ]
    expect(planTransientDisplacement(stack, 'child')).toEqual([
      { id: 'unrelated', event: 'outside-press', force: true },
    ])
  })

  it('spares descendants when a still-mounted parent reopens', () => {
    const stack = [entry('parent', 'auto'), entry('child', 'hint', 'parent')]
    expect(planTransientDisplacement(stack, 'parent')).toEqual([])
  })

  it('stops at a modal without displacing it or anything below', () => {
    const stack = [
      entry('below', 'auto'),
      entry('modal', 'modal'),
      entry('hint', 'hint'),
    ]
    expect(planTransientDisplacement(stack, null)).toEqual([
      { id: 'hint', event: 'outside-press', force: true },
    ])
  })
})

describe('platform-channel entries (delegated instruments)', () => {
  it('escape hands the gesture to a platform top transient and stops', () => {
    const stack = [entry('below', 'auto'), platformEntry('top', 'auto')]
    expect(planEscape(stack)).toEqual([
      { id: 'top', event: 'escape', delegated: true, stopAlways: true },
    ])
  })

  it('escape fires a managed top and only delegates when it refuses', () => {
    const stack = [platformEntry('platform', 'auto'), entry('managed', 'auto')]
    expect(planEscape(stack)).toEqual([
      { id: 'managed', event: 'escape', stopIfHandled: true },
      { id: 'platform', event: 'escape', delegated: true, stopAlways: true },
    ])
  })

  it('escape delegates at a platform blocker instead of stepping it', () => {
    const stack = [
      entry('below', 'auto'),
      platformEntry('modal', 'modal'),
      entry('above', 'auto', 'modal'),
    ]
    expect(planEscape(stack)).toEqual([
      { id: 'above', event: 'escape', stopIfHandled: true },
      { id: 'modal', event: 'escape', delegated: true, stopAlways: true },
    ])
  })

  it('untrusted gestures route platform entries through the kernel', () => {
    const stack = [platformEntry('modal', 'modal'), platformEntry('top', 'auto')]
    expect(planEscape(stack, undefined, false)).toEqual([
      { id: 'top', event: 'escape', stopIfHandled: true },
      { id: 'modal', event: 'escape', stopIfHandled: true, stopAlways: true },
    ])
    expect(planOutsidePress(stack, null, undefined, false)).toEqual([
      { id: 'top', event: 'outside-press' },
      { id: 'modal', event: 'outside-press', stopAlways: true },
    ])
  })

  it('outside press skips platform entries but still closes managed ones', () => {
    const stack = [
      entry('managed', 'auto'),
      platformEntry('platform', 'auto'),
      entry('hint', 'hint'),
    ]
    // The browser light-dismisses the platform entry on the very same
    // pointerdown; the kernel closes the rest of the transient branch.
    expect(planOutsidePress(stack, null)).toEqual([
      { id: 'hint', event: 'outside-press' },
      { id: 'managed', event: 'outside-press' },
    ])
  })

  it('outside press stops silently at a platform blocker', () => {
    const stack = [entry('below', 'auto'), platformEntry('modeless', 'modal')]
    expect(planOutsidePress(stack, null)).toEqual([])
  })

  it('displacement still force-fires platform entries (kernel-owned)', () => {
    // Deliberate interop decision: displacement is a kernel policy action,
    // not a gesture classification — it must hold for programmatic opens
    // where the browser's auto stack never acts. Doubling with a same-press
    // browser light dismiss is absorbed by the dying-guard/notify latch.
    const stack = [platformEntry('platform', 'auto'), entry('opening', 'auto')]
    expect(planTransientDisplacement(stack, 'opening')).toEqual([
      { id: 'platform', event: 'outside-press', force: true },
    ])
  })
})

describe('ancestry', () => {
  it('follows multiple hops and treats self as an ancestor', () => {
    const stack = [
      entry('a', 'auto'),
      entry('b', 'auto', 'a'),
      entry('c', 'auto', 'b'),
    ]
    expect(isAncestorOf(stack, 'a', 'a')).toBe(true)
    expect(isAncestorOf(stack, 'a', 'c')).toBe(true)
    expect(isAncestorOf(stack, 'c', 'a')).toBe(false)
  })

  it('terminates malformed cycles and missing parents', () => {
    const stack = [entry('a', 'auto', 'b'), entry('b', 'auto', 'a')]
    expect(isAncestorOf(stack, 'missing', 'a')).toBe(false)
    expect(isAncestorOf(stack, 'a', null)).toBe(false)
  })
})
