# Backlog

Follow-ups from the 0.2.0 web-layer review, in rough priority order.

1. **`styling="none"` should not break positioning.** The motion layer
   currently carries functional pieces (popover/tooltip
   `translate3d(var(--overlaid-x), var(--overlaid-y))`, sheet
   transform/height realization, drawer slide geometry), so opting out of
   styling silently loses placement until the consumer restates one line of
   CSS. Move those into a functional sublayer that `styling="none"` keeps,
   and update `docs/STYLING.md`.
2. **`useExitTransition` subscription timing.** The dismissing-phase
   subscription is a passive effect; a `transitionrun` dispatched between
   commit and subscription is missed and degrades to the two-frame/ceiling
   path (clipped exit, never a hang). Evaluate `useLayoutEffect`.
3. **Layering hygiene.** `react/useAnchoredPosition.web.ts` imports
   `chrome/webCapabilities`, inverting the documented
   `components → chrome → react → core` direction. Move `webCapabilities`
   to `src/react/` or a new `src/platform/`.
4. **Consolidate Tooltip's Escape listener.** Each Tooltip instance installs
   its own document-level capture `keydown` to cancel a pending hover-open;
   one shared listener suffices.
5. **styles.css readability.** Factor the repeated
   `:not([data-overlaid-styling='none'])` guards (e.g. one guarded ancestor
   pattern per layer).
6. **Stabilize `signals` identity.** Chrome show effects re-run whenever the
   context's `signals` object identity changes with the phase. Correctness
   no longer depends on it (the show branch is keyed on `isOpen`), but
   stabilizing the identity in `useOverlayLifecycle` stops redundant effect
   churn.
7. **Explicit web escape hatches (the next capability wave).** Per-instance
   `web` props delivering browser-delegated dismissal, Interest-Invoker
   input, and broader CSS-anchor use — the `approach-d` branch holds the
   right API surface and type tests; the `approach-b` branch holds the right
   internals (trust-gated arbitration stand-down, geometry-correct `closedby`
   mapping, kernel-routed `cancel`). Ship option-by-option:
   `positioning: 'css-anchor'` first, `intent: 'interest'` only after
   real-browser verification of the InterestEvent state machine.
