import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { DrawerPanel, type DrawerPanelProps } from '../chrome/DrawerPanel'
import { ModalContainer } from '../chrome/ModalContainer'
import { Scrim } from '../chrome/Scrim'
import { useRevealStyle } from '../chrome/useRevealStyle'
import type { DismissEvent } from '../core/types'
import {
  OverlayProvider,
  useOverlayContext,
  useOptionalOverlayContext,
  type OverlayInsets,
  type OverlayLayout,
  type SlotOverride,
} from '../react/overlayContext'
import { useOverlayRoot } from '../react/useOverlayRoot'
import * as defaults from './defaultStyles'
import { diagnoseLayout, warnOnce } from './diagnostics'
import { OverlayClose, OverlayTrigger, type OverlayCloseProps } from './parts'

export type DrawerProps = {
  open: boolean
  onOpenChange: (next: boolean) => void
  side?: 'left' | 'right' | undefined
  dismissable?: boolean | undefined
  onDismissRequest?: ((event: DismissEvent) => boolean | void) | undefined
  showCloseButton?: boolean | undefined
  closeLabel?: string | undefined
  accessibilityLabel?: string | undefined
  unstyled?: boolean | undefined
  surface?: SlotOverride | undefined
  backdrop?: SlotOverride | false | undefined
  layout?: OverlayLayout | undefined
  insets?: OverlayInsets | undefined
  children: ReactNode
}

export type DrawerRootProps = Pick<
  DrawerProps,
  | 'open'
  | 'onOpenChange'
  | 'dismissable'
  | 'onDismissRequest'
  | 'accessibilityLabel'
  | 'layout'
  | 'insets'
  | 'backdrop'
  | 'children'
>

type DrawerChromeConfig = {
  backdrop: SlotOverride | false | undefined
  dismissable: boolean
}
const DrawerChromeContext = createContext<DrawerChromeConfig | null>(null)

function DrawerRoot({
  open,
  onOpenChange,
  dismissable = true,
  onDismissRequest,
  accessibilityLabel,
  layout,
  insets,
  backdrop,
  children,
}: DrawerRootProps) {
  diagnoseLayout('Drawer', layout)
  const context = useOverlayRoot({
    kind: 'drawer',
    behavior: 'modal',
    role: 'dialog',
    exitMs: 200,
    open,
    onOpenChange,
    dismissable,
    onDismissRequest,
    label: accessibilityLabel,
    layout,
    insets,
  })
  const chrome = useMemo(
    () => ({ backdrop, dismissable }),
    [backdrop, dismissable],
  )

  return (
    <OverlayProvider value={context}>
      <DrawerChromeContext.Provider value={chrome}>
        {children}
      </DrawerChromeContext.Provider>
    </OverlayProvider>
  )
}

export type DrawerContentProps = DrawerPanelProps & {
  unstyled?: boolean | undefined
}

function DrawerContent({
  unstyled = false,
  style,
  accessibilityLabel,
  width,
  maxWidth,
  ...props
}: DrawerContentProps) {
  const context = useOverlayContext()
  const chrome = useContext(DrawerChromeContext)
  if (!chrome) throw new Error('Drawer.Content must be used inside Drawer.Root')
  const panelLabel = accessibilityLabel ?? context.a11y.host['aria-label']

  if (!context.state.isMounted) return null
  return (
    <ModalContainer
      {...(chrome.backdrop !== undefined ? { backdrop: chrome.backdrop } : {})}
    >
      {Platform.OS !== 'web' && chrome.backdrop !== false ? (
        <NativeDrawerScrim
          backdrop={chrome.backdrop}
          dismissable={chrome.dismissable}
        />
      ) : null}
      <DrawerPanel
        {...props}
        width={width ?? context.layout?.width ?? '90%'}
        maxWidth={maxWidth ?? context.layout?.maxWidth ?? 420}
        {...(panelLabel !== undefined
          ? { accessibilityLabel: panelLabel }
          : {})}
        unstyled={unstyled}
        style={[
          unstyled ? undefined : defaults.drawerSurface,
          style as StyleProp<ViewStyle>,
        ]}
      />
    </ModalContainer>
  )
}

function NativeDrawerScrim({ backdrop, dismissable }: DrawerChromeConfig) {
  const context = useOverlayContext()
  const reveal = useRevealStyle(
    { kind: 'fade' },
    context.state.phase,
    context.exitMs,
  )
  return (
    <Animated.View style={[StyleSheet.absoluteFill, reveal]}>
      <Scrim
        style={backdrop ? (backdrop.style as StyleProp<ViewStyle>) : undefined}
        dismissable={dismissable}
      />
    </Animated.View>
  )
}

export type DrawerCloseProps = OverlayCloseProps & {
  /** Explicit override; otherwise uses the enclosing drawer's top inset. */
  topInset?: number | undefined
}

function DrawerClose({
  topInset,
  style,
  accessibilityLabel = 'Close drawer',
  ...props
}: DrawerCloseProps) {
  const context = useOptionalOverlayContext()
  // 8, not 16: the close box now carries its own 8px of centering around
  // the glyph, keeping the visible ✕ at inset + 16.
  const top = (topInset ?? context?.insets?.top ?? 0) + 8
  return (
    <OverlayClose
      accessibilityLabel={accessibilityLabel}
      style={[{ top }, style]}
      {...props}
    />
  )
}

function DrawerImpl({
  open,
  onOpenChange,
  side = 'right',
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
  children,
}: DrawerProps) {
  if (!dismissable && !showCloseButton) {
    warnOnce(
      'Drawer with dismissable={false} and showCloseButton={false} has no ' +
        'built-in close action. Provide an explicit closing control to avoid trapping users.',
    )
  }

  return (
    <DrawerRoot
      open={open}
      onOpenChange={onOpenChange}
      dismissable={dismissable}
      onDismissRequest={onDismissRequest}
      accessibilityLabel={accessibilityLabel}
      layout={layout}
      insets={insets}
      backdrop={backdrop}
    >
      <DrawerContent
        side={side}
        {...(accessibilityLabel !== undefined ? { accessibilityLabel } : {})}
        {...(surface?.className !== undefined
          ? { className: surface.className }
          : {})}
        unstyled={unstyled}
        style={surface?.style}
      >
        {Platform.OS === 'web' ? (
          // The web panel scrolls in its own inner container (see
          // DrawerPanel.web) with the close pinned via the outer box.
          children
        ) : (
          // Native has no position:static escape hatch, so the preset
          // scrolls the consumer content itself and keeps the close button
          // a sibling — pinned to the panel, not the scroll content.
          <ScrollView
            style={drawerScrollStyles.scroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        )}
        {showCloseButton ? (
          <DrawerClose
            {...(closeLabel !== undefined
              ? { accessibilityLabel: closeLabel }
              : {})}
          />
        ) : null}
      </DrawerContent>
    </DrawerRoot>
  )
}

const drawerScrollStyles = {
  scroll: { flex: 1 } as ViewStyle,
}

export const Drawer = Object.assign(DrawerImpl, {
  Root: DrawerRoot,
  Trigger: OverlayTrigger,
  Content: DrawerContent,
  Close: DrawerClose,
})
