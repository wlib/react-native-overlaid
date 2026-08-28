// Safe-area insets for scenarios. The gallery host provides real values
// (the example app reads them from react-native-safe-area-context); web
// stories provide nothing and fall back to zero — the browser viewport is
// already safe.
import { createContext, useContext } from 'react'
import type { OverlayInsets } from '../../src'

const GalleryInsetsContext = createContext<OverlayInsets>({})

export const GalleryInsetsProvider = GalleryInsetsContext.Provider

export function useGalleryInsets(): OverlayInsets {
  return useContext(GalleryInsetsContext)
}
