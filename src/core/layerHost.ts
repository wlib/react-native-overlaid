import {
  planBackButton,
  planEscape,
  planOutsidePress,
  planTransientDisplacement,
  type Step,
} from './arbitration'
import { BEHAVIOR, type BehaviorTable } from './behaviorPolicy'
import type { DispatchOutcome, LayerEntry, LayerHost, Point } from './types'

export type LayerHostOptions = Readonly<{
  behaviors?: BehaviorTable
  /** Custom containment for non-DOM renderers. */
  containsTarget?: (container: unknown, target: unknown) => boolean
}>

type ContainsLike = { contains: (target: unknown) => boolean }

function hasContains(value: unknown): value is ContainsLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'contains' in value &&
    typeof value.contains === 'function'
  )
}

/**
 * Structural containment keeps this module free of DOM globals while still
 * using `Node.contains` when the supplied object supports it. Native falls
 * back to identity or may inject its own resolver.
 */
function defaultContainsTarget(container: unknown, target: unknown): boolean {
  if (container === target && container !== null) return true
  if (!hasContains(container)) return false
  try {
    return container.contains(target)
  } catch {
    return false
  }
}

/** Resolve the newest attached window branch, with cycle protection. */
export function deepestAttachedDescendant(host: LayerHost): LayerHost {
  const visited = new Set<LayerHost>()
  let current = host

  while (!visited.has(current)) {
    visited.add(current)
    const children = current.getChildren()
    const newest = children.at(-1)
    if (!newest || visited.has(newest)) break
    current = newest
  }
  return current
}

function hostTreeContains(root: LayerHost, target: LayerHost): boolean {
  const pending = [root]
  const visited = new Set<LayerHost>()
  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || visited.has(current)) continue
    if (current === target) return true
    visited.add(current)
    pending.push(...current.getChildren())
  }
  return false
}

/** Mutable execution shell around the pure arbitration plans. */
export function createLayerHost(
  name: string,
  parent: LayerHost | null,
  options: LayerHostOptions = {},
): LayerHost {
  const behaviors = options.behaviors ?? BEHAVIOR
  const containsTarget = options.containsTarget ?? defaultContainsTarget
  let stack: readonly LayerEntry[] = Object.freeze([])
  let children: readonly LayerHost[] = Object.freeze([])
  const listeners = new Set<() => void>()

  const notify = (): void => {
    // Snapshot: a listener may unsubscribe itself without skipping another.
    for (const listener of [...listeners]) listener()
  }

  const push = (entry: LayerEntry): void => {
    const existingIndex = stack.findIndex((item) => item.id === entry.id)
    if (existingIndex < 0) {
      stack = Object.freeze([...stack, entry])
    } else {
      // Registration refreshes callbacks/refs without changing z-order.
      stack = Object.freeze(
        stack.map((item, index) => (index === existingIndex ? entry : item)),
      )
    }
    notify()
  }

  const remove = (id: string): void => {
    const next = stack.filter((entry) => entry.id !== id)
    if (next.length === stack.length) return
    stack = Object.freeze(next)
    notify()
  }

  const findContainerId = (target: unknown, point: Point): string | null => {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const entry = stack[index]
      if (!entry) continue
      if (containsTarget(entry.panelRef.current, target)) return entry.id
      if (containsTarget(entry.triggerRef.current, target)) return entry.id
      const bounds = entry.boundsRef?.current
      if (
        bounds &&
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
      ) {
        return entry.id
      }
    }
    return null
  }

  const execute = (steps: readonly Step[]): boolean => {
    let handled = false
    for (const step of steps) {
      // Platform-channel steps are never fired here — the browser closes the
      // entry and it self-reports (R1: one classification per gesture).
      if (step.deferToPlatform) {
        if (step.stopAlways) break
        continue
      }
      // Resolve against live membership: earlier callbacks may remove layers.
      const entry = stack.find((candidate) => candidate.id === step.id)
      const accepted = !entry
        ? false
        : step.force
          ? entry.fire(step.event, { force: true })
          : entry.fire(step.event)
      handled ||= accepted
      if (step.stopAlways || (accepted && step.stopIfHandled)) break
    }
    return handled
  }

  const hasBlocker = (): boolean =>
    stack.some((entry) => behaviors[entry.behavior].blocksBelow)

  const dispatchEscape = (): DispatchOutcome => {
    const steps = planEscape(stack, behaviors)
    if (execute(steps)) return 'handled'
    // A deferred step means the platform channel owns this gesture: report
    // it unhandled so the caller leaves the browser's default action alone
    // (a prevented keydown would suppress the browser's own close request).
    if (steps.some((step) => step.deferToPlatform)) return 'unhandled'
    if (hasBlocker()) return 'swallowed'
    return parent?.dispatchEscape() ?? 'unhandled'
  }

  const dispatchBackButton = (): DispatchOutcome => {
    const steps = planBackButton(stack, behaviors)
    if (execute(steps)) return 'handled'
    if (steps.some((step) => step.deferToPlatform)) return 'unhandled'
    if (hasBlocker()) return 'swallowed'
    return parent?.dispatchBackButton() ?? 'unhandled'
  }

  const dispatchOutsidePress = (point: Point, target: unknown): boolean => {
    const containerId = findContainerId(target, point)
    return execute(planOutsidePress(stack, containerId, behaviors))
  }

  const closeAll = (): boolean => {
    let handled = false
    // Child windows own visually higher layers, so close them newest/deepest
    // first. Snapshot both collections because callbacks may detach/push.
    for (const child of [...children].reverse()) {
      handled = child.closeAll() || handled
    }
    for (const entry of [...stack].reverse()) {
      handled = entry.fire('programmatic') || handled
    }
    return handled
  }

  const host: LayerHost = {
    name,
    parent,
    push,
    remove,
    getStack: () => stack,
    getTopEntry: () => stack.at(-1),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getChildren: () => children,
    attachChild: (child) => {
      // Reject self/cyclic attachment. A malformed host graph must not make
      // global input routing loop forever.
      if (child === host || hostTreeContains(child, host)) return
      if (!children.includes(child)) {
        children = Object.freeze([...children, child])
      }
    },
    detachChild: (child) => {
      children = Object.freeze(
        children.filter((candidate) => candidate !== child),
      )
    },
    closeAll,
    dismissTransient: (exceptId) =>
      execute(planTransientDisplacement(stack, exceptId ?? null, behaviors)),
    dispatchEscape,
    dispatchBackButton,
    dispatchOutsidePress,
  }

  return host
}
