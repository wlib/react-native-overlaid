/**
 * Best-effort dismissal-cause sniffing for delegated (platform-channel)
 * instances.
 *
 * A browser-initiated close surfaces as a queued `toggle`/`close` task, so
 * the platform event can never observe the causing input directly — and a
 * "same macrotask" match can never succeed. Instead the root listeners
 * record the last dismissal-shaped input and the platform handlers map a
 * close arriving within a short window onto `outside-press`/`escape`,
 * falling back to the browser-forced-close precedent otherwise. The cause
 * is unobservable through the public API for delegated instances (they are
 * vetoless by construction, §6.4), so this fidelity is internal.
 */
import type { DismissEvent } from '../core/types'

export type RecordedDismissInput = 'pointerdown' | 'escape'

/** Queued `toggle`/`close` tasks land well inside this window. */
export const DISMISS_SNIFF_WINDOW_MS = 150

let lastInput: { kind: RecordedDismissInput; at: number } | null = null

export function recordDismissInput(kind: RecordedDismissInput): void {
  lastInput = { kind, at: Date.now() }
}

export function sniffDismissCause(fallback: DismissEvent): DismissEvent {
  if (lastInput && Date.now() - lastInput.at <= DISMISS_SNIFF_WINDOW_MS) {
    return lastInput.kind === 'pointerdown' ? 'outside-press' : 'escape'
  }
  return fallback
}

/** Test-only: forget any recorded input. */
export function resetDismissInputRecord(): void {
  lastInput = null
}
