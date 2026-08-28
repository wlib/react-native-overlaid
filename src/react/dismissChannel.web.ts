/**
 * WEB dismissal-channel resolution (Approach B, report §6.2).
 *
 * A vetoless, dismissable instance hands its dismissal contract to the
 * browser wherever the platform can run the whole contract for its kind;
 * everything else stays on the kernel-managed machinery. R2 is enforced by
 * construction: an `onDismissRequest` veto or `dismissable={false}` forces
 * `managed`, because the platform channels cannot be refused or reliably
 * re-asserted. The caller snapshots the result once per mounted
 * presentation (like the dialog's modal/modeless mode), so prop flips take
 * effect on the next presentation rather than re-wiring a live surface.
 */
import { hasWebCapability } from '../chrome/webCapabilities'
import { assertNever } from '../core/types'
import type { DismissChannel, DismissChannelSpec } from './dismissChannel'

export type { DismissChannel, DismissChannelSpec }

export function resolveDismissChannel(spec: DismissChannelSpec): DismissChannel {
  if (spec.hasVeto || !spec.dismissable) return 'managed'
  switch (spec.kind) {
    case 'popover':
      return hasWebCapability('popover') ? 'delegated' : 'managed'
    case 'tooltip':
      return hasWebCapability('popover') && hasWebCapability('popoverHint')
        ? 'delegated'
        : 'managed'
    case 'dialog':
    case 'drawer':
    case 'sheet':
      // Safari ships closedby in Technology Preview only: it runs managed
      // modals until that changes, exactly like today.
      return hasWebCapability('dialogClosedBy') ? 'delegated' : 'managed'
    default:
      return assertNever(spec.kind)
  }
}
