import { ScrollView, type ScrollViewProps } from 'react-native'

/** Web sheets provide their own bounded scrolling surface. */
export function SheetScrollView(props: ScrollViewProps) {
  return <ScrollView {...props} />
}
