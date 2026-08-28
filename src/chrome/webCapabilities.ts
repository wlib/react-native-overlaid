/**
 * Web capability registry (foundation F1).
 *
 * One lazy, memoized detector per platform feature the web chrome can lean
 * on, plus a single test/dev override point. Every check guards its globals
 * so this module is importable in Node and jsdom. Chrome code must consult
 * `hasWebCapability` instead of sniffing prototypes at module scope, so the
 * jsdom suites and the Storybook `overlaid-caps` query hook can pin either
 * side of a capability without re-importing modules.
 *
 * `showPopover({ source })` has no entry on purpose: engines that predate
 * the options bag ignore it, so it is passed unconditionally.
 */

export type WebCapability =
  | 'popover' // HTMLElement.prototype.showPopover/hidePopover
  | 'popoverHint' // <div popover="hint"> reflects 'hint' (invalid-value default is 'manual')
  | 'anchorPositioning' // CSS anchor-name + position-area
  | 'positionTryFallbacks' // CSS position-try-fallbacks
  | 'positionVisibility' // CSS position-visibility
  | 'discreteTransitions' // transition-behavior: allow-discrete + @starting-style
  | 'overlayProperty' // CSS overlay (Chromium-only as of 2026-08)
  | 'dialogClosedBy' // <dialog closedby>
  | 'dialogRequestClose' // HTMLDialogElement.prototype.requestClose
  | 'interestFor' // Interest Invokers (interestfor attribute)
  | 'interestDelayCss' // CSS interest-delay-start/-end

export const WEB_CAPABILITIES: readonly WebCapability[] = [
  'popover',
  'popoverHint',
  'anchorPositioning',
  'positionTryFallbacks',
  'positionVisibility',
  'discreteTransitions',
  'overlayProperty',
  'dialogClosedBy',
  'dialogRequestClose',
  'interestFor',
  'interestDelayCss',
]

function supportsCss(declaration: string): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports(declaration)
  )
}

const detectors: Record<WebCapability, () => boolean> = {
  popover: () =>
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function',
  popoverHint: () => {
    if (typeof document === 'undefined' || !detectors.popover()) return false
    // Reflection check: an engine without hint support falls back to the
    // invalid-value default ('manual'), which is exactly the wanted
    // degradation for panels that pass the attribute through anyway.
    const probe = document.createElement('div')
    probe.setAttribute('popover', 'hint')
    return (probe as { popover?: string | null }).popover === 'hint'
  },
  anchorPositioning: () =>
    supportsCss('anchor-name: --x') && supportsCss('position-area: top'),
  positionTryFallbacks: () => supportsCss('position-try-fallbacks: flip-block'),
  positionVisibility: () => supportsCss('position-visibility: no-overflow'),
  discreteTransitions: () =>
    supportsCss('transition-behavior: allow-discrete') &&
    typeof (globalThis as { CSSStartingStyleRule?: unknown })
      .CSSStartingStyleRule !== 'undefined',
  overlayProperty: () => supportsCss('overlay: auto'),
  dialogClosedBy: () =>
    typeof HTMLDialogElement !== 'undefined' &&
    'closedBy' in HTMLDialogElement.prototype,
  dialogRequestClose: () =>
    typeof HTMLDialogElement !== 'undefined' &&
    typeof HTMLDialogElement.prototype.requestClose === 'function',
  interestFor: () =>
    typeof HTMLButtonElement !== 'undefined' &&
    'interestForElement' in HTMLButtonElement.prototype,
  interestDelayCss: () => supportsCss('interest-delay-start: 0.5s'),
}

const memo = new Map<WebCapability, boolean>()
let overrides: Partial<Record<WebCapability, boolean>> | null = null

export function hasWebCapability(capability: WebCapability): boolean {
  const overridden = overrides?.[capability]
  if (overridden !== undefined) return overridden
  const cached = memo.get(capability)
  if (cached !== undefined) return cached
  let detected = false
  try {
    detected = detectors[capability]()
  } catch {
    detected = false
  }
  memo.set(capability, detected)
  return detected
}

/**
 * Test/dev-only injection: pin capabilities on or off regardless of what the
 * environment detects; `null` restores detection. The only mutation point —
 * it also clears the detection memo so a pin never reads a stale result.
 */
export function setWebCapabilityOverrides(
  next: Partial<Record<WebCapability, boolean>> | null,
): void {
  overrides = next
  memo.clear()
}
