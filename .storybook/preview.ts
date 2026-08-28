import type { Preview } from '@storybook/react-native-web-vite'
import {
  setWebCapabilityOverrides,
  WEB_CAPABILITIES,
} from '../src/chrome/webCapabilities'
import '../styles.css'

// Capability pinning for play tests and the screenshot pipeline (F4):
// `iframe.html?...&overlaid-caps=none` forces every web capability off so
// the fallback chrome renders in a fully capable browser; a comma-separated
// list (e.g. `overlaid-caps=popover,popoverHint`) forces exactly the listed
// capabilities on and the rest off. Without the param, real detection runs.
if (typeof window !== 'undefined') {
  const caps = new URLSearchParams(window.location.search).get('overlaid-caps')
  if (caps !== null) {
    const enabled = new Set(caps.split(',').map((token) => token.trim()))
    setWebCapabilityOverrides(
      Object.fromEntries(
        WEB_CAPABILITIES.map((capability) => [
          capability,
          enabled.has(capability),
        ]),
      ),
    )
  }
}

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
}

export default preview
