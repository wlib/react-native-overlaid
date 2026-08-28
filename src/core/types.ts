/** Data contracts shared by the framework-free overlay kernel. */

export type OverlayKind = 'dialog' | 'sheet' | 'drawer' | 'popover' | 'tooltip'

/** Stacking and dismissal behavior, independent of visual presentation. */
export type Behavior = 'modal' | 'auto' | 'hint'

export type OverlayRole = 'dialog' | 'tooltip'

export type DismissEvent =
  | 'backdrop-press'
  | 'escape'
  | 'outside-press'
  | 'scroll'
  | 'swipe-down'
  | 'back-button'
  | 'programmatic'

export type Phase = 'unmounted' | 'mounting' | 'presented' | 'dismissing'

/** One-shot platform signals that may gate presentation. */
export type PresentGate = 'hostShown' | 'layoutReady'

export type LifecycleState =
  | { readonly phase: 'unmounted' }
  | {
      readonly phase: 'mounting'
      readonly hostShown: boolean
      readonly layoutReady: boolean
    }
  | { readonly phase: 'presented' }
  | {
      readonly phase: 'dismissing'
      /** Whether the consumer is still owed `onOpenChange(false)`. */
      readonly notify: boolean
      /** Satisfied gates survive a reopen while chrome remains mounted. */
      readonly hostShown: boolean
      readonly layoutReady: boolean
    }

export type Point = Readonly<{ x: number; y: number }>
export type Bounds = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

/** Framework-independent ref shape; the core only reads `current`. */
export type NodeRef = { readonly current: unknown }

export interface LayerEntry {
  readonly id: string
  readonly behavior: Behavior
  readonly parentEntryId: string | null
  /**
   * Which instrument owns this entry's user-gesture dismissal. `platform`
   * entries self-report through their own platform events (popover `toggle`,
   * dialog `cancel`/`close`), so the planners must not fire a trusted
   * gesture at them a second time (R1). Absent means `managed`.
   */
  readonly channel?: 'managed' | 'platform' | undefined
  readonly panelRef: NodeRef
  readonly triggerRef: NodeRef
  /** Last synchronous page-space bounds, used by non-DOM outside presses. */
  readonly boundsRef?: { readonly current: Bounds | null }
  readonly fire: (
    event: DismissEvent,
    options?: Readonly<{ force?: boolean }>,
  ) => boolean
}

/**
 * `swallowed` means a blocker refused the input but still owns it, so the
 * platform default must not run (notably a web dialog's native cancel).
 */
export type DispatchOutcome = 'handled' | 'swallowed' | 'unhandled'

/**
 * Untrusted (synthetic) input never triggers the browser's own light
 * dismiss or close watchers, so platform-channel delegation only stands
 * down the kernel for `trusted` gestures. Omitted means trusted.
 */
export type DispatchOptions = Readonly<{ trusted?: boolean }>

export interface LayerHost {
  readonly name: string
  readonly parent: LayerHost | null
  readonly push: (entry: LayerEntry) => void
  readonly remove: (id: string) => void
  readonly getStack: () => readonly LayerEntry[]
  readonly getTopEntry: () => LayerEntry | undefined
  readonly subscribe: (listener: () => void) => () => void
  readonly getChildren: () => readonly LayerHost[]
  readonly attachChild: (child: LayerHost) => void
  readonly detachChild: (child: LayerHost) => void
  readonly closeAll: () => boolean
  readonly dismissTransient: (exceptId?: string | null) => boolean
  readonly dispatchEscape: (options?: DispatchOptions) => DispatchOutcome
  readonly dispatchBackButton: (options?: DispatchOptions) => DispatchOutcome
  readonly dispatchOutsidePress: (
    point: Point,
    target: unknown,
    options?: DispatchOptions,
  ) => boolean
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
