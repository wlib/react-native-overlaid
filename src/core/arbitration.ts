import { BEHAVIOR, type BehaviorTable } from './behaviorPolicy'
import type { Behavior, DismissEvent } from './types'

export type StackEntrySnapshot = Readonly<{
  id: string
  behavior: Behavior
  parentEntryId: string | null
}>

export type Step = Readonly<{
  id: string
  event: DismissEvent
  force?: boolean
  stopIfHandled?: boolean
  stopAlways?: boolean
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
): Step[] {
  const steps: Step[] = []
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index]
    if (!entry) continue
    const policy = behaviors[entry.behavior]
    if (policy.blocksBelow) {
      if (policy[eligibility]) {
        steps.push({
          id: entry.id,
          event,
          stopIfHandled: true,
          stopAlways: true,
        })
      }
      break
    }
    if (policy[eligibility]) {
      steps.push({ id: entry.id, event, stopIfHandled: true })
    }
  }
  return steps
}

export function planEscape(
  stack: readonly StackEntrySnapshot[],
  behaviors: BehaviorTable = BEHAVIOR,
): Step[] {
  return planKeyDismiss(stack, 'escape', 'escape', behaviors)
}

export function planBackButton(
  stack: readonly StackEntrySnapshot[],
  behaviors: BehaviorTable = BEHAVIOR,
): Step[] {
  return planKeyDismiss(stack, 'backButton', 'back-button', behaviors)
}

/** `containerId` is the deepest layer containing the press, or null. */
export function planOutsidePress(
  stack: readonly StackEntrySnapshot[],
  containerId: string | null,
  behaviors: BehaviorTable = BEHAVIOR,
): Step[] {
  const steps: Step[] = []
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index]
    if (!entry) continue
    const policy = behaviors[entry.behavior]
    const inside =
      containerId === entry.id || isAncestorOf(stack, entry.id, containerId)

    if (policy.blocksBelow) {
      if (!inside && policy.outsidePress) {
        steps.push({
          id: entry.id,
          event: 'outside-press',
          stopAlways: true,
        })
      }
      break
    }
    if (!inside && policy.outsidePress) {
      steps.push({ id: entry.id, event: 'outside-press' })
    }
  }
  return steps
}

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
