import {
  hasWebCapability,
  setWebCapabilityOverrides,
  WEB_CAPABILITIES,
} from '../webCapabilities'

afterEach(() => setWebCapabilityOverrides(null))

describe('web capability registry', () => {
  it('detects nothing in bare jsdom without throwing', () => {
    // jsdom ships neither the Popover API nor CSS.supports for the queried
    // features; every guard must degrade to false, never throw.
    for (const capability of WEB_CAPABILITIES) {
      expect(hasWebCapability(capability)).toBe(false)
    }
  })

  it('overrides beat detection in both directions and null restores it', () => {
    expect(hasWebCapability('popover')).toBe(false)

    setWebCapabilityOverrides({ popover: true })
    expect(hasWebCapability('popover')).toBe(true)
    // A capability absent from the override map still falls through to
    // detection rather than inheriting the override's value.
    expect(hasWebCapability('dialogRequestClose')).toBe(false)

    setWebCapabilityOverrides({ popover: false })
    expect(hasWebCapability('popover')).toBe(false)

    setWebCapabilityOverrides(null)
    expect(hasWebCapability('popover')).toBe(false)
  })

  it('re-detects after overrides clear (the memo is not stale)', () => {
    expect(hasWebCapability('popover')).toBe(false)

    const proto = HTMLElement.prototype as HTMLElement & {
      showPopover?: () => void
      hidePopover?: () => void
    }
    proto.showPopover = () => {}
    proto.hidePopover = () => {}
    try {
      // The memoized false from above must be dropped by the override
      // round-trip — setWebCapabilityOverrides is the only mutation point
      // and always clears the memo.
      setWebCapabilityOverrides({})
      expect(hasWebCapability('popover')).toBe(true)
    } finally {
      Reflect.deleteProperty(proto, 'showPopover')
      Reflect.deleteProperty(proto, 'hidePopover')
    }
  })
})
