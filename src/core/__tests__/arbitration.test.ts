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

describe('platform-channel entries (browser-delegated dismissal)', () => {
  it('escape defers to a topmost platform transient without firing anyone', () => {
    // The browser closes its own popover on Escape; one gesture must not
    // also close the managed layer below through the kernel.
    const stack = [entry('managed', 'auto'), platformEntry('delegated', 'auto')]
    expect(planEscape(stack)).toEqual([
      {
        id: 'delegated',
        event: 'escape',
        stopAlways: true,
        deferToPlatform: true,
      },
    ])
  })

  it('escape still fires a managed transient above a platform one', () => {
    const stack = [platformEntry('delegated', 'auto'), entry('managed', 'auto')]
    expect(planEscape(stack)).toEqual([
      { id: 'managed', event: 'escape', stopIfHandled: true },
      {
        id: 'delegated',
        event: 'escape',
        stopAlways: true,
        deferToPlatform: true,
      },
    ])
  })

  it('escape defers at a platform modal blocker', () => {
    const stack = [entry('below', 'auto'), platformEntry('modal', 'modal')]
    expect(planEscape(stack)).toEqual([
      {
        id: 'modal',
        event: 'escape',
        stopAlways: true,
        deferToPlatform: true,
      },
    ])
  })

  it('outside press skips platform entries but continues to managed ones', () => {
    // The browser light-dismisses its own popover; the kernel still presses
    // the managed transient below it in the same gesture.
    const stack = [entry('managed', 'auto'), platformEntry('delegated', 'auto')]
    expect(planOutsidePress(stack, null)).toEqual([
      { id: 'managed', event: 'outside-press' },
    ])
  })

  it('outside press never fires a platform modal but still stops at it', () => {
    const stack = [entry('below', 'auto'), platformEntry('modal', 'modal')]
    expect(planOutsidePress(stack, null)).toEqual([])
  })

  it('displacement skips platform transients (the browser auto stack owns them)', () => {
    const stack = [platformEntry('delegated', 'auto'), entry('managed', 'auto')]
    expect(planTransientDisplacement(stack, 'opening')).toEqual([
      { id: 'managed', event: 'outside-press', force: true },
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
