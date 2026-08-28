'use client'

// WEB ModalContainer.
// Interprets: mounted state -> modal <dialog>; phase -> ::backdrop reveal.
// Reports: real show, backdrop press, and browser-forced close.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { sniffDismissCause } from '../react/dismissInputRecord'
import { flattenToCss } from '../react/flattenStyle'
import { useOverlayContext } from '../react/overlayContext'
import type { ModalContainerProps } from './ModalContainer'

export type { ModalContainerProps }

export function ModalContainer({
  children,
  backdrop,
  horizontalPadding,
}: ModalContainerProps) {
  const {
    state,
    signals,
    actions,
    panelId,
    exitMs,
    a11y,
    kind,
    insets,
    dismissChannel,
  } = useOverlayContext()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const pressStartedOnBackdrop = useRef(false)
  // Changing modal/modeless ownership on a live <dialog> requires a close
  // cycle. Snapshot that structural choice for this mounted presentation;
  // object-style backdrop updates may still flow live.
  const hasBackdrop = useRef(backdrop !== false).current
  // A backdrop-free Dialog/Drawer is genuinely modeless on web. Sheets keep
  // modal top-layer behavior even when only their visual scrim is disabled.
  const usesModalTopLayer = hasBackdrop || kind === 'sheet'
  // Delegated instances hand close-request detection (Escape and friends)
  // to the browser via `closedby`; the kernel's root keydown stands down for
  // them. The close itself stays kernel-driven (see onCancel), which keeps
  // the mounted-through-exit architecture on every engine.
  const delegated = dismissChannel === 'delegated'
  // `closedby` mapping, decided against this chrome's real geometry: the
  // host <dialog> spans the viewport (it IS the backdrop container), so for
  // top-layer hosts no pointerdown can ever land outside the element and
  // `closedby="any"` light dismiss would be dead — backdrop presses remain
  // this chrome's own classifier (below) for both channels. A modeless host
  // has pointer-events:none instead, so page presses genuinely land outside
  // it and `any` gives real browser light dismiss, matching the managed
  // outside-press semantics the kernel planners stand down from.
  const closedBy = delegated
    ? usesModalTopLayer
      ? 'closerequest'
      : 'any'
    : undefined
  const backdropStyle = backdrop ? flattenToCss(backdrop.style) : undefined

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    let frame: number | undefined
    try {
      // Keyed on isOpen, not isMounted: a browser-forced close the kernel
      // accepted leaves the host natively closed through the exit phase, so
      // a reopen mid-exit (dismissing -> presented, isMounted never
      // flipping) must re-show. During `dismissing` (mounted, not open)
      // neither branch runs: a kernel-driven close keeps the host open
      // through its exit and closes at unmount.
      if (state.isOpen && !dialog.open) {
        showDialog(dialog, usesModalTopLayer)
        frame = requestAnimationFrame(signals.onHostShown)
      } else if (!state.isMounted && dialog.open) {
        dialog.close()
      }
    } catch {
      // StrictMode, removal, and browser close-request can race a top-layer
      // operation. The close handler reconciles the observable state.
    }
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [signals, state.isMounted, state.isOpen, usesModalTopLayer])

  // The dialog close algorithm restores pre-show focus only while the node
  // remains connected. React removal alone can leave focus on <body>.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  // If a close event re-shows a refused dialog, report a real show on the
  // next frame. The lifecycle gate is idempotent, but this also covers a
  // browser implementation that reset its modal focus state.
  useEffect(
    () => () => {
      pressStartedOnBackdrop.current = false
    },
    [],
  )

  return (
    <dialog
      ref={dialogRef}
      id={panelId}
      data-overlaid-modal=""
      data-overlaid-kind={kind}
      data-overlaid-part="host"
      data-overlaid-state={state.isPresented ? 'open' : 'closed'}
      data-overlaid-phase={state.phase}
      data-overlaid-has-backdrop={hasBackdrop ? 'true' : 'false'}
      data-overlaid-modal-mode={usesModalTopLayer ? 'modal' : 'modeless'}
      data-overlaid-reveal=""
      {...(closedBy !== undefined
        ? // lib.dom/React do not know the attribute yet; lowercase unknown
          // attributes pass through to the DOM untouched.
          ({ closedby: closedBy } as Record<string, string>)
        : {})}
      {...a11y.host}
      className={backdrop ? backdrop.className : undefined}
      style={{
        // --overlaid-duration generalizes the backdrop-specific property;
        // both are written so pre-contract consumer CSS keeps reading the
        // original name.
        ['--overlaid-duration' as string]: `${exitMs}ms`,
        ['--overlaid-backdrop-duration' as string]: `${exitMs}ms`,
        ['--overlaid-backdrop-color' as string]: backdropStyle?.backgroundColor,
        ['--overlaid-backdrop-opacity' as string]: backdropStyle?.opacity,
        paddingLeft:
          horizontalPadding === undefined
            ? undefined
            : `max(${horizontalPadding}px, env(safe-area-inset-left, 0px))`,
        paddingRight:
          horizontalPadding === undefined
            ? undefined
            : `max(${horizontalPadding}px, env(safe-area-inset-right, 0px))`,
        paddingTop:
          kind === 'dialog' && insets?.top !== undefined
            ? `max(${insets.top}px, env(safe-area-inset-top, 0px))`
            : undefined,
        paddingBottom:
          kind === 'dialog' && insets?.bottom !== undefined
            ? `max(${insets.bottom}px, env(safe-area-inset-bottom, 0px))`
            : undefined,
        pointerEvents: usesModalTopLayer ? undefined : 'none',
      }}
      onCancel={(event) => {
        // React re-dispatches these non-delegated DOM events through fiber
        // ancestors, so a nested dialog's cancel also reaches this handler;
        // only the event's own host may act on it.
        if (event.target !== event.currentTarget) return
        // Both channels prevent the browser's own close: it would tear the
        // host out of the top layer before the exit phase can run. Managed
        // instances already received the gesture through the kernel's root
        // keydown; a delegated instance hears it only here (the kernel
        // stood down), so the cancelable proposal routes into the kernel,
        // which then drives the close through the normal lifecycle.
        event.preventDefault()
        if (delegated) actions.requestDismiss('escape')
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return
        if (!state.isOpen) return
        const dismissed = actions.requestDismiss(
          delegated ? sniffDismissCause('escape') : 'escape',
        )
        if (dismissed) return
        try {
          const dialog = dialogRef.current
          if (dialog) showDialog(dialog, usesModalTopLayer)
          requestAnimationFrame(signals.onHostShown)
        } catch {
          // Already open, detached, or another top-layer operation won.
        }
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        const startedHere = pressStartedOnBackdrop.current
        pressStartedOnBackdrop.current = false
        if (
          usesModalTopLayer &&
          startedHere &&
          event.target === event.currentTarget
        ) {
          actions.requestDismiss('backdrop-press')
        }
      }}
    >
      {children}
    </dialog>
  )
}

function showDialog(dialog: HTMLDialogElement, modal: boolean): void {
  if (modal) {
    dialog.showModal()
  } else if (typeof dialog.show === 'function') {
    dialog.show()
  } else {
    // Older test DOMs may implement the open attribute but not show().
    dialog.setAttribute('open', '')
  }
}
