/**
 * Explicit web escape hatches (design report §8, "Approach D").
 *
 * Each overlay family accepts an optional `web` namespace of typed,
 * web-only options. Absence of every member is exactly today's behavior;
 * the whole namespace is ignored on native (like `SlotOverride.className`).
 * Mode resolution is explicit consumer intent gated by capability and veto
 * rules — detection gates graceful fallback, it never *selects* a mode —
 * and every fallback names its reason in a dev `warnOnce`.
 */
import { useRef } from 'react'
import { Platform } from 'react-native'
import { hasWebCapability } from '../chrome/webCapabilities'
import type { WebDismissal } from '../react/overlayContext'
import { warnOnce } from './diagnostics'

export type PopoverWebOptions = {
  /**
   * `'managed'` (default): kernel-owned light dismiss (today's behavior).
   * `'browser'`: `popover="auto"` — the browser runs light dismiss, Escape,
   * and its auto-stack, and groups the popover with non-library popovers on
   * the page. Requires no `onDismissRequest` and `dismissable !== false`
   * (violations warn once in dev and fall back to `'managed'`), and falls
   * back to `'managed'` where the Popover API is unavailable.
   */
  dismissal?: 'managed' | 'browser' | undefined
  /**
   * `'floating'` (default): Floating UI. `'css-anchor'`: CSS Anchor
   * Positioning with `position-try` fallbacks; falls back to `'floating'`
   * when unsupported or when `boundaryRef` is set.
   */
  positioning?: 'floating' | 'css-anchor' | undefined
}

export type TooltipWebOptions = {
  /**
   * `'js'` (default): the hover-intent engine. `'interest'`: use
   * `interestfor`/`InterestEvent` as the input source when the browser
   * supports Interest Invokers AND the render-prop trigger is a real
   * `<button>`/`<a>`; otherwise warns once in dev and falls back to `'js'`.
   */
  intent?: 'js' | 'interest' | undefined
  /** See {@link PopoverWebOptions.positioning}. */
  positioning?: 'floating' | 'css-anchor' | undefined
}

export type ModalWebOptions = {
  /**
   * `'managed'` (default): today's cancel/close/backdrop machinery.
   * `'closedby'`: map to `<dialog closedby>` (`'any'` with a backdrop,
   * `'closerequest'` without) so the browser runs light dismiss and close
   * requests. Requires `dismissable` and no `onDismissRequest`; falls back
   * to `'managed'` (always, on Safari — `closedby` is Technology Preview
   * only there as of 2026-08).
   */
  dismissal?: 'managed' | 'closedby' | undefined
}

type DismissChannelInput = {
  component: 'Popover' | 'Dialog' | 'Drawer' | 'Sheet'
  /** The consumer's `web.dismissal` when it is a delegating value. */
  requested: 'browser' | 'closedby' | undefined
  open: boolean
  dismissable: boolean
  hasDismissRequestHandler: boolean
}

function resolveDismissChannel(input: DismissChannelInput): WebDismissal {
  if (input.requested === undefined || Platform.OS !== 'web') return 'managed'
  const option = `${input.component} web.dismissal='${input.requested}'`
  // R2: veto disables what it cannot survive. The browser's light dismiss
  // and close requests cannot be refused per gesture, so a vetoable or
  // non-dismissable instance must never delegate.
  if (input.hasDismissRequestHandler) {
    warnOnce(
      `${option} is ignored because onDismissRequest is set; the browser ` +
        `cannot consult a veto. Falling back to managed dismissal.`,
    )
    return 'managed'
  }
  if (!input.dismissable) {
    warnOnce(
      `${option} is ignored because dismissable={false}; the browser would ` +
        `dismiss anyway. Falling back to managed dismissal.`,
    )
    return 'managed'
  }
  const capability =
    input.requested === 'browser'
      ? ('popover' as const)
      : ('dialogClosedBy' as const)
  if (!hasWebCapability(capability)) {
    warnOnce(
      `${option} is unavailable in this browser (missing '${capability}' ` +
        `support). Falling back to managed dismissal.`,
    )
    return 'managed'
  }
  return 'delegated'
}

/**
 * Resolve the anchored position engine for the spec. `'css-anchor'` is
 * explicit consumer intent; capability and the boundaryRef limitation gate
 * graceful fallback to Floating UI (with a dev warning naming the reason),
 * they never select the engine. Returns `undefined` (today's default)
 * whenever the request does not survive the gates.
 */
export function resolveWebPositioning(
  component: 'Popover' | 'Tooltip',
  requested: 'floating' | 'css-anchor' | undefined,
  hasBoundary: boolean,
): 'floating' | 'css-anchor' | undefined {
  if (requested !== 'css-anchor' || Platform.OS !== 'web') return undefined
  const option = `${component} web.positioning='css-anchor'`
  if (hasBoundary) {
    warnOnce(
      `${option} is ignored because boundaryRef is set; CSS anchor ` +
        `positioning judges overflow against the containing block, not an ` +
        `arbitrary boundary. Falling back to Floating UI.`,
    )
    return undefined
  }
  if (!hasWebCapability('anchorPositioning')) {
    warnOnce(
      `${option} is unavailable in this browser (missing ` +
        `'anchorPositioning' support). Falling back to Floating UI.`,
    )
    return undefined
  }
  return 'css-anchor'
}

/**
 * Resolve and SNAPSHOT the dismissal channel per presentation, like the web
 * dialog's modal/modeless mode: the channel is recomputed while the overlay
 * is closed and held for the whole open cycle, so prop changes mid-flight
 * cannot flip an open instance between dismissal systems.
 */
export function useWebDismissChannel(input: DismissChannelInput): WebDismissal {
  const resolved = resolveDismissChannel(input)
  const snapshot = useRef(resolved)
  if (!input.open) snapshot.current = resolved
  return snapshot.current
}
