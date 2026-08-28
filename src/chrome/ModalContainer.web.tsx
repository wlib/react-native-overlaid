'use client'

// WEB ModalContainer.
// Interprets: mounted state -> modal <dialog>; phase -> ::backdrop reveal.
// Reports: real show, backdrop press, and browser-forced close.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { flattenToCss } from '../react/flattenStyle'
import { useOverlayContext } from '../react/overlayContext'
import { stylingAttributes, useOverlayStyling } from '../react/overlayStyling'
import type { ModalContainerProps } from './ModalContainer'
import { hasWebCapability } from './webCapabilities'

export type { ModalContainerProps }

export function ModalContainer({
  children,
  backdrop,
  horizontalPadding,
}: ModalContainerProps) {
  const { state, signals, actions, panelId, exitMs, a11y, kind, insets } =
    useOverlayContext()
  const styling = useOverlayStyling()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const pressStartedOnBackdrop = useRef(false)
  // Changing modal/modeless ownership on a live <dialog> requires a close
  // cycle. Snapshot that structural choice for this mounted presentation;
  // object-style backdrop updates may still flow live.
  const hasBackdrop = useRef(backdrop !== false).current
  // A backdrop-free Dialog/Drawer is genuinely modeless on web. Sheets keep
  // modal top-layer behavior even when only their visual scrim is disabled.
  const usesModalTopLayer = hasBackdrop || kind === 'sheet'
  const backdropStyle = backdrop ? flattenToCss(backdrop.style) : undefined
  // Chromium-gated close-first exit (§7.3.2): close() at dismissal start
  // (its close algorithm also restores focus then, not at unmount) while
  // the stylesheet's allow-discrete/overlay transition keeps the dialog —
  // ::backdrop included — rendered through the exit. Elsewhere the dialog
  // stays open through 'dismissing': the only cross-browser way to keep
  // top-layer membership. The 'close' event this fires is absorbed by the
  // handler's !state.isOpen guard.
  const closeFirstExit =
    hasWebCapability('discreteTransitions') &&
    hasWebCapability('overlayProperty')
  const platformHidden = closeFirstExit ? !state.isOpen : !state.isMounted

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    let frame: number | undefined
    try {
      // Show is keyed on isOpen, not mount state: an accepted browser-
      // forced close leaves the host natively closed through the exit
      // phase, so a reopen mid-exit (dismissing -> presented, isMounted
      // never flipping) must re-show — and a forced close landing in the
      // 'mounting' window re-schedules the onHostShown frame instead of
      // stranding the entry. During 'dismissing' (mounted, not open)
      // neither branch runs in mounted-through-exit mode: a kernel-driven
      // close keeps the host open through its exit and closes at unmount.
      if (state.isOpen && !dialog.open) {
        showDialog(dialog, usesModalTopLayer)
        frame = requestAnimationFrame(signals.onHostShown)
      } else if (platformHidden && dialog.open) {
        dialog.close()
      }
    } catch {
      // StrictMode, removal, and browser close-request can race a top-layer
      // operation. The close handler reconciles the observable state.
    }
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [platformHidden, signals, state.isOpen, usesModalTopLayer])

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
      {...stylingAttributes(styling)}
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
      // React re-dispatches non-delegated events (close/cancel) through
      // fiber ancestors, so a DOM-nested dialog's close would land here
      // too and read as a browser-forced close of THIS host — the target
      // filter keeps each dialog's channel its own. (Latent since A;
      // close-first exits made it observable, because the nested close
      // now fires while the ancestor's listeners are still attached.)
      onCancel={(event) => {
        if (event.target === event.currentTarget) event.preventDefault()
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return
        if (!state.isOpen) return
        const dismissed = actions.requestDismiss('escape')
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
