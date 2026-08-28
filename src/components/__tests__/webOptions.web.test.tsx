import { renderHook } from '@testing-library/react'
import {
  setWebCapabilityOverrides,
  type WebCapability,
} from '../../chrome/webCapabilities'
import { resolveWebPositioning, useWebDismissChannel } from '../webOptions'

const capabilities = (overrides: Partial<Record<WebCapability, boolean>>) =>
  setWebCapabilityOverrides(overrides)

afterEach(() => {
  setWebCapabilityOverrides(null)
  jest.restoreAllMocks()
})

describe('useWebDismissChannel', () => {
  const base = {
    component: 'Popover' as const,
    requested: 'browser' as const,
    open: false,
    dismissable: true,
    hasDismissRequestHandler: false,
  }

  it('delegates only when requested, capable, and vetoless', () => {
    capabilities({ popover: true })
    const { result } = renderHook(() => useWebDismissChannel(base))
    expect(result.current).toBe('delegated')
  })

  it('defaults to managed when nothing was requested', () => {
    capabilities({ popover: true })
    const { result } = renderHook(() =>
      useWebDismissChannel({ ...base, requested: undefined }),
    )
    expect(result.current).toBe('managed')
  })

  it('falls back to managed for a veto handler, naming the reason', () => {
    capabilities({ popover: true })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() =>
      useWebDismissChannel({ ...base, hasDismissRequestHandler: true }),
    )
    expect(result.current).toBe('managed')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('onDismissRequest'),
    )
  })

  it('falls back to managed for dismissable={false}, naming the reason', () => {
    capabilities({ popover: true })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() =>
      useWebDismissChannel({ ...base, dismissable: false }),
    )
    expect(result.current).toBe('managed')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('dismissable={false}'),
    )
  })

  it('falls back to managed without the capability, naming the capability', () => {
    capabilities({ popover: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useWebDismissChannel(base))
    expect(result.current).toBe('managed')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'popover'"))
  })

  it("gates modal 'closedby' on the dialogClosedBy capability", () => {
    capabilities({ dialogClosedBy: true })
    const { result } = renderHook(() =>
      useWebDismissChannel({
        ...base,
        component: 'Dialog',
        requested: 'closedby',
      }),
    )
    expect(result.current).toBe('delegated')

    capabilities({ dialogClosedBy: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const refused = renderHook(() =>
      useWebDismissChannel({
        ...base,
        component: 'Sheet',
        requested: 'closedby',
      }),
    )
    expect(refused.result.current).toBe('managed')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("'dialogClosedBy'"),
    )
  })

  it('snapshots the channel for the whole open cycle', () => {
    capabilities({ popover: true })
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useWebDismissChannel>[0]) =>
        useWebDismissChannel(props),
      { initialProps: base },
    )
    expect(result.current).toBe('delegated')

    // Opening freezes the resolution; a veto arriving mid-flight cannot
    // flip the open instance between dismissal systems.
    rerender({ ...base, open: true })
    expect(result.current).toBe('delegated')
    rerender({ ...base, open: true, hasDismissRequestHandler: true })
    expect(result.current).toBe('delegated')

    // Closing re-resolves against the live props.
    rerender({ ...base, open: false, hasDismissRequestHandler: true })
    expect(result.current).toBe('managed')
  })
})

describe('resolveWebPositioning', () => {
  it('resolves css-anchor when requested and supported', () => {
    capabilities({ anchorPositioning: true })
    expect(resolveWebPositioning('Popover', 'css-anchor', false)).toBe(
      'css-anchor',
    )
  })

  it('returns undefined when unrequested or explicitly floating', () => {
    capabilities({ anchorPositioning: true })
    expect(resolveWebPositioning('Popover', undefined, false)).toBeUndefined()
    expect(resolveWebPositioning('Popover', 'floating', false)).toBeUndefined()
  })

  it('falls back for a boundaryRef, naming the reason', () => {
    capabilities({ anchorPositioning: true })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveWebPositioning('Tooltip', 'css-anchor', true)).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('boundaryRef'))
  })

  it('falls back without the capability, naming the capability', () => {
    capabilities({ anchorPositioning: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      resolveWebPositioning('Popover', 'css-anchor', false),
    ).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("'anchorPositioning'"),
    )
  })
})
