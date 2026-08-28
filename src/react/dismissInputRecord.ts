/**
 * Best-effort dismissal-cause sniffing for browser-delegated closes.
 *
 * A delegated web instance (`web.dismissal` on Popover/Dialog/Drawer/Sheet)
 * lets the browser run light dismiss and close requests; the chrome then
 * learns of the outcome through a fait-accompli event (`toggle(closed)`,
 * dialog `close`) that carries no cause. The root dismiss listeners record
 * the last relevant user input here, and the self-reporting handlers map a
 * close that lands within a short window onto that input. Outside the
 * window the cause falls back to `escape` — the existing precedent for
 * browser-forced closes.
 *
 * This is heuristic by design (report §6.3): delegated instances are
 * required to be vetoless, so no `onDismissRequest` can observe the sniffed
 * cause — the public observable remains `onOpenChange(false)`.
 */
import type { DismissEvent } from '../core/types'

export type RecordedDismissInput = 'pointerdown' | 'escape'

/** Browser toggle/close events are queued tasks, not same-macrotask. */
const SNIFF_WINDOW_MS = 150

let lastInput: { kind: RecordedDismissInput; at: number } | null = null

export function recordDismissInput(kind: RecordedDismissInput): void {
  lastInput = { kind, at: Date.now() }
}

/**
 * Classify a browser-initiated close. `surface` names what closed: a press
 * that dismisses a `transient` (popover) is an outside press, while the
 * same press on a modal's backdrop is a backdrop press.
 */
export function sniffDismissCause(
  surface: 'transient' | 'modal',
): DismissEvent {
  if (lastInput && Date.now() - lastInput.at <= SNIFF_WINDOW_MS) {
    if (lastInput.kind === 'pointerdown') {
      return surface === 'modal' ? 'backdrop-press' : 'outside-press'
    }
    return 'escape'
  }
  return 'escape'
}

/** Test-only: forget any recorded input. */
export function resetDismissInputRecord(): void {
  lastInput = null
}
