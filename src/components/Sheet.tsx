import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Platform } from 'react-native'
import { SheetSurface } from '../chrome/SheetSurface'
import type { Detent } from '../core/detents'
import type { DismissEvent } from '../core/types'
import {
  OverlayProvider,
  useOverlayContext,
  type OverlayInsets,
  type OverlayLayout,
  type SlotOverride,
} from '../react/overlayContext'
import { useOverlayRoot } from '../react/useOverlayRoot'
import { diagnoseDetents, diagnoseLayout, warnOnce } from './diagnostics'
import { OverlayClose, OverlayTrigger, type OverlayCloseProps } from './parts'
import { SheetScrollView } from './SheetScrollView'
import { useWebDismissChannel, type ModalWebOptions } from './webOptions'

export type SheetScrim =
  | {
      className?: string | undefined
      color?: string | undefined
      opacity?: number | undefined
    }
  | false

export type SheetProps = {
  open: boolean
  onOpenChange: (next: boolean) => void
  /** Presentation inputs are snapshotted; close and reopen to change them. */
  detents?: ReadonlyArray<Detent> | undefined
  initialDetent?: number | undefined
  handle?: boolean | undefined
  scrim?: SheetScrim | undefined
  dismissable?: boolean | undefined
  onDismissRequest?: ((event: DismissEvent) => boolean | void) | undefined
  showCloseButton?: boolean | undefined
  closeLabel?: string | undefined
  accessibilityLabel?: string | undefined
  surface?: SlotOverride | undefined
  layout?: OverlayLayout | undefined
  insets?: OverlayInsets | undefined
  /** Web-only escape hatches; ignored on native. See {@link ModalWebOptions}. */
  web?: ModalWebOptions | undefined
  children: ReactNode
}

export type SheetRootProps = Omit<SheetProps, 'showCloseButton' | 'closeLabel'>

type SheetChromeConfig = {
  detents: ReadonlyArray<Detent> | undefined
  initialDetent: number | undefined
  handle: boolean | undefined
  scrim: SheetScrim | undefined
  dismissable: boolean
  hasDismissRequestHandler: boolean
  accessibilityLabel: string | undefined
  surface: SlotOverride | undefined
}
const SheetChromeContext = createContext<SheetChromeConfig | null>(null)

function SheetRoot({
  open,
  onOpenChange,
  detents,
  initialDetent,
  handle,
  scrim,
  dismissable = true,
  onDismissRequest,
  accessibilityLabel,
  surface,
  layout,
  insets,
  web,
  children,
}: SheetRootProps) {
  diagnoseLayout('Sheet', layout)
  diagnoseDetents(detents, initialDetent)
  const webDismissal = useWebDismissChannel({
    component: 'Sheet',
    requested: web?.dismissal === 'closedby' ? 'closedby' : undefined,
    open,
    dismissable,
    hasDismissRequestHandler: onDismissRequest !== undefined,
  })
  const context = useOverlayRoot({
    kind: 'sheet',
    behavior: 'modal',
    role: 'dialog',
    exitMs: Platform.OS === 'web' ? 220 : 600,
    open,
    onOpenChange,
    dismissable,
    onDismissRequest,
    label: accessibilityLabel,
    layout,
    insets,
    webDismissal,
  })
  const chrome = useMemo<SheetChromeConfig>(
    () => ({
      detents,
      initialDetent,
      handle,
      scrim,
      dismissable,
      hasDismissRequestHandler: onDismissRequest !== undefined,
      accessibilityLabel,
      surface,
    }),
    [
      accessibilityLabel,
      detents,
      dismissable,
      handle,
      onDismissRequest,
      initialDetent,
      scrim,
      surface,
    ],
  )

  return (
    <OverlayProvider value={context}>
      <SheetChromeContext.Provider value={chrome}>
        {children}
      </SheetChromeContext.Provider>
    </OverlayProvider>
  )
}

export type SheetContentProps = { children: ReactNode }

function SheetContent({ children }: SheetContentProps) {
  const context = useOverlayContext()
  const chrome = useContext(SheetChromeContext)
  if (!chrome) throw new Error('Sheet.Content must be used inside Sheet.Root')
  if (!context.state.isMounted) return null
  const scrim =
    chrome.scrim === false
      ? false
      : chrome.scrim === undefined
        ? undefined
        : {
            ...(chrome.scrim.className !== undefined
              ? { className: chrome.scrim.className }
              : {}),
            ...(chrome.scrim.color !== undefined
              ? { color: chrome.scrim.color }
              : {}),
            ...(chrome.scrim.opacity !== undefined
              ? { opacity: chrome.scrim.opacity }
              : {}),
          }

  return (
    <SheetSurface
      dismissable={chrome.dismissable}
      hasDismissRequestHandler={chrome.hasDismissRequestHandler}
      {...(chrome.detents !== undefined ? { detents: chrome.detents } : {})}
      {...(chrome.initialDetent !== undefined
        ? { initialDetent: chrome.initialDetent }
        : {})}
      {...(chrome.handle !== undefined ? { handle: chrome.handle } : {})}
      {...(scrim !== undefined ? { scrim } : {})}
      {...(chrome.accessibilityLabel !== undefined
        ? { accessibilityLabel: chrome.accessibilityLabel }
        : {})}
      {...(chrome.surface?.className !== undefined
        ? { className: chrome.surface.className }
        : {})}
      {...(chrome.surface?.style !== undefined
        ? { style: chrome.surface.style }
        : {})}
    >
      {children}
    </SheetSurface>
  )
}

function SheetClose({
  accessibilityLabel = 'Close sheet',
  ...props
}: OverlayCloseProps) {
  return <OverlayClose accessibilityLabel={accessibilityLabel} {...props} />
}

function SheetImpl({
  showCloseButton = false,
  closeLabel,
  dismissable = true,
  children,
  ...props
}: SheetProps) {
  if (!dismissable && !showCloseButton) {
    warnOnce(
      'Sheet with dismissable={false} and showCloseButton={false} has no ' +
        'built-in close action. Provide an explicit closing control to avoid trapping users.',
    )
  }
  return (
    <SheetRoot {...props} dismissable={dismissable}>
      <SheetContent>
        {children}
        {showCloseButton ? (
          <SheetClose
            {...(closeLabel !== undefined
              ? { accessibilityLabel: closeLabel }
              : {})}
          />
        ) : null}
      </SheetContent>
    </SheetRoot>
  )
}

export const Sheet = Object.assign(SheetImpl, {
  Root: SheetRoot,
  Trigger: OverlayTrigger,
  Content: SheetContent,
  Close: SheetClose,
  ScrollView: SheetScrollView,
})
