import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { useAnchorScrollDismiss } from '../useAnchorScrollDismiss'

function Probe({ onDismiss }: { onDismiss: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useAnchorScrollDismiss({
    enabled: true,
    triggerRef: { current: null },
    panelRef,
    onDismiss,
  })
  return (
    <div ref={panelRef}>
      <div data-testid="inside" />
    </div>
  )
}

describe('web anchor scroll dismissal', () => {
  it('ignores panel scroll, dismisses external scroll, and latches', () => {
    const onDismiss = jest.fn()
    const screen = render(<Probe onDismiss={onDismiss} />)
    act(() => screen.getByTestId('inside').dispatchEvent(new Event('scroll')))
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      document.body.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
