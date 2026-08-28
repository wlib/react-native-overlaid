import { BEHAVIOR, type BehaviorTable } from './behaviorPolicy'
import type { Behavior, DismissalChannel, DismissEvent } from './types'

export type StackEntrySnapshot = Readonly<{
  id: string
  behavior: Behavior
  parentEntryId: string | null
  /** Absent means `managed`; see {@link DismissalChannel}. */
  channel?: DismissalChannel
}>

export type Step = Readonly<{
  id: string
  event: DismissEvent
  force?: boolean
  stopIfHandled?: boolean
  stopAlways?: boolean
  /**
   * The platform channel owns this gesture for this entry: the executor must
   * not fire it (the browser closes it and the entry self-reports), and the
   * dispatcher must leave the platform's default action alone.
   */
  deferToPlatform?: boolean
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
    const platform = entry.channel === 'platform'
    if (policy.blocksBelow) {
      if (policy[eligibility]) {
        steps.push(
          platform
            ? { id: entry.id, event, stopAlways: true, deferToPlatform: true }
            : { id: entry.id, event, stopIfHandled: true, stopAlways: true },
        )
      }
      break
    }
    if (policy[eligibility]) {
      if (platform) {
        // The browser closes this entry itself; one gesture must still close
        // at most one layer, so the walk ends here without a kernel firing.
        steps.push({
          id: entry.id,
          event,
          stopAlways: true,
          deferToPlatform: true,
        })
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
    // Platform-channel entries light-dismiss through the browser and
    // self-report; the kernel presses managed entries only (the walk still
    // continues past a platform transient to managed layers below it).
    const fires = !inside && policy.outsidePress && entry.channel !== 'platform'

    if (policy.blocksBelow) {
      if (fires) {
        steps.push({
          id: entry.id,
          event: 'outside-press',
          stopAlways: true,
        })
      }
      break
    }
    if (fires) {
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
    // The browser's own auto stack displaces platform-channel transients.
    if (entry.channel === 'platform') continue
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
