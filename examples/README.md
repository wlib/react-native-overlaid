# Focused examples

These files are small integration references, not a runnable application:

- [`basic-overlays.tsx`](./basic-overlays.tsx) covers the preset APIs for all
  five families.
- [`compound-dialog.tsx`](./compound-dialog.tsx) shows compound composition.
- [`safe-area.tsx`](./safe-area.tsx) forwards app-window inset numbers.
- [`context-bridge.tsx`](./context-bridge.tsx) bridges source context into
  native anchored portals.
- [`router-integration.tsx`](./router-integration.tsx) closes the host stack
  before navigation and subscribes for debugging.

Every rendered example belongs below one `OverlayHost`; the basic example
shows that root placement.
