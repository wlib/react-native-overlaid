# react-native-overlaid: product contract

`react-native-overlaid` is a small, typed overlay system for React Native,
React Native Web, and ordinary React web applications. It provides Dialog,
Drawer, Sheet, Popover, and Tooltip on one predictable lifecycle and stacking
model while deliberately allowing each platform to render native-appropriate
chrome.

The original prototype is a behavioral reference, not a code template. The new
package must reach parity with its public behavior and then improve its
packaging, API precision, internal cohesion, and failure modes.

## Required public behavior

- One `OverlayHost` at the application root.
- Dialog, Drawer, Sheet, Popover, and Tooltip components with preset and
  compound APIs matching the prototype's documented capabilities.
- Controlled Dialog/Drawer/Sheet; controlled or uncontrolled Popover; internal
  state for Tooltip.
- Central dismissal arbitration for Escape, Android back, outside press,
  backdrop press, scroll, swipe, and programmatic close.
- Modal, auto, and hint policies, including the intentional asymmetries:
  hints answer Escape but not Android back, and hints do not displace popovers.
- Nested overlays unwind top-down and do not dismiss ancestors when interacting
  inside descendants.
- `dismissable={false}`, forced transient displacement, and
  `onDismissRequest` use one documented precedence order.
- Exit animations retain mounted content until completion and support reopen
  during exit without losing one-shot presentation signals.
- Web uses `<dialog>` and the Popover API where available, with honest fallbacks.
- Native uses RN `Modal`, a per-window host/portal pair, and TrueSheet for a
  system-owned sheet.
- Cross-platform detents, web sheet drag/snap/dismiss physics, scroll
  arbitration, anchor positioning, safe-area inputs, focus restoration, and
  accessibility semantics.
- Router/debug integration through a subscribable layer stack and `closeAll()`.
- Context bridging for native anchored content rendered at the portal host.

## Quality bar

- Pure `core/` modules have no React, DOM, or React Native imports.
- Public APIs are explicit and documented; internal helpers are not exported by
  accident.
- State machines and arbitration policies are exhaustive and table-tested.
- Platform divergences are visible in filenames and contracts, not buried in
  scattered `Platform.OS` branches.
- No user dismissal can double-notify, get swallowed by a dying layer, or leave
  the rendered platform surface out of sync with the kernel.
- StrictMode, stale async measurements, host remounts, malformed parent cycles,
  and reopen-during-exit are first-class test cases.
- The published package has a real build, declarations, conditional exports,
  a minimal file set, peer dependency declarations, and pack verification.
- The implementation should stay compact enough to understand as a system;
  abstractions must remove policy duplication rather than merely move code.

## Non-goals

- A universal visual design system.
- Reimplementing native sheet physics in JavaScript.
- Hiding genuine web/native capability differences behind misleading props.
- Owning safe-area, navigation, gesture-handler, or animation-library policy for
  the consuming application.

## Acceptance

The project is ready only when typecheck, unit/integration tests, build, and
package verification pass; all five overlay families have representative web
and native tests; prototype scenarios are accounted for in a parity matrix; and
two independent review passes find no unresolved correctness or API-blocking
issues.
