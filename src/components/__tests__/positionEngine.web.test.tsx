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

import { createRef, type Ref } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Text } from 'react-native'
import { setWebCapabilityOverrides } from '../../chrome/webCapabilities'
import { OverlayHost } from '../../react/OverlayHost'
import { Popover } from '../Popover'
import { Tooltip } from '../Tooltip'

const advance = (ms = 50) => {
  act(() => jest.advanceTimersByTime(ms))
}

const panel = () =>
  document.querySelector('[data-overlaid-popover]') as HTMLElement

function renderPopover(options?: {
  closeOnScroll?: boolean
  boundaryRef?: { current: unknown }
}) {
  return render(
    <OverlayHost>
      <Popover
        open
        onOpenChange={() => {}}
        {...(options?.closeOnScroll !== undefined
          ? { closeOnScroll: options.closeOnScroll }
          : {})}
      >
        <Popover.Trigger>
          {({ ref }) => (
            <button ref={ref as Ref<HTMLButtonElement>} type="button">
              trigger
            </button>
          )}
        </Popover.Trigger>
        <Popover.Content>
          <Text>popover body</Text>
        </Popover.Content>
      </Popover>
    </OverlayHost>,
  )
}

// Engine gating (§7.3.3): CSS Anchor Positioning is the default engine only
// for caps.anchorPositioning && !boundaryRef && closeOnScroll === false;
// everything else keeps Floating UI, which now writes --overlaid-x/-y +
// top/left 0 instead of inline coordinates. jsdom drops the position-*
// properties themselves, so the anchor-name write (spied) and the absence
// of Floating UI's zero origin are the observable jsdom contract.
describe('anchored position engine selection (web)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.useRealTimers()
    setWebCapabilityOverrides(null)
  })

  it('floating engine emits custom-property coordinates over a zero origin', () => {
    renderPopover()
    advance()

    expect(panel().style.top).toBe('0px')
    expect(panel().style.left).toBe('0px')
    expect(panel().style.getPropertyValue('--overlaid-x')).toMatch(/px$/)
    expect(panel().style.getPropertyValue('--overlaid-y')).toMatch(/px$/)
    expect(panel().getAttribute('data-overlaid-placement')).toBe('bottom-start')
  })

  it('css-anchor engine engages for capable + boundary-less + scroll-pinned instances', () => {
    setWebCapabilityOverrides({ anchorPositioning: true })
    const setProperty = jest.spyOn(CSSStyleDeclaration.prototype, 'setProperty')
    renderPopover({ closeOnScroll: false })
    advance()

    // The presentation gate must still open (isPositioned via attachment).
    expect(panel().getAttribute('data-overlaid-state')).toBe('open')
    expect(screen.getByText('popover body')).toBeTruthy()
    // No Floating UI origin, no coordinate custom properties…
    expect(panel().style.top).toBe('')
    expect(panel().style.getPropertyValue('--overlaid-x')).toBe('')
    // …the offset margin on the anchor-facing side instead,
    expect(panel().style.marginTop).toBe('4px')
    // and the trigger carries the instance's anchor-name.
    const anchorWrites = setProperty.mock.calls.filter(
      ([name]) => name === 'anchor-name',
    )
    expect(anchorWrites).toHaveLength(1)
    expect(String(anchorWrites[0]?.[1])).toMatch(/^--overlaid-anchor-/)
    setProperty.mockRestore()
  })

  it('closeOnScroll default keeps Floating UI even when capable', () => {
    setWebCapabilityOverrides({ anchorPositioning: true })
    renderPopover()
    advance()

    expect(panel().style.top).toBe('0px')
    expect(panel().style.getPropertyValue('--overlaid-x')).toMatch(/px$/)
  })

  it('a boundaryRef keeps Floating UI even when capable and scroll-pinned', () => {
    setWebCapabilityOverrides({ anchorPositioning: true })
    const boundaryRef = createRef<HTMLDivElement>()
    render(
      <OverlayHost>
        <div ref={boundaryRef}>
          <Tooltip
            text="Bounded tooltip"
            boundaryRef={boundaryRef}
            closeOnScroll={false}
          >
            {(props) => (
              <button
                ref={props.ref as Ref<HTMLButtonElement>}
                type="button"
                onFocus={props.onFocus as never}
              >
                Tooltip trigger
              </button>
            )}
          </Tooltip>
        </div>
      </OverlayHost>,
    )
    fireEvent.focus(screen.getByText('Tooltip trigger'))
    advance()

    const tooltip = document.querySelector(
      '[data-overlaid-kind="tooltip"]',
    ) as HTMLElement
    expect(screen.getByText('Bounded tooltip')).toBeTruthy()
    expect(tooltip.style.top).toBe('0px')
    expect(tooltip.style.getPropertyValue('--overlaid-x')).toMatch(/px$/)
  })
})
