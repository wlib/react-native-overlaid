import { BEHAVIOR, type BehaviorTable } from './behaviorPolicy'
import type { Behavior, DismissEvent } from './types'

export type StackEntrySnapshot = Readonly<{
  id: string
  behavior: Behavior
  parentEntryId: string | null
  /** See `LayerEntry.channel`; absent means `managed`. */
  channel?: 'managed' | 'platform' | undefined
}>

export type Step = Readonly<{
  id: string
  event: DismissEvent
  force?: boolean
  stopIfHandled?: boolean
  stopAlways?: boolean
  /**
   * The platform channel owns this gesture for this entry: the executor must
   * not fire it (the browser acts on the same gesture and the entry
   * self-reports), and nothing below it may receive the gesture either.
   */
  delegated?: boolean
}>

export function isAncestorOf(
  stack: readonly StackEntrySnapshot[],
  ancestorId: string,
  descendantId: string | null,
): boolean {
  if (descendantId === null) return false
  if (ancestorId === descendantId) return true

  const byId = new Map(stack.map((entry) => [entry.id, entry]))
  const visited = new Set<string>()
  let currentId: string | null = descendantId

  while (currentId !== null && !visited.has(currentId)) {
    visited.add(currentId)
    const current = byId.get(currentId)
    if (!current) return false
    if (current.parentEntryId === ancestorId) return true
    currentId = current.parentEntryId
  }
  return false
}

function planKeyDismiss(
  stack: readonly StackEntrySnapshot[],
  eligibility: 'escape' | 'backButton',
  event: DismissEvent,
  behaviors: BehaviorTable,
  trusted: boolean,
): Step[] {
  const steps: Step[] = []
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index]
    if (!entry) continue
    const policy = behaviors[entry.behavior]
    // A platform-channel entry answers this key itself (browser Escape /
    // close request) — but only real user input reaches those watchers, so
    // synthetic gestures still route through the kernel (R1 both ways: the
    // browser is inert to untrusted input; the kernel stands down for
    // trusted input).
    const platform = trusted && entry.channel === 'platform'
    if (policy.blocksBelow) {
      if (policy[eligibility]) {
        steps.push(
          platform
            ? { id: entry.id, event, delegated: true, stopAlways: true }
            : { id: entry.id, event, stopIfHandled: true, stopAlways: true },
        )
      }
      break
    }
    if (policy[eligibility]) {
      if (platform) {
        // The platform closes exactly one layer for this key; nothing below
        // may receive the same gesture from the kernel.
        steps.push({ id: entry.id, event, delegated: true, stopAlways: true })
        break
      }
      steps.push({ id: entry.id, event, stopIfHandled: true })
    }
  }
  return steps
}

export function planEscape(
  stack: readonly StackEntrySnapshot[],
  behaviors: BehaviorTable = BEHAVIOR,
  trusted = true,
): Step[] {
  return planKeyDismiss(stack, 'escape', 'escape', behaviors, trusted)
}

export function planBackButton(
  stack: readonly StackEntrySnapshot[],
  behaviors: BehaviorTable = BEHAVIOR,
  trusted = true,
): Step[] {
  return planKeyDismiss(stack, 'backButton', 'back-button', behaviors, trusted)
}

/** `containerId` is the deepest layer containing the press, or null. */
export function planOutsidePress(
  stack: readonly StackEntrySnapshot[],
  containerId: string | null,
  behaviors: BehaviorTable = BEHAVIOR,
  trusted = true,
): Step[] {
  const steps: Step[] = []
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index]
    if (!entry) continue
    const policy = behaviors[entry.behavior]
    const inside =
      containerId === entry.id || isAncestorOf(stack, entry.id, containerId)
    // The browser light-dismisses a trusted platform-channel entry on the
    // very same pointerdown; the kernel skips it but keeps walking — an
    // outside press closes every affected layer, each through its own
    // channel. Untrusted presses never reach the browser's light dismiss,
    // so the kernel handles those entries itself.
    const platform = trusted && entry.channel === 'platform'

    if (policy.blocksBelow) {
      if (!inside && policy.outsidePress && !platform) {
        steps.push({
          id: entry.id,
          event: 'outside-press',
          stopAlways: true,
        })
      }
      break
    }
    if (!inside && policy.outsidePress && !platform) {
      steps.push({ id: entry.id, event: 'outside-press' })
    }
  }
  return steps
}

/**
 * Displacement deliberately ignores the channel: it is a kernel-initiated
 * policy action (type c), not a user-gesture classification, and it must
 * hold for programmatic opens where the browser's auto stack never acts.
 * When a browser light dismiss doubles it on the same pointerdown, the
 * dying-guard and notify latch absorb the second delivery (report R1's
 * sanctioned posture; the displacement-interop decision for Approach B).
 */
export function planTransientDisplacement(
  stack: readonly StackEntrySnapshot[],
  exceptId: string | null,
  behaviors: BehaviorTable = BEHAVIOR,
): Step[] {
  const steps: Step[] = []
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index]
    if (!entry) continue
    if (
      exceptId !== null &&
      (entry.id === exceptId ||
        isAncestorOf(stack, entry.id, exceptId) ||
        isAncestorOf(stack, exceptId, entry.id))
    ) {
      continue
    }
    const policy = behaviors[entry.behavior]
    if (policy.blocksBelow) break
    if (policy.displacedByNewTransient) {
      steps.push({
        id: entry.id,
        event: 'outside-press',
        force: true,
      })
    }
  }
  return steps
}
