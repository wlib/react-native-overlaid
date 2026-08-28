import { useCallback } from 'react'
import { Text } from 'react-native'
import { useLayerHost, useLayerStack } from 'react-native-overlaid'

/** Call before committing a route change. closeAll includes nested windows. */
export function useCloseOverlaysBeforeNavigate() {
  const host = useLayerHost()
  return useCallback(() => host.closeAll(), [host])
}

/** A small debug/status consumer for the nearest layer host. */
export function OverlayDebugStatus() {
  const stack = useLayerStack()
  return (
    <Text>{`${stack.length} overlay${stack.length === 1 ? '' : 's'} open`}</Text>
  )
}
