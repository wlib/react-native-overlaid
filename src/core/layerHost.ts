import {
  planBackButton,
  planEscape,
  planOutsidePress,
  planTransientDisplacement,
  type Step,
} from './arbitration'
import { BEHAVIOR, type BehaviorTable } from './behaviorPolicy'
import type {
  DispatchOptions,
  DispatchOutcome,
  LayerEntry,
  LayerHost,
  Point,
} from './types'

/**
 * How long a delegated key gesture may go unanswered before the kernel
 * reclaims it (see scheduleDelegatedKeyFallback). Long enough for any real
 * close request to have landed (they run in the same event turn; the
 * reporting toggle/close is one queued task), short enough that a genuinely
 * dead key still feels responsive.
 */
export const DELEGATED_KEY_FALLBACK_MS = 200

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

  type Execution = Readonly<{ handled: boolean; delegated: boolean }>

  const execute = (steps: readonly Step[]): Execution => {
    let handled = false
    for (const step of steps) {
      // A delegated step hands the rest of the gesture to the platform: the
      // entry self-reports through its own channel and nothing below it may
      // receive the same gesture from the kernel.
      if (step.delegated) return { handled, delegated: true }
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
    return { handled, delegated: false }
  }

  const hasBlocker = (): boolean =>
    stack.some((entry) => behaviors[entry.behavior].blocksBelow)

  // Right of first refusal, not blind trust: when a key gesture is handed
  // to a platform-channel entry, the browser normally dismisses it within
  // the same event turn. Some environments deliver trusted key events whose
  // UA close-request handling never runs (observed with CDP-style key
  // injection), which would leave the key dead. The fallback re-fires the
  // planned event at the same entry after a beat; if the platform did act,
  // the entry is dying (fire refuses via the already-dismissing guard) or
  // already unregistered, so the double delivery is absorbed by design.
  const scheduleDelegatedKeyFallback = (steps: readonly Step[]): void => {
    const delegated = steps.find((step) => step.delegated)
    if (!delegated) return
    setTimeout(() => {
      const entry = stack.find((candidate) => candidate.id === delegated.id)
      entry?.fire(delegated.event)
    }, DELEGATED_KEY_FALLBACK_MS)
  }

  const dispatchEscape = (options?: DispatchOptions): DispatchOutcome => {
    const trusted = options?.trusted ?? true
    const steps = planEscape(stack, behaviors, trusted)
    const result = execute(steps)
    if (result.handled) return 'handled'
    // A delegated layer owns this gesture: the platform will act on it, so
    // the kernel must neither swallow the input (its default action IS the
    // dismissal) nor route the same gesture into a parent host.
    if (result.delegated) {
      scheduleDelegatedKeyFallback(steps)
      return 'unhandled'
    }
    if (hasBlocker()) return 'swallowed'
    return parent?.dispatchEscape(options) ?? 'unhandled'
  }

  const dispatchBackButton = (options?: DispatchOptions): DispatchOutcome => {
    const trusted = options?.trusted ?? true
    const steps = planBackButton(stack, behaviors, trusted)
    const result = execute(steps)
    if (result.handled) return 'handled'
    if (result.delegated) {
      scheduleDelegatedKeyFallback(steps)
      return 'unhandled'
    }
    if (hasBlocker()) return 'swallowed'
    return parent?.dispatchBackButton(options) ?? 'unhandled'
  }

  const dispatchOutsidePress = (
    point: Point,
    target: unknown,
    options?: DispatchOptions,
  ): boolean => {
    const containerId = findContainerId(target, point)
    const trusted = options?.trusted ?? true
    return execute(planOutsidePress(stack, containerId, behaviors, trusted))
      .handled
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
      execute(planTransientDisplacement(stack, exceptId ?? null, behaviors))
        .handled,
    dispatchEscape,
    dispatchBackButton,
    dispatchOutsidePress,
  }

  return host
}
