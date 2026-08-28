/**
 * NATIVE dismissal-channel resolution (and the shared types for it).
 *
 * Approach B's mode resolution (report §6.2) is a web concern: the paired
 * `dismissChannel.web.ts` consults the capability registry there. Native
 * platforms have no browser instruments to delegate to, so every native
 * instance runs the kernel-managed machinery — this module is the
 * platform-split no-op that keeps the shared lifecycle hook compiling and
 * behaviorally inert off the web.
 */
import type { OverlayKind } from '../core/types'

/**
 * `managed`: the kernel's own listeners classify and route every dismissal
 * gesture (today's machinery). `delegated`: the browser runs the dismissal
 * contract and the instance self-reports platform outcomes to the kernel.
 */
export type DismissChannel = 'managed' | 'delegated'

export type DismissChannelSpec = Readonly<{
  kind: OverlayKind
  dismissable: boolean
  /** Whether the instance carries an `onDismissRequest` veto. */
  hasVeto: boolean
}>

export function resolveDismissChannel(_spec: DismissChannelSpec): DismissChannel {
  return 'managed'
}
