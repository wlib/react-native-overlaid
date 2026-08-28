# Architecture direction

Dependencies point in one direction:

```text
components  ->  chrome  ->  react  ->  core
```

## Core

`src/core` is data and deterministic functions: lifecycle, behavior policy,
dismissal planning, layer-host execution, detent normalization, sheet gesture
decisions, native-sheet host transitions, and trigger hit testing. It accepts
platform facts as parameters and must remain runnable in plain Node.

The layer host owns mutable stack membership and subscriptions, but not policy:
planners return ordered steps, and the host executes those steps against live
entries. This keeps refusal/force behavior testable without pretending runtime
callbacks are pure.

## React kernel

`src/react` turns the core into stable hooks and contexts. One overlay root hook
assembles lifecycle state, actions, refs, ids, accessibility bags, and optional
anchored positioning. All dismissal sources ultimately call the same entry
function.

The host tree installs global listeners only at its root. Native Modal/sheet
windows attach child hosts; global dismissal starts at the deepest newest host
and delegates upward when unhandled.

On web, the kernel additionally resolves each instance's dismissal channel
once per mounted presentation (`resolveDismissChannel`): vetoless
dismissable instances delegate their user-gesture dismissal to the browser's
own instruments per kind × capability, and register as platform-channel
layer entries. The planners hand trusted gestures to those entries without
firing them (the browser acts; the chrome self-reports the outcome), route
untrusted (synthetic) gestures through the kernel unchanged — the browser is
inert to those — and keep displacement kernel-owned for both channels. A
delegated key gesture the platform never answers is reclaimed by the host
after a short beat; the already-dismissing guard absorbs any double.

The native portal is a small registry portal. Anchored children mount in the
host subtree for deterministic geometry. The single tradeoff—React context is
read at the host—is explicit and repairable with `useContextBridge`.

## Chrome

Chrome modules interpret kernel phases as platform operations and report real
platform events back as kernel signals. Native is the unsuffixed implementation;
web overrides use `.web.tsx`. Each nontrivial chrome documents its `Interprets`
and `Reports` contract at the top.

Web modal surfaces use `<dialog>` and anchored surfaces use `[popover]`. Native
modal surfaces use RN `Modal`; sheets use TrueSheet; anchored surfaces portal to
the nearest native window host. CSS/Animated/OS physics remain chrome concerns.

## Components

Components contain public props, defaults, composition, and semantic content.
They select a root specification plus chrome. Shared Trigger and Close parts are
small and policy-free. Compound and preset forms share the exact same internals.

## Improvements over the reference prototype

1. Build bundler-oriented ESM and declarations instead of asking consumers to
   transpile package source. A separate CommonJS graph is intentionally not
   published.
2. Use an explicit package export map, including CSS, and verify the tarball.
3. Make optional/platform peer behavior truthful. A native Sheet has a real
   TrueSheet peer requirement; web-only consumers do not execute its native
   implementation.
4. Centralize controllable-state handling and callback freshness, while
   preserving the kernel's immediate exit response to accepted user dismissal.
5. Validate low-common-denominator layout values and detent inputs in
   development with actionable diagnostics.
6. Narrow public style and render-prop types; avoid unbounded index signatures
   where React Native/web event bags can be represented directly.
7. Keep source modules smaller by extracting reusable accessibility actions,
   modal surface framing, and sheet drag bookkeeping only where doing so removes
   repeated rules.
8. Treat reduced motion and focus behavior as explicit chrome inputs rather than
   incidental animation details.
9. Maintain a parity matrix that maps every reference scenario to tests and/or
   examples in this repository.

## Invariants reviewers must protect

- `programmatic -> veto -> force -> dismissable -> dying guard` is the only
  dismissal precedence.
- A refusing modal blocks lower layers and platform defaults.
- A dying non-forced entry refuses so rapid repeated input can reach below it.
- Opening an auto layer displaces eligible unrelated transients exactly once.
- Presentation waits for every gate required by its kind.
- Reopening a still-mounted chrome carries satisfied gates.
- Native anchored coordinates use page space and subtract the portal host origin.
- OS-sheet dismissal is classified by machine state, never by the latest prop.
- Consumers interact with native sheet detents only through close/reopen.
- The role-bearing element owns the accessible name.
- One dismissal classification per user gesture: where a platform channel
  covers a gesture for an entry, the kernel stands down for it (trusted
  input), and any residual double delivery must be provably absorbed by the
  dying-guard and notify latch.
- An instance that can veto (`onDismissRequest`) or refuse
  (`dismissable={false}`) never delegates; the channel is snapshotted per
  presentation.
