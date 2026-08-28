import {
  ScrollView,
  useWindowDimensions,
  type ScrollViewProps,
} from 'react-native'
import { useOptionalOverlayContext } from '../react/overlayContext'

const DEFAULT_MAX_HEIGHT_RATIO = 0.9

/** Native scroll container that preserves intrinsic sheet sizing. */
export function SheetScrollView({
  style,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  const context = useOptionalOverlayContext()
  const { height: screenHeight } = useWindowDimensions()

  if (context?.kind !== 'sheet') {
    return (
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...props}
      />
    )
  }

  const cap =
    toPixels(context.layout?.maxHeight, screenHeight) ??
    Math.round(screenHeight * DEFAULT_MAX_HEIGHT_RATIO)
  const bottomInset = context.insets?.bottom ?? 0

  return (
    <ScrollView
      nestedScrollEnabled
      style={[{ maxHeight: cap }, style]}
      contentContainerStyle={[
        bottomInset > 0 ? { paddingBottom: bottomInset } : undefined,
        contentContainerStyle,
      ]}
      {...props}
    />
  )
}

function toPixels(
  value: number | string | undefined,
  screenHeight: number,
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') {
    return Math.round(value)
  }
  if (value.endsWith('%')) {
    return Math.round((Number.parseFloat(value) / 100) * screenHeight)
  }
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? Math.round(numeric) : undefined
}
