import { useEffect, useRef, type RefObject } from 'react'
import { registerTrigger } from '../core/triggerRegistry'
import type { Behavior } from '../core/types'
import { useOptionalLayerHost } from './LayerHostContext'

/** Register native triggers for same-gesture pass-through after dismissal. */
export function useTriggerRegistration(
  id: string,
  ref: RefObject<unknown> | ((node: unknown) => void),
  onPress: () => void,
  behavior: Behavior,
  ownerEntryId = id,
): void {
  const host = useOptionalLayerHost()
  const onPressRef = useRef(onPress)
  onPressRef.current = onPress

  useEffect(() => {
    if (!host || typeof ref === 'function') return
    return registerTrigger(host.name, {
      id,
      ownerEntryId,
      behavior,
      ref,
      onPress: () => onPressRef.current(),
    })
  }, [behavior, host, id, ownerEntryId, ref])
}
