;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import {
  setWebCapabilityOverrides,
  WEB_CAPABILITIES,
} from '../../chrome/webCapabilities'
import type { LayerHost, OverlayKind } from '../../core/types'
import { resolveDismissChannel } from '../dismissChannel'
import { LayerHostProvider } from '../LayerHostContext'
import { useOverlayLifecycle } from '../useOverlayLifecycle'

const ALL_ON = Object.fromEntries(
  WEB_CAPABILITIES.map((capability) => [capability, true]),
)
const ALL_OFF = Object.fromEntries(
  WEB_CAPABILITIES.map((capability) => [capability, false]),
)

afterEach(() => setWebCapabilityOverrides(null))

describe('resolveDismissChannel (web)', () => {
  const vetoless = (kind: OverlayKind) =>
    resolveDismissChannel({ kind, dismissable: true, hasVeto: false })

  it('delegates every vetoless kind when all capabilities are present', () => {
    setWebCapabilityOverrides(ALL_ON)
    for (const kind of [
      'popover',
      'tooltip',
      'dialog',
      'drawer',
      'sheet',
    ] as const) {
      expect(vetoless(kind)).toBe('delegated')
    }
  })

  it('manages every kind when no capability is present', () => {
    setWebCapabilityOverrides(ALL_OFF)
    for (const kind of [
      'popover',
      'tooltip',
      'dialog',
      'drawer',
      'sheet',
    ] as const) {
      expect(vetoless(kind)).toBe('managed')
    }
  })

  it('maps each kind to its own capability gate', () => {
    setWebCapabilityOverrides({ ...ALL_OFF, popover: true })
    expect(vetoless('popover')).toBe('delegated')
    expect(vetoless('tooltip')).toBe('managed') // hint stack also required
    expect(vetoless('dialog')).toBe('managed')

    setWebCapabilityOverrides({ ...ALL_OFF, popover: true, popoverHint: true })
    expect(vetoless('tooltip')).toBe('delegated')

    setWebCapabilityOverrides({ ...ALL_OFF, dialogClosedBy: true })
    expect(vetoless('dialog')).toBe('delegated')
    expect(vetoless('drawer')).toBe('delegated')
    expect(vetoless('sheet')).toBe('delegated')
    expect(vetoless('popover')).toBe('managed')
  })

  it('forces managed for a veto or dismissable={false} (R2)', () => {
    setWebCapabilityOverrides(ALL_ON)
    expect(
      resolveDismissChannel({
        kind: 'popover',
        dismissable: true,
        hasVeto: true,
      }),
    ).toBe('managed')
    expect(
      resolveDismissChannel({
        kind: 'dialog',
        dismissable: false,
        hasVeto: false,
      }),
    ).toBe('managed')
  })
})

describe('channel snapshot per presentation', () => {
  function Probe({ open }: { open: boolean }) {
    useOverlayLifecycle({
      open,
      onOpenChange: () => {},
      kind: 'popover',
      behavior: 'auto',
      dismissable: true,
      exitMs: 0,
    })
    return null
  }

  it('registers the resolved channel and holds it until unmount', () => {
    setWebCapabilityOverrides(ALL_ON)
    const hostRef = createRef<LayerHost | null>()
    const ui = (open: boolean) => (
      <LayerHostProvider name="test" hostRef={hostRef}>
        <Probe open={open} />
      </LayerHostProvider>
    )
    const screen = render(ui(true))
    expect(hostRef.current?.getStack()[0]?.channel).toBe('platform')

    // Capability flips mid-presentation must not re-wire a live surface.
    setWebCapabilityOverrides(ALL_OFF)
    screen.rerender(ui(true))
    expect(hostRef.current?.getStack()[0]?.channel).toBe('platform')

    // The next presentation re-resolves against the current capabilities.
    screen.rerender(ui(false))
    act(() => {})
    expect(hostRef.current?.getStack()).toHaveLength(0)
    screen.rerender(ui(true))
    expect(hostRef.current?.getStack()[0]?.channel).toBe('managed')
  })
})
