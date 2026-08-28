# Web escape hatches (the `web` prop)

Each overlay family accepts an optional, typed `web` namespace of web-only
options. **Absence of every member is exactly today's behavior**, the whole
namespace is ignored on native, and defaults never change — an app that
never passes `web` runs the same managed machinery as before.

Every option is _explicit consumer intent, gated by capability_: feature
detection decides only whether an opt-in can hold (falling back silently at
runtime, with a one-time dev warning naming the reason), never which mode a
default instance runs. Where an option delegates dismissal, veto rules gate
it too: the browser cannot consult `onDismissRequest` or honor
`dismissable={false}` per gesture, so such instances always resolve to
managed (R2: veto disables what it cannot survive).

```tsx
<Popover web={{ dismissal: 'browser', positioning: 'css-anchor' }}>…</Popover>
<Tooltip web={{ intent: 'interest' }} text="…">…</Tooltip>
<Dialog  web={{ dismissal: 'closedby' }} …>…</Dialog>   // also Drawer, Sheet
```

The resolved dismissal mode is **snapshotted per presentation** (like the
web dialog's modal/modeless mode): prop changes while an instance is open
take effect at its next presentation, never mid-flight.

## `PopoverWebOptions.dismissal: 'managed' | 'browser'`

|                 |                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Default         | `'managed'` — kernel-owned light dismiss (`popover="manual"` + the root listeners), exactly today's behavior.                                                                                                                                                            |
| Opt-in          | `'browser'` — `popover="auto"` shown via `showPopover({source})`: the **browser** runs light dismiss, Escape, and its auto stack; the chrome mirrors outcomes from the `toggle` event; the kernel's planners stand down for this layer (one classification per gesture). |
| Capability gate | the Popover API (`popover`). Missing → managed, dev warning.                                                                                                                                                                                                             |
| Veto gate       | requires no `onDismissRequest` and `dismissable !== false`. Violations → managed, dev warning.                                                                                                                                                                           |
| What you gain   | real light-dismiss grouping with non-library popovers on the page, browser-owned Escape ordering, native auto-stack displacement between delegated popovers.                                                                                                             |

Behavioral deltas you accept (by design):

- **Dismissal cause fidelity is best-effort.** The browser's `toggle(closed)`
  carries no cause; the library sniffs the last root-level input
  (pointerdown → `outside-press`, Escape → `escape`, otherwise `escape`).
  No delegated instance can have an `onDismissRequest` to observe this, so
  the public observable remains `onOpenChange(false)`.
- **No exit transition on browser-initiated closes.** The browser hides the
  surface at once (fait accompli); the kernel's exit phase still runs to
  completion, invisibly, before unmount.
- **Mixed-stack ordering is not defined.** Managed and delegated popovers
  open at the same time live in two dismissal systems: a browser gesture
  closes delegated chains atomically while the kernel walks managed layers,
  and opening a _managed_ popover does not displace an open _delegated_ one
  (the browser's auto stack only reacts to its own popovers). Prefer one
  mode per stack of simultaneously open transients.

## `PopoverWebOptions.positioning` / `TooltipWebOptions.positioning: 'floating' | 'css-anchor'`

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default         | `'floating'` — Floating UI (`offset`/`flip`/`shift` + `autoUpdate`), exactly today's behavior.                                                                                                                                                                                                                                                                                                                                                                                                             |
| Opt-in          | `'css-anchor'` — CSS Anchor Positioning: the trigger gets a per-instance `anchor-name` (plus the implicit anchor from `showPopover({source})`), and the panel renders `data-overlaid-anchored="css"` with `position-area` mapped from `placement`, `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline`, `position-try-order` on the placement axis, and `position-visibility: anchors-visible`. The mechanism lives in the `overlaid.positioning` stylesheet layer (see STYLING.md). |
| Capability gate | `anchorPositioning` (`anchor-name` + `position-area`). Missing → Floating UI, dev warning. `position-try-fallbacks`/`position-visibility` degrade individually (unknown declarations are ignored).                                                                                                                                                                                                                                                                                                         |
| Limitation gate | `boundaryRef` set → Floating UI, dev warning (CSS judges overflow against the containing block, not an arbitrary boundary element).                                                                                                                                                                                                                                                                                                                                                                        |
| What you gain   | frame-synced, compositor-driven placement with zero JS per scroll/resize (pays off mostly with `closeOnScroll={false}`), and stylesheet-overridable placement.                                                                                                                                                                                                                                                                                                                                             |

Behavioral deltas you accept (by design):

- **No continuous `shift()`.** CSS offers discrete flip/region fallbacks
  only; near viewport corners a panel can overhang where Floating UI would
  slide to stay pinned.
- **Sub-pixel placement differs** from the Floating UI engine, and browser
  fallback-stability heuristics differ between engines (Chrome vs Safari
  26.2 "last successful option").
- The anchor-gap offset is applied as margins on both sides of the
  placement axis, so a flipped fallback keeps its gap; the panel also
  stands off the viewport edge by the same amount.

## `TooltipWebOptions.intent: 'js' | 'interest'`

|                 |                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default         | `'js'` — the hover-intent engine (delay/warmth/grace timers), exactly today's behavior and the permanent primary path.                                                                                                                                                                                                                                |
| Opt-in          | `'interest'` — Interest Invokers: the trigger gets `interestfor`, and the browser's `interest`/`loseinterest` events (cancelable proposals) are canceled and routed into the kernel, which still owns open/close state, arbitration, and warmth accounting. All JS intent inputs (hover, focus, touch-toggle) stand down while the channel is active. |
| Capability gate | `interestFor` (Chromium 142+ only as of 2026-08; Safari is formally opposed). Missing → JS engine, dev warning.                                                                                                                                                                                                                                       |
| Element gate    | the render-prop trigger must be a real `<button>`, `<a href>`, or `<area>` — the attribute is invalid elsewhere (including the default `Pressable` trigger). Otherwise → JS engine, dev warning.                                                                                                                                                      |
| What you gain   | the platform's own intent timing (`interest-delay*` CSS control), platform-consistent touch (long-press) behavior.                                                                                                                                                                                                                                    |

Behavioral deltas you accept: hover timing is the browser's
(`interest-delay`, ~0.5 s default), not the `timing` prop's delay/warmth
model — sibling `'js'` tooltips still warm normally because warmth accounts
on open/close edges regardless of the input source. Because the tooltip
panel mounts on open but `interestfor` needs its target in the DOM, a
hidden placeholder `<span>` carries the panel id while closed.

## `ModalWebOptions.dismissal: 'managed' | 'closedby'` (Dialog, Drawer, Sheet)

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default         | `'managed'` — the cancel/close/backdrop machinery (prevented `cancel`, re-`showModal()` on refused closes, the library's own backdrop press classifier), exactly today's behavior.                                                                                                                                                                                                                                                                                                                  |
| Opt-in          | `'closedby'` — `<dialog closedby>`: `'any'` when the instance has a backdrop (browser light dismiss + close requests), `'closerequest'` without one (close requests only, matching modeless semantics). Never `'none'` — non-dismissable instances resolve to managed up front. For the delegated instance the manual backdrop classifier, the `onCancel` interception, and the refusal re-show retire; the `close` event self-reports with a sniffed cause. Sheet drag/detents stay library-owned. |
| Capability gate | `dialogClosedBy`. Missing → managed, dev warning — **always managed on Safari** (`closedby` is Technology Preview only, 2026-08).                                                                                                                                                                                                                                                                                                                                                                   |
| Veto gate       | requires no `onDismissRequest` and `dismissable !== false`. Violations → managed, dev warning.                                                                                                                                                                                                                                                                                                                                                                                                      |
| What you gain   | browser-owned close-request ordering (close watcher stack) and one less library-managed gesture channel for the instance.                                                                                                                                                                                                                                                                                                                                                                           |

Behavioral deltas: the same cause-fidelity and no-exit-transition notes as
delegated popovers (backdrop presses sniff as `backdrop-press`, Escape as
`escape`); a browser-closed dialog disappears at once rather than playing
the exit reveal.

## How delegation stays kernel-coherent

A delegated instance registers on the **platform channel** in the layer
stack. The arbitration planners (`planEscape`, `planOutsidePress`,
`planTransientDisplacement`) never fire platform-channel entries — those
layers self-report through their platform events (`toggle`, `close`), so
one physical gesture can never be classified twice for one layer. An
Escape that the platform owns is reported `unhandled` so the root listener
leaves the keydown unprevented (a prevented Escape would suppress the
browser's own close request). Managed layers in the same stack keep the
full kernel walk, including layers _below_ a delegated one on an outside
press.
