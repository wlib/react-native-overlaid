import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Platform,
  ScrollView,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { CenteredModal } from '../chrome/CenteredModal'
import type { DismissEvent } from '../core/types'
import {
  OverlayProvider,
  useOverlayContext,
  type OverlayInsets,
  type OverlayLayout,
  type SlotOverride,
} from '../react/overlayContext'
import { useOverlayRoot } from '../react/useOverlayRoot'
import * as defaults from './defaultStyles'
import { diagnoseLayout, warnOnce } from './diagnostics'
import { DialogSurface } from './DialogSurface'
import { OverlayClose, OverlayTrigger, type OverlayCloseProps } from './parts'
import { useWebDismissChannel, type ModalWebOptions } from './webOptions'

export type DialogProps = {
  open: boolean
  onOpenChange: (next: boolean) => void
  title?: string | undefined
  description?: string | undefined
  dismissable?: boolean | undefined
  /** Return `false` to veto user dismissal. Programmatic close skips it. */
  onDismissRequest?: ((event: DismissEvent) => boolean | void) | undefined
  showCloseButton?: boolean | undefined
  closeLabel?: string | undefined
  /** Accessible fallback when no visible title is supplied. */
  accessibilityLabel?: string | undefined
  unstyled?: boolean | undefined
  surface?: SlotOverride | undefined
  backdrop?: SlotOverride | false | undefined
  layout?: OverlayLayout | undefined
  insets?: OverlayInsets | undefined
  /** Web-only escape hatches; ignored on native. See {@link ModalWebOptions}. */
  web?: ModalWebOptions | undefined
  children: ReactNode
}

export type DialogRootProps = Pick<
  DialogProps,
  | 'open'
  | 'onOpenChange'
  | 'dismissable'
  | 'onDismissRequest'
  | 'accessibilityLabel'
  | 'layout'
  | 'insets'
  | 'backdrop'
  | 'web'
  | 'children'
>

type DialogRootBaseProps = DialogRootProps & {
  labelled: { title: boolean; description: boolean }
}

type DialogSemanticPart = 'title' | 'description'
type DialogSemantics = {
  register: (part: DialogSemanticPart) => () => void
}

const DialogSemanticsContext = createContext<DialogSemantics | null>(null)

type DialogChromeConfig = {
  backdrop: SlotOverride | false | undefined
  dismissable: boolean
}
const DialogChromeContext = createContext<DialogChromeConfig | null>(null)

function DialogRootBase({
  open,
  onOpenChange,
  dismissable = true,
  onDismissRequest,
  accessibilityLabel,
  layout,
  insets,
  backdrop,
  web,
  labelled,
  children,
}: DialogRootBaseProps) {
  diagnoseLayout('Dialog', layout)
  const webDismissal = useWebDismissChannel({
    component: 'Dialog',
    requested: web?.dismissal === 'closedby' ? 'closedby' : undefined,
    open,
    dismissable,
    hasDismissRequestHandler: onDismissRequest !== undefined,
  })
  const context = useOverlayRoot({
    kind: 'dialog',
    behavior: 'modal',
    role: 'dialog',
    exitMs: 180,
    open,
    onOpenChange,
    dismissable,
    onDismissRequest,
    label: accessibilityLabel,
    layout,
    insets,
    labelled,
    webDismissal,
  })

  const chrome = useMemo(
    () => ({ backdrop, dismissable }),
    [backdrop, dismissable],
  )

  return (
    <OverlayProvider value={context}>
      <DialogChromeContext.Provider value={chrome}>
        {children}
      </DialogChromeContext.Provider>
    </OverlayProvider>
  )
}

function DialogRoot({ children, ...props }: DialogRootProps) {
  const counts = useRef({ title: 0, description: 0 })
  const [labelled, setLabelled] = useState({
    title: false,
    description: false,
  })
  const register = useCallback((part: DialogSemanticPart) => {
    counts.current[part] += 1
    setLabelled((current) =>
      current[part] ? current : { ...current, [part]: true },
    )
    return () => {
      counts.current[part] = Math.max(0, counts.current[part] - 1)
      if (counts.current[part] === 0) {
        setLabelled((current) =>
          current[part] ? { ...current, [part]: false } : current,
        )
      }
    }
  }, [])
  const semantics = useMemo(() => ({ register }), [register])

  return (
    <DialogRootBase {...props} labelled={labelled}>
      <DialogSemanticsContext.Provider value={semantics}>
        {children}
      </DialogSemanticsContext.Provider>
    </DialogRootBase>
  )
}

export type DialogContentProps = {
  children: ReactNode
  unstyled?: boolean | undefined
  className?: string | undefined
  style?: SlotOverride['style'] | undefined
}

function DialogContent({
  children,
  unstyled = false,
  className,
  style,
}: DialogContentProps) {
  const context = useOverlayContext()
  const chrome = useContext(DialogChromeContext)
  if (!chrome) {
    throw new Error('Dialog.Content must be used inside Dialog.Root')
  }
  // The surface is bounded and CLIPPED, never scrolled: scrolling happens
  // in Dialog.Body (used by the preset) so absolutely-positioned children
  // of the surface — the pinned Close above all — never scroll away with
  // the content. Web clips via overflow hidden; native views overflow
  // their parent visibly, so the surface also shrinks to the CenteredModal
  // wrapper's bound (layout.maxHeight or 90%). The web reveal (opacity/
  // scale) lives in the layered stylesheet, keyed on data-overlaid-state.
  const boundStyle =
    Platform.OS === 'web'
      ? ({
          boxSizing: 'border-box',
          maxHeight: context.layout?.maxHeight ?? '90vh',
          minWidth: 0,
          overflow: 'hidden',
        } as unknown as ViewStyle)
      : ({ maxHeight: '100%', flexShrink: 1, overflow: 'hidden' } as ViewStyle)

  if (!context.state.isMounted) return null
  return (
    <CenteredModal
      dismissable={chrome.dismissable}
      {...(chrome.backdrop !== undefined ? { backdrop: chrome.backdrop } : {})}
    >
      <DialogSurface
        ref={context.refs.surface as never}
        className={className}
        unstyled={unstyled}
        style={[
          unstyled ? undefined : defaults.dialogSurface,
          boundStyle,
          style as StyleProp<ViewStyle>,
        ]}
        a11y={context.a11y.surface}
      >
        {children}
      </DialogSurface>
    </CenteredModal>
  )
}

export type DialogBodyProps = {
  children: ReactNode
}

/**
 * The scrolling region inside a bounded Dialog surface. The preset wraps
 * title/description/body content in it; compound consumers place it (or
 * their own scroller) inside Dialog.Content when content can overflow.
 * On web it stays `position: static` so absolutely-positioned siblings —
 * the pinned Close — keep the surface as their containing block.
 */
function DialogBody({ children }: DialogBodyProps) {
  if (Platform.OS === 'web') {
    return createElement(
      'div',
      {
        style: {
          // RN View layout parity — RNW Texts are display:inline and would
          // run together in a plain block div (title gluing to description).
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'static',
          minHeight: 0,
          flexShrink: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        },
      },
      children,
    )
  }
  return (
    <ScrollView
      style={dialogBodyStyles.scroll}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}

const dialogBodyStyles = {
  scroll: { flexGrow: 0, flexShrink: 1 } as ViewStyle,
}

export type DialogTextPartProps = {
  children: ReactNode
  style?: StyleProp<TextStyle> | undefined
}

function DialogTitle({ children, style }: DialogTextPartProps) {
  const context = useOverlayContext()
  const semantics = useContext(DialogSemanticsContext)
  useEffect(() => semantics?.register('title'), [semantics])
  return (
    <Text
      nativeID={context.titleId}
      accessibilityRole="header"
      style={[defaults.dialogTitle, style]}
    >
      {children}
    </Text>
  )
}

function DialogDescription({ children, style }: DialogTextPartProps) {
  const context = useOverlayContext()
  const semantics = useContext(DialogSemanticsContext)
  useEffect(() => semantics?.register('description'), [semantics])
  return (
    <Text
      nativeID={context.descriptionId}
      style={[defaults.dialogDescription, style]}
    >
      {children}
    </Text>
  )
}

function DialogClose({
  accessibilityLabel = 'Close dialog',
  ...props
}: OverlayCloseProps) {
  return <OverlayClose accessibilityLabel={accessibilityLabel} {...props} />
}

function DialogImpl({
  open,
  onOpenChange,
  title,
  description,
  dismissable = true,
  onDismissRequest,
  showCloseButton = true,
  closeLabel,
  accessibilityLabel,
  unstyled,
  surface,
  backdrop,
  layout,
  insets,
  web,
  children,
}: DialogProps) {
  if (!dismissable && !showCloseButton) {
    warnOnce(
      'Dialog with dismissable={false} and showCloseButton={false} has no ' +
        'built-in close action. Provide an explicit closing control to avoid trapping users.',
    )
  }

  return (
    <DialogRootBase
      open={open}
      onOpenChange={onOpenChange}
      dismissable={dismissable}
      onDismissRequest={onDismissRequest}
      accessibilityLabel={accessibilityLabel}
      layout={layout}
      insets={insets}
      backdrop={backdrop}
      web={web}
      labelled={{ title: !!title, description: !!description }}
    >
      <DialogContent
        unstyled={unstyled}
        className={surface?.className}
        style={surface?.style}
      >
        <DialogBody>
          {title ? <DialogTitle>{title}</DialogTitle> : null}
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
          {children}
        </DialogBody>
        {showCloseButton ? (
          <DialogClose accessibilityLabel={closeLabel} />
        ) : null}
      </DialogContent>
    </DialogRootBase>
  )
}

export const Dialog = Object.assign(DialogImpl, {
  Root: DialogRoot,
  Trigger: OverlayTrigger,
  Content: DialogContent,
  Body: DialogBody,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
})
