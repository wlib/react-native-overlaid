;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  ResizeObserverStub

import type { Ref } from 'react'
import { act, render, screen } from '@testing-library/react'
import { setWebCapabilityOverrides } from '../../chrome/webCapabilities'
import { OverlayHost } from '../../react/OverlayHost'
import { Tooltip, type TooltipTriggerProps } from '../Tooltip'

const advance = (ms: number) => {
  act(() => jest.advanceTimersByTime(ms))
}

function renderTooltip(options?: {
  delayToken?: string
  timing?: { delay?: number | false; warmth?: number | false }
}) {
  let triggerProps: TooltipTriggerProps | undefined
  const view = render(
    <OverlayHost>
      <Tooltip
        text="Tooltip body"
        closeOnScroll={false}
        {...(options?.timing ? { timing: options.timing } : {})}
      >
        {(props) => {
          triggerProps = props
          return (
            <button
              ref={props.ref as Ref<HTMLButtonElement>}
              type="button"
              style={
                options?.delayToken
                  ? ({
                      ['--overlaid-tooltip-delay' as string]:
                        options.delayToken,
                    } as never)
                  : undefined
              }
            >
              Tooltip trigger
            </button>
          )
        }}
      </Tooltip>
    </OverlayHost>,
  )
  const hover = () =>
    act(() => {
      triggerProps?.onPointerEnter?.({
        nativeEvent: { pointerType: 'mouse' },
      } as never)
    })
  const unhover = () =>
    act(() => {
      triggerProps?.onPointerLeave?.({
        nativeEvent: { pointerType: 'mouse' },
      } as never)
    })
  return { view, hover, unhover }
}

describe('tooltip CSS timing tokens (web)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.useRealTimers()
    setWebCapabilityOverrides(null)
  })

  it('an unset timing prop falls back to --overlaid-tooltip-delay on the trigger', () => {
    const { hover } = renderTooltip({
      delayToken: '100ms',
      timing: { warmth: false },
    })

    hover()
    advance(99)
    expect(screen.queryByText('Tooltip body')).toBeNull()
    advance(21)
    expect(screen.getByText('Tooltip body')).toBeTruthy()
  })

  it('an explicit timing prop beats the token', () => {
    const { hover } = renderTooltip({
      delayToken: '500ms',
      timing: { delay: 50, warmth: false },
    })

    hover()
    advance(70)
    expect(screen.getByText('Tooltip body')).toBeTruthy()
  })

  it('forwards interest-delay values to a qualifying trigger when the capability exists', () => {
    setWebCapabilityOverrides({ interestDelayCss: true })
    const setProperty = jest.spyOn(CSSStyleDeclaration.prototype, 'setProperty')
    renderTooltip()

    const calls = setProperty.mock.calls.filter(([name]) =>
      String(name).startsWith('interest-delay'),
    )
    expect(calls).toEqual([
      ['interest-delay-start', 'var(--overlaid-tooltip-delay, 400ms)'],
      ['interest-delay-end', '150ms'],
    ])
    setProperty.mockRestore()
  })

  it('forwards nothing without the capability or onto non-qualifying triggers', () => {
    const setProperty = jest.spyOn(CSSStyleDeclaration.prototype, 'setProperty')
    // Capability absent (jsdom detection): qualifying trigger, no forward.
    renderTooltip()
    // Capability present, default Pressable wrapper (a div): no forward.
    setWebCapabilityOverrides({ interestDelayCss: true })
    render(
      <OverlayHost>
        <Tooltip text="Wrapped" closeOnScroll={false}>
          <span>plain trigger</span>
        </Tooltip>
      </OverlayHost>,
    )

    const calls = setProperty.mock.calls.filter(([name]) =>
      String(name).startsWith('interest-delay'),
    )
    expect(calls).toEqual([])
    setProperty.mockRestore()
  })
})
