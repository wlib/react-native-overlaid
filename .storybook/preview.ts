import type { Preview } from '@storybook/react-native-web-vite'
import {
  setWebCapabilityOverrides,
  WEB_CAPABILITIES,
  type WebCapability,
} from '../src/chrome/webCapabilities'
import '../styles.css'

// Capability pinning for play tests and the screenshot pipeline (F4):
// `iframe.html?...&overlaid-caps=none` forces every web capability off so
// the fallback chrome renders in a fully capable browser; a comma-separated
// list (e.g. `overlaid-caps=popover,popoverHint`) forces exactly the listed
// capabilities on and the rest off. Without the param, real detection runs.
function exactOverrides(
  enabled: ReadonlySet<string>,
): Record<WebCapability, boolean> {
  return Object.fromEntries(
    WEB_CAPABILITIES.map((capability) => [
      capability,
      enabled.has(capability),
    ]),
  ) as Record<WebCapability, boolean>
}

const urlOverrides = (() => {
  if (typeof window === 'undefined') return null
  const caps = new URLSearchParams(window.location.search).get('overlaid-caps')
  if (caps === null) return null
  return exactOverrides(new Set(caps.split(',').map((token) => token.trim())))
})()

if (urlOverrides) setWebCapabilityOverrides(urlOverrides)

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  loaders: [
    // Per-story capability pinning: `parameters.overlaidCaps` is a list of
    // capabilities to force ON (everything else off) — the story-level
    // equivalent of the URL param, applied before each render so a pinned
    // story cannot leak overrides into the next one the runner visits.
    // Stories without the parameter run under the URL pin or real detection.
    async (context) => {
      const caps = context.parameters['overlaidCaps'] as
        | readonly WebCapability[]
        | undefined
      setWebCapabilityOverrides(
        caps !== undefined ? exactOverrides(new Set(caps)) : urlOverrides,
      )
    },
  ],
}

export default preview
