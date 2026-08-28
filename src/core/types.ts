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
  readonly dispatchEscape: () => DispatchOutcome
  readonly dispatchBackButton: () => DispatchOutcome
  readonly dispatchOutsidePress: (point: Point, target: unknown) => boolean
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
