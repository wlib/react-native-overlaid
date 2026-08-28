import { act, render } from '@testing-library/react-native'
import { AccessibilityInfo, Animated } from 'react-native'
import type { Phase } from '../../core/types'
import { useRevealStyle } from '../useRevealStyle'

function Probe({ phase }: { phase: Phase }) {
  useRevealStyle({ kind: 'fade' }, phase, 180)
  return null
}

describe('native reveal reduced motion', () => {
  afterEach(() => jest.restoreAllMocks())

  it('preserves phase transitions while reducing their duration to zero', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true)
    const animation = {
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as ReturnType<typeof Animated.timing>
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue(animation)

    const screen = render(<Probe phase="mounting" />)
    await act(async () => {})
    screen.rerender(<Probe phase="presented" />)

    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }),
    )
    expect(animation.start).toHaveBeenCalled()
  })
})
