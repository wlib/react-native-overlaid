import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react'
import { View } from 'react-native'

export const presentSpy = jest.fn<Promise<void>, [number | undefined]>(
  async () => undefined,
)
export const dismissSpy = jest.fn<Promise<void>, []>(async () => undefined)
export const resizeSpy = jest.fn<Promise<void>, [number]>(async () => undefined)
/** The name-addressed static TrueSheet.dismiss(name) used at unmount. */
export const staticDismissSpy = jest.fn<
  Promise<void>,
  [string, boolean | undefined]
>(async () => undefined)

export type TrueSheetMockProps = {
  children?: ReactNode
  name?: string
  detents?: readonly SheetDetent[]
  dismissible?: boolean
  dimmed?: boolean
  grabber?: boolean
  cornerRadius?: number
  backgroundBlur?: string
  backgroundColor?: string
  accessibilityOptions?: { paneTitle?: string }
  onBackPress?: () => boolean | void
  onDidPresent?: (event: TrueSheetLifecycleEvent) => void
  onDidDismiss?: (event: TrueSheetLifecycleEvent) => void
}

type TrueSheetLifecycleEvent = { nativeEvent: null }
const LIFECYCLE_EVENT: TrueSheetLifecycleEvent = { nativeEvent: null }

export type TrueSheetInstance = {
  fireDismiss: () => void
  firePresent: () => void
  getProps: () => TrueSheetMockProps
}

const instances: TrueSheetInstance[] = []
let deferDismiss = false
let pendingDismissals: Array<() => void> = []

function resolveInstance(target?: number | TrueSheetInstance) {
  if (typeof target === 'number') return instances[target]
  return target ?? instances[instances.length - 1]
}

/** Simulates an OS-owned swipe/backdrop dismissal. */
export function simulateNativeTrueSheetDismiss(
  target?: number | TrueSheetInstance,
) {
  resolveInstance(target)?.fireDismiss()
}

/** Simulates TrueSheet's Android-back callback without guessing its result. */
export function simulateTrueSheetBack(target?: number | TrueSheetInstance) {
  return resolveInstance(target)?.getProps().onBackPress?.()
}

export function getTrueSheetInstances(): readonly TrueSheetInstance[] {
  return instances
}

export function getLatestTrueSheetProps(): TrueSheetMockProps | undefined {
  return resolveInstance()?.getProps()
}

export function setTrueSheetDismissDeferred(defer: boolean) {
  deferDismiss = defer
  if (!defer) pendingDismissals = []
}

export function flushTrueSheetDismissals() {
  const pending = pendingDismissals
  pendingDismissals = []
  for (const finish of pending) finish()
}

export function resetTrueSheetMock() {
  presentSpy.mockClear()
  dismissSpy.mockClear()
  resizeSpy.mockClear()
  staticDismissSpy.mockClear()
  deferDismiss = false
  pendingDismissals = []
}

const TrueSheetComponent = forwardRef<
  {
    present: (index?: number, animated?: boolean) => Promise<void>
    dismiss: (animated?: boolean) => Promise<void>
    resize: (index: number) => Promise<void>
  },
  TrueSheetMockProps
>((props, ref) => {
  const latest = useRef(props)
  latest.current = props
  const record = useRef<TrueSheetInstance>({
    fireDismiss: () => latest.current.onDidDismiss?.(LIFECYCLE_EVENT),
    firePresent: () => latest.current.onDidPresent?.(LIFECYCLE_EVENT),
    getProps: () => latest.current,
  })

  useEffect(() => {
    const instance = record.current
    instances.push(instance)
    return () => {
      const index = instances.indexOf(instance)
      if (index >= 0) instances.splice(index, 1)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    present: (index?: number, _animated?: boolean) => {
      const operation = presentSpy(index)
      latest.current.onDidPresent?.(LIFECYCLE_EVENT)
      return operation
    },
    dismiss: (_animated?: boolean) => {
      const operation = dismissSpy()
      const finish = () => latest.current.onDidDismiss?.(LIFECYCLE_EVENT)
      if (deferDismiss) pendingDismissals.push(finish)
      else finish()
      return operation
    },
    resize: (index: number) => resizeSpy(index),
  }))

  return <View testID="true-sheet">{props.children}</View>
})

TrueSheetComponent.displayName = 'TrueSheet'

export const TrueSheet = Object.assign(TrueSheetComponent, {
  dismiss: staticDismissSpy,
})

export type SheetDetent = number | 'auto' | 'peek'
