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

const advance = (ms = 50) => {
  act(() => jest.advanceTimersByTime(ms))
}

function InterestTooltip({
  capture,
}: {
  capture?: (props: TooltipTriggerProps) => void
}) {
  return (
    <OverlayHost>
      <Tooltip
        text="tip body"
        closeOnScroll={false}
        web={{ intent: 'interest' }}
      >
        {(props) => {
          capture?.(props)
          return (
            <button ref={props.ref as Ref<HTMLButtonElement>} type="button">
              trigger
            </button>
          )
        }}
      </Tooltip>
    </OverlayHost>
  )
}

const interestEvent = (type: 'interest' | 'loseinterest') =>
  new Event(type, { cancelable: true })

describe('Tooltip web.intent="interest"', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setWebCapabilityOverrides({ interestFor: true })
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    setWebCapabilityOverrides(null)
  })

  it('wires interestfor to a pre-existing target and routes canceled events into the kernel', () => {
    render(<InterestTooltip />)
    advance()

    const trigger = screen.getByRole('button', { name: 'trigger' })
    const targetId = trigger.getAttribute('interestfor') as string
    expect(targetId).toBeTruthy()
    // interestfor requires its IDREF target in the DOM before the panel
    // mounts; the hidden placeholder carries the id.
    const placeholder = document.getElementById(targetId) as HTMLElement
    expect(placeholder).not.toBeNull()
    expect(placeholder.hidden).toBe(true)

    // interest is a cancelable proposal (channel type a): the default is
    // canceled and the kernel drives the open.
    const event = interestEvent('interest')
    act(() => {
      trigger.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    advance()
    expect(screen.getByText('tip body')).toBeTruthy()
    // The mounted panel takes the id over from the placeholder.
    expect(document.getElementById(targetId)).not.toBe(placeholder)

    const lose = interestEvent('loseinterest')
    act(() => {
      trigger.dispatchEvent(lose)
    })
    expect(lose.defaultPrevented).toBe(true)
    advance(200)
    expect(screen.queryByText('tip body')).toBeNull()
  })

  it('also listens on the interest target (events are non-bubbling)', () => {
    render(<InterestTooltip />)
    advance()

    const trigger = screen.getByRole('button', { name: 'trigger' })
    const targetId = trigger.getAttribute('interestfor') as string
    const placeholder = document.getElementById(targetId) as HTMLElement
    act(() => {
      placeholder.dispatchEvent(interestEvent('interest'))
    })
    advance()
    expect(screen.getByText('tip body')).toBeTruthy()

    const panel = document.getElementById(targetId) as HTMLElement
    act(() => {
      panel.dispatchEvent(interestEvent('loseinterest'))
    })
    advance(200)
    expect(screen.queryByText('tip body')).toBeNull()
  })

  it('stands the JS hover-intent inputs down while the channel is active', () => {
    let latest: TooltipTriggerProps | undefined
    render(
      <InterestTooltip
        capture={(props) => {
          latest = props
        }}
      />,
    )
    advance()
    expect(latest?.onPointerEnter).toBeUndefined()
    expect(latest?.onFocus).toBeUndefined()
  })

  it('falls back to the JS engine when the browser lacks Interest Invokers', () => {
    setWebCapabilityOverrides({ interestFor: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    let latest: TooltipTriggerProps | undefined
    render(
      <InterestTooltip
        capture={(props) => {
          latest = props
        }}
      />,
    )
    advance()

    const trigger = screen.getByRole('button', { name: 'trigger' })
    expect(trigger.hasAttribute('interestfor')).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'interestFor'"))
    // The JS hover-intent inputs remain the input source.
    expect(latest?.onPointerEnter).toBeDefined()
    expect(latest?.onFocus).toBeDefined()
  })

  it('falls back with a warning when the trigger is not a button or link', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <OverlayHost>
        <Tooltip
          text="tip body"
          closeOnScroll={false}
          web={{ intent: 'interest' }}
        >
          {(props) => (
            <div ref={props.ref as Ref<HTMLDivElement>} role="button">
              plain trigger
            </div>
          )}
        </Tooltip>
      </OverlayHost>,
    )
    advance()

    const trigger = screen.getByRole('button', { name: 'plain trigger' })
    expect(trigger.hasAttribute('interestfor')).toBe(false)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('requires the render-prop trigger'),
    )
  })
})
