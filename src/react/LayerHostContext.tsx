'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react'
import { BackHandler, Platform } from 'react-native'
import {
  createLayerHost,
  deepestAttachedDescendant,
  type LayerHostOptions,
} from '../core/layerHost'
import type { LayerEntry, LayerHost } from '../core/types'

const LayerHostContext = createContext<LayerHost | null>(null)

/** Install one global listener set at the root and route deepest-window first. */
function useRootDismissListeners(host: LayerHost): void {
  const isRoot = host.parent === null

  useEffect(() => {
    if (!isRoot || typeof document === 'undefined') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const outcome = deepestAttachedDescendant(host).dispatchEscape()
      if (outcome !== 'unhandled') event.preventDefault()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as { matches?: (selector: string) => boolean }
      // ModalContainer owns <dialog> backdrop classification. Letting the
      // global listener also classify that same pointerdown would produce an
      // outside-press followed by a backdrop-press for one user action.
      if (target.matches?.('dialog[data-overlaid-modal]')) return
      deepestAttachedDescendant(host).dispatchOutsidePress(
        { x: event.clientX, y: event.clientY },
        event.target,
      )
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [host, isRoot])

  useEffect(() => {
    if (!isRoot || Platform.OS === 'web') return
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () =>
        deepestAttachedDescendant(host).dispatchBackButton() !== 'unhandled',
    )
    return () => subscription.remove()
  }, [host, isRoot])
}

export type LayerHostProviderProps = {
  name: string
  children?: ReactNode
  /** Allows native window chrome to route its own back callback. */
  hostRef?: RefObject<LayerHost | null>
  options?: LayerHostOptions
}

export function LayerHostProvider({
  name,
  children,
  hostRef,
  options,
}: LayerHostProviderProps) {
  const parent = useContext(LayerHostContext)
  // Host identity and policy are intentionally mount-scoped.
  const [host] = useState(() => createLayerHost(name, parent, options))

  useEffect(() => {
    if (!hostRef) return
    const mutableRef = hostRef as { current: LayerHost | null }
    mutableRef.current = host
    return () => {
      if (mutableRef.current === host) mutableRef.current = null
    }
  }, [host, hostRef])

  useEffect(() => {
    if (!parent) return
    parent.attachChild(host)
    return () => parent.detachChild(host)
  }, [host, parent])

  useRootDismissListeners(host)
  return (
    <LayerHostContext.Provider value={host}>
      {children}
    </LayerHostContext.Provider>
  )
}

export function useLayerHost(): LayerHost {
  const host = useContext(LayerHostContext)
  if (!host) throw new Error('useLayerHost must be used inside <OverlayHost>')
  return host
}

export function useOptionalLayerHost(): LayerHost | null {
  return useContext(LayerHostContext)
}

export function useLayerStack(): readonly LayerEntry[] {
  const host = useLayerHost()
  return useSyncExternalStore(host.subscribe, host.getStack, host.getStack)
}
