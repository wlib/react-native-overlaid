# react-native-overlaid

Predictable Dialog, Drawer, Sheet, Popover, and Tooltip primitives for React
Native, React Native Web, and React web applications. The five families share
one lifecycle and stacking policy while rendering with platform-appropriate
chrome: `<dialog>` and the Popover API on web, RN `Modal` and TrueSheet on
native.

## Install

Install the package with the peers used by your target. Web still installs
`react-native` for its shared runtime/type contract, but does not need
TrueSheet as long as its resolver selects the package's `.web.*` modules:

```sh
npm install react-native-overlaid react

# Web / React Native Web
npm install react-dom react-native react-native-web @floating-ui/react-dom

# Native
npm install react-native @lodev09/react-native-true-sheet
```

Native Sheet requires React Native 0.81 or newer, the New Architecture
(Fabric), React 19.1.4 or newer, Node 20.19.4 or newer, Xcode 26.1 or newer for
iOS, and TrueSheet 3.11. Expo users need SDK 54 or newer. TrueSheet contains
native code: re-run CocoaPods/prebuild and rebuild the iOS/Android application
after installing it. Expo projects need a development build, not Expo Go, for
`Sheet`. Web-only consumers may use React 18.2 or newer; with React 18, pin a
compatible React Native type/runtime contract such as `react-native@^0.76`.
Native targets and React 19 web targets can use React Native 0.81 or newer.

Import the web stylesheet once in the web entry — it carries the UA resets,
the default surface visuals, and the reveal transitions (all inside cascade
layers, so your own CSS wins; see [docs/STYLING.md](./docs/STYLING.md)):

```tsx
import 'react-native-overlaid/styles.css'
```

Then place one host around the application:

```tsx
import { OverlayHost } from 'react-native-overlaid'

export function Root() {
  return (
    <OverlayHost>
      <App />
    </OverlayHost>
  )
}
```

See [examples/basic-overlays.tsx](./examples/basic-overlays.tsx) for all five
families.

## Web bundler requirement

This package uses React Native platform extensions internally. Metro/Expo
select `.web.*` files when targeting web. An ordinary web bundler must:

1. alias `react-native` to `react-native-web`; and
2. resolve `.web.js` before `.js` for built dependencies (plus `.web.tsx` /
   `.web.ts` before unsuffixed TypeScript if opting into the package's `source`
   condition).

For example, the important resolver shape is:

```ts
resolve: {
  alias: { 'react-native': 'react-native-web' },
  extensions: [
    '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
    '.tsx', '.ts', '.jsx', '.js',
  ],
}
```

The exact syntax belongs to your bundler. Do not treat an ordinary React web
setup as zero-config: resolving the unsuffixed native files on web imports RN
`Modal`/TrueSheet chrome and will fail or behave incorrectly.

The default package condition exposes bundler-oriented ES modules at
`lib/module/index.js` and declarations at `lib/typescript/index.d.ts`. The
`react-native` condition resolves the same built runtime; only the opt-in
`source` condition resolves `src/index.ts`. The export map also exposes
`react-native-overlaid/styles.css`; there is currently no separate `require`
export. Applications should import only the public package entry and CSS
subpath, not `src/**` or `lib/**` internals.

## Shared behavior

Dialog, Drawer, and Sheet are controlled. Popover is controlled when `open` is
provided and otherwise owns its state. Tooltip owns interaction state.

User dismissal starts the exit immediately and calls `onOpenChange(false)`
once; mounted content remains for its exit animation. Update controlled state
when called. Programmatic close always succeeds. For user events the precedence
is:

```text
onDismissRequest veto → forced displacement → dismissable → already exiting
```

`onDismissRequest` is not called for programmatic close. Returning `false`
also vetoes forced Popover displacement. `dismissable={false}` refuses Escape,
backdrop/outside press, scroll, swipe, and Android back, but explicit Close
parts and `open={false}` still close.

The callback receives a `DismissEvent`: `'backdrop-press'`, `'escape'`,
`'outside-press'`, `'scroll'`, `'swipe-down'`, `'back-button'`, or
`'programmatic'`. Public user interception never receives `'programmatic'`;
that member is used by the shared kernel and custom integrations.

Stacking is host-driven. Escape, Android back, and outside press walk newest to
oldest; modal blockers prevent input reaching the page below. A descendant
Popover closes before its parent Dialog, and interacting inside the descendant
does not dismiss the ancestor. Opening a Popover displaces unrelated transient
layers (even non-dismissable ones unless they veto); showing a Tooltip never
displaces a deliberate Popover. Tooltips answer Escape but do not consume
Android back.

## Common props

The controlled families share `open`, `onOpenChange`, `dismissable`, and
`onDismissRequest`. Visual and geometry inputs are:

- `accessibilityLabel`: names a role-bearing surface when there is no visible
  title.
- `surface`: `{ style, className }`; `className` is web-only.
- `layout`: portable `width`, `maxWidth`, `minWidth`, `maxHeight`, `minHeight`,
  and numeric `horizontalPadding`. Dimension values are non-negative numbers or
  percentages such as `'80%'`, never `vh`, `rem`, or `calc()`.
- `insets`: numeric `{ top?, bottom? }` safe-area values.

Development builds warn about unsupported layout values and invalid detents.
Whether a web Dialog or Drawer uses a modal or modeless host is captured when
that presentation starts. Close and reopen after changing `backdrop` between
`false` and a visible backdrop.

### Dialog

```tsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Publish changes?"
  description="Everyone with access will see them."
>
  <Actions />
</Dialog>
```

- `title` and `description` render visible, linked accessible text.
- `showCloseButton` defaults to `true`; `closeLabel` names it.
- `backdrop` accepts a slot override or `false`; `unstyled` removes surface
  defaults.
- Compound parts: `Dialog.Root`, `.Trigger`, `.Content`, `.Body`, `.Title`,
  `.Description`, and `.Close`.

The surface is bounded by `layout.maxHeight` (default 90% of the viewport)
and clips; it does not scroll itself. The preset wraps its content in
`Dialog.Body`, the scrolling region, so the built-in Close stays pinned to
the surface. Compound consumers whose content can overflow should place a
`Dialog.Body` (or their own scroll container) inside `Dialog.Content` and
keep `Dialog.Close` outside it.

A non-dismissable dialog still gets the default Close button. If you turn it
off, provide another programmatic close control to avoid trapping keyboard and
screen-reader users.

### Drawer

```tsx
<Drawer open={open} onOpenChange={setOpen} side="left">
  <Navigation />
</Drawer>
```

- `side` is `'left'` or `'right'` and defaults to `'right'`.
- `showCloseButton` defaults to `true`; `closeLabel` names it.
- `backdrop={false}` uses a modeless `<dialog>.show()` host on web, so empty
  space is pointer-transparent and the page remains interactive for an
  inspector workflow. Native still uses RN `Modal`; do not assume identical
  touch-through behavior there.
- `unstyled`, `surface`, and `layout` style/size the panel.
- Compound parts: `Drawer.Root`, `.Trigger`, `.Content`, and `.Close`.

### Sheet

```tsx
<Sheet
  open={open}
  onOpenChange={setOpen}
  detents={['content', '66%', 'full']}
  initialDetent={1}
>
  <Sheet.ScrollView>{rows}</Sheet.ScrollView>
</Sheet>
```

- `detents` accepts positive pixel/fraction numbers, `'NN%'`, `'content'`, or
  `'full'` (maximum three after sorting/deduplication). The default is
  `['content']`.
- `initialDetent` indexes the caller's input order and is remapped after sort.
- `handle` defaults to `true`; `showCloseButton` defaults to `false` and
  `closeLabel` names the optional button.
- `scrim={false}` disables dimming but does not make the Sheet modeless. Its
  color/opacity/class are web-only because native dimming is OS-owned.
- On web, touch and pen dragging starts from the handle; a mouse can drag the
  panel body when nested scrolling does not claim the gesture.
- Compound parts: `Sheet.Root`, `.Trigger`, `.Content`, `.Close`, and
  `.ScrollView`.

Detents are presentation inputs. Close and reopen to change `detents` or
`initialDetent`; live changes while open are unsupported. Use
`Sheet.ScrollView`, especially with an intrinsic native detent: it bounds
content, enables Android nested scrolling, and applies the bottom inset.
Native outer sheet material, corners, and gesture physics remain OS-owned;
`surface` primarily styles content and web chrome. Sheet has no `unstyled` or
`backdrop` prop.

TrueSheet cannot synchronously ask JavaScript to approve a native swipe or
backdrop dismissal. When a native Sheet has `onDismissRequest`, the package
therefore disables those OS-initiated dismissals so they cannot bypass the
veto. Routed Android back still calls the interceptor; web drag/backdrop events
also call it. Use an explicit Close action after any confirmation flow.

### Popover

```tsx
<Popover placement="bottom-start" offset={8}>
  <Popover.Trigger>
    <Text>Filters</Text>
  </Popover.Trigger>
  <Popover.Content>
    {({ close }) => <Filters onApply={close} />}
  </Popover.Content>
</Popover>
```

- `open` and `onOpenChange` are optional; omit `open` for trigger-toggled
  uncontrolled state.
- `placement` and `offset` control Floating UI placement.
- `closeOnScroll` defaults to `true`; scrolls inside the panel are exempt.
- `dismissable`, `onDismissRequest`, `accessibilityLabel`, `insets`, and
  `contextBridge` apply to the anchored panel.
- `Popover.Content` accepts a node or `({ close }) => node`, plus `unstyled`,
  `className`, and `style`.
- Compound parts: `Popover.Root`, `.Trigger`, and `.Content`.

### Tooltip

```tsx
<Tooltip text="Copied to the clipboard">
  <Text>Copy</Text>
</Tooltip>
```

- Provide plain `text` or rich `content`. With rich content, also provide an
  `accessibilityLabel` so native can expose a useful trigger hint.
- `placement`, `boundaryRef`, `closeOnScroll`, `insets`, and `contextBridge`
  control anchored behavior.
- `unstyled`, `surfaceStyle`, and `textStyle` customize appearance.
- `timing` (web-only) tunes hover intent: `{ delay, warmth }`. The first
  hover in a host waits `delay` ms (default 400; `false` opens immediately —
  the previous behavior); for `warmth` ms after any tooltip in the same
  `OverlayHost` closes (default 700; `false` disables), hover opens
  instantly, so sweeping across a toolbar feels immediate. Focus-open and
  touch/pen-toggle are always instant regardless of `timing`.
- `children` is a trigger element or a render function receiving typed ref,
  interaction, open-state, and accessibility props.

Tooltip has no public `open`, `dismissable`, or dismissal-veto props. Web opens
for mouse hover (after the intent delay) or focus and toggles for touch/pen;
native toggles on tap.

### Trigger and Close parts

`OverlayTrigger` and compound `.Trigger` accept a child element or render
function. Render props include `ref`, `onPress`, `isOpen`, and accessibility
attributes. The default wrapper is a `Pressable`.

`OverlayClose` and compound `.Close` accept a custom child, `style`,
`textStyle`, and `accessibilityLabel`; the default glyph is a dependency-free
`✕`. Close is programmatic and therefore bypasses user-dismissal vetoes.

## Safe areas

Native modal and sheet windows cannot inherit an app-window `SafeAreaView`.
Read inset numbers at the root, for example with
`react-native-safe-area-context`, and pass them to the overlay:

```tsx
const safe = useSafeAreaInsets()
<Drawer insets={{ top: safe.top, bottom: safe.bottom }} {...props} />
```

The package takes no safe-area dependency. See
[examples/safe-area.tsx](./examples/safe-area.tsx) and the exact platform
behavior in [docs/PLATFORM-DIVERGENCES.md](./docs/PLATFORM-DIVERGENCES.md).

## Web escape hatches

On web, each family accepts an optional typed `web` prop for opting single
instances into browser-native machinery — `dismissal: 'browser'`
(`popover="auto"` light dismiss) and `positioning: 'css-anchor'` on
Popover, `intent: 'interest'` and `positioning` on Tooltip, and
`dismissal: 'closedby'` (`<dialog closedby>`) on Dialog/Drawer/Sheet:

```tsx
<Popover web={{ dismissal: 'browser', positioning: 'css-anchor' }}>…</Popover>
```

Defaults never change, the prop is ignored on native, and every opt-in
falls back to today's managed behavior where the browser lacks the
capability or the instance can veto dismissal (with a one-time dev warning
naming the reason). Capability gates, fallbacks, and the exact behavioral
deltas are documented in [docs/WEB-OPTIONS.md](./docs/WEB-OPTIONS.md).

## Native context bridge

Native Popover and Tooltip panels render at the nearest portal host, so by
default they read React context at the host position. Other public surfaces,
and all web surfaces, retain source context. Bridge the contexts an anchored
native panel needs:

```tsx
const Bridge = useContextBridge(ThemeContext, FormContext)
<Popover contextBridge={Bridge}>{/* trigger and content */}</Popover>
```

The context list and order must be stable. See
[examples/context-bridge.tsx](./examples/context-bridge.tsx) and
[docs/RENDER-TREES.md](./docs/RENDER-TREES.md).

## Router and debugging integration

`useLayerStack()` subscribes to an immutable snapshot of the nearest host.
`useLayerHost()` exposes that host, including `closeAll()`, which closes nested
window hosts before their owning layers. Call it before committing navigation
when overlays should not survive a route change:

```tsx
const host = useLayerHost()
host.closeAll()
```

The hooks must run below `OverlayHost`. A focused adapter is in
[examples/router-integration.tsx](./examples/router-integration.tsx).

## Accessibility checklist

- Give every Dialog a visible `title` or `accessibilityLabel`.
- Give Drawer, Sheet, and Popover an `accessibilityLabel` when their content
  does not name the surface clearly.
- Give rich Tooltip content an `accessibilityLabel`.
- Keep an explicit programmatic close action in every non-dismissable modal.
- Forward Trigger render props, especially `ref`, interaction handlers, and
  accessibility attributes, to the actual interactive element.
- Test focus restoration, Escape, Android back, and screen-reader traversal on
  the real target platform.

## Troubleshooting

**The web bundle imports `Modal`, TrueSheet, or other native chrome.** Your
resolver selected unsuffixed files. Put `.web.*` before the corresponding
unsuffixed extension and alias `react-native` to `react-native-web`.

**Web surfaces are unstyled or the dialog occupies ordinary layout.** Import
`react-native-overlaid/styles.css` once in the web application. The
stylesheet now also carries the default surface visuals and every reveal
transition, so without it overlays render bare and unanimated, not merely
un-reset.

**A tooltip feels slow to appear on web.** That is the 400 ms hover-intent
delay (first hover only; warm hovers are instant). Pass
`timing={{ delay: false }}` to restore instant opens.

**A native Sheet cannot load or Expo Go reports a missing native module.**
Install TrueSheet, run pods/prebuild as applicable, and rebuild a development
client. Expo Go cannot add this module at runtime.

**A native Popover/Tooltip sees a default theme or stale provider value.** Its
panel reads context at the portal host. Create a `useContextBridge` at the
source and pass it through `contextBridge`.

**An anchored web surface appears below an open Dialog.** The browser lacks
Popover API support, so the fallback is an ordinary DOM portal and cannot beat
the modal top layer. Avoid that nesting on those browsers or require Popover
API support.

**Changing Sheet detents has no effect.** Close and reopen; detents are
snapshotted for each presentation.

**An overlay refuses to close.** Check `onDismissRequest` first, then
`dismissable`. Explicit Close and controlled `open={false}` are programmatic.

## Design notes

- [Styling the web chrome](./docs/STYLING.md)
- [Web escape hatches (the `web` prop)](./docs/WEB-OPTIONS.md)
- [Platform divergences](./docs/PLATFORM-DIVERGENCES.md)
- [Render trees and context ownership](./docs/RENDER-TREES.md)
- [Architecture](./docs/ARCHITECTURE.md)
