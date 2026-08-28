import { act, render } from '@testing-library/react-native'
import { useAnchorScrollDismiss } from '../useAnchorScrollDismiss'
import { measureNodeInWindow } from '../measurement'

jest.mock('../measurement', () => ({ measureNodeInWindow: jest.fn() }))
const measure = measureNodeInWindow as jest.Mock

function Probe({ onDismiss }: { onDismiss: () => void }) {
  useAnchorScrollDismiss({
    enabled: true,
    triggerRef: { current: {} },
    onDismiss,
  })
  return null
}

describe('native anchor scroll dismissal', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    measure.mockReset()
  })
  afterEach(() => jest.useRealTimers())

  it('establishes a baseline, detects drift, and latches', async () => {
    const onDismiss = jest.fn()
    measure.mockResolvedValue({ x: 0, y: 0, width: 10, height: 10 })
    render(<Probe onDismiss={onDismiss} />)
    await act(async () => undefined)

    measure.mockResolvedValue({ x: 0, y: 10, width: 10, height: 10 })
    await act(async () => {
      jest.advanceTimersByTime(100)
    })
    await act(async () => undefined)
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
