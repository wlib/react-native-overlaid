'use client'

// WEB ModalContainer.
// Interprets: mounted state -> modal <dialog>; phase -> ::backdrop reveal.
// Reports: real show, backdrop press, and browser-forced close.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { flattenToCss } from '../react/flattenStyle'
import { useOverlayContext } from '../react/overlayContext'
import type { ModalContainerProps } from './ModalContainer'

export type { ModalContainerProps }

export function ModalContainer({
  children,
  backdrop,
  horizontalPadding,
}: ModalContainerProps) {
  const { state, signals, actions, panelId, exitMs, a11y, kind, insets } =
    useOverlayContext()
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

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    let frame: number | undefined
    try {
      if (state.isMounted && !dialog.open) {
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
  }, [signals, state.isMounted, usesModalTopLayer])

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
      data-overlaid-phase={state.phase}
      data-overlaid-has-backdrop={hasBackdrop ? 'true' : 'false'}
      data-overlaid-modal-mode={usesModalTopLayer ? 'modal' : 'modeless'}
      data-overlaid-reveal=""
      {...a11y.host}
      className={backdrop ? backdrop.className : undefined}
      style={{
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
      onCancel={(event) => event.preventDefault()}
      onClose={() => {
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
