// Public components.
export { Dialog, type DialogProps } from './components/Dialog'
export { Drawer, type DrawerProps } from './components/Drawer'
export { Sheet, type SheetProps } from './components/Sheet'
export {
  Popover,
  type PopoverProps,
  type PopoverContentProps,
  type PopoverContentRenderProps,
} from './components/Popover'
export {
  Tooltip,
  type TooltipProps,
  type TooltipTriggerProps,
} from './components/Tooltip'
export {
  OverlayClose,
  OverlayTrigger,
  type OverlayCloseProps,
  type OverlayTriggerProps,
  type OverlayTriggerRenderProps,
} from './components/parts'
export type {
  ModalWebOptions,
  PopoverWebOptions,
  TooltipWebOptions,
} from './components/webOptions'

// Required application host.
export { OverlayHost, ROOT_HOST_NAME } from './react/OverlayHost'

// Portals and source-position context bridging for custom native overlays.
export {
  Portal,
  PortalHost,
  PortalScope,
  useHostOffset,
  type HostOffset,
} from './react/portal'
export { useContextBridge, type ContextBridge } from './react/contextBridge'

// React kernel for custom overlay families.
export {
  useOverlayRoot,
  useAnchoredOverlayRoot,
  type OverlaySpec,
} from './react/useOverlayRoot'
export {
  OverlayProvider,
  useOverlayContext,
  useOptionalOverlayContext,
  useAnchoredOverlayContext,
  type CrossPlatformStyle,
  type OverlayContextValue,
  type OverlayInsets,
  type OverlayLayout,
  type OverlayLayoutValue,
  type SlotOverride,
  type SurfaceA11yProps,
  type TriggerA11yProps,
  type WebDismissal,
} from './react/overlayContext'
export {
  LayerHostProvider,
  useLayerHost,
  useLayerStack,
  useOptionalLayerHost,
} from './react/LayerHostContext'
export type {
  AnchoredPosition,
  AnchoredSpec,
  Placement,
} from './react/anchoredPosition'

// Pure kernel exports intentionally retained for advanced integrations.
export {
  BEHAVIOR,
  PRESENT_GATES,
  USER_DISMISS_EVENTS,
  canPresent,
  decideDismissRequest,
  type BehaviorPolicy,
  type BehaviorTable,
  type DismissDecision,
  type DismissDecisionInput,
} from './core/behaviorPolicy'
export {
  reduceLifecycle,
  UNMOUNTED,
  type LifecycleAction,
} from './core/lifecycle'
export {
  createLayerHost,
  deepestAttachedDescendant,
  type LayerHostOptions,
} from './core/layerHost'
export {
  isAncestorOf,
  planBackButton,
  planEscape,
  planOutsidePress,
  planTransientDisplacement,
  type StackEntrySnapshot,
  type Step,
} from './core/arbitration'
export {
  reduceSheetHost,
  type SheetHostCommand,
  type SheetHostEvent,
  type SheetHostState,
  type Transition as MachineTransition,
} from './core/sheetHostMachine'
export {
  MAX_DETENTS,
  clampDetentIndex,
  normalizeDetents,
  orderDetents,
  resolveDetentHeight,
  resolveNativeSheet,
  type Detent,
  type OrderedDetents,
} from './core/detents'
export type {
  Behavior,
  DismissalChannel,
  DismissEvent,
  DispatchOutcome,
  LayerEntry,
  LayerHost,
  LifecycleState,
  OverlayKind,
  OverlayRole,
  Phase,
  Point,
  PresentGate,
} from './core/types'
