import { useMemo } from 'react'
import type { OverlayContextValue } from '../react/overlayContext'

/** Native accessibility escape plus an explicit TalkBack dismiss action. */
export function useDismissAccessibility(
  actions: OverlayContextValue['actions'],
  accessibilityLabel?: string,
  enabled = true,
) {
  return useMemo(() => {
    if (!enabled) {
      return accessibilityLabel === undefined ? {} : { accessibilityLabel }
    }
    const dismiss = {
      onAccessibilityEscape: () => actions.requestDismiss('escape'),
      accessibilityActions: [{ name: 'dismiss' as const }],
      onAccessibilityAction: (event: {
        nativeEvent: { actionName: string }
      }) => {
        if (event.nativeEvent.actionName === 'dismiss') {
          actions.requestDismiss('escape')
        }
      },
    }
    return accessibilityLabel === undefined
      ? dismiss
      : { ...dismiss, accessibilityLabel }
  }, [accessibilityLabel, actions, enabled])
}
