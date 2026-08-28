import {
  isInterestCapableTrigger,
  readTooltipTimingTokens,
} from '../tooltipTiming'

describe('readTooltipTimingTokens (web)', () => {
  it('reads unit-carrying tokens from the computed style', () => {
    const trigger = document.createElement('button')
    trigger.style.setProperty('--overlaid-tooltip-delay', '250ms')
    trigger.style.setProperty('--overlaid-tooltip-warmth', '1.5s')
    document.body.appendChild(trigger)

    expect(readTooltipTimingTokens(trigger)).toEqual({
      delayMs: 250,
      warmthMs: 1500,
    })
    trigger.remove()
  })

  it('reads unset or unitless tokens as absent (null, never 0)', () => {
    const trigger = document.createElement('button')
    trigger.style.setProperty('--overlaid-tooltip-delay', '400')
    document.body.appendChild(trigger)

    expect(readTooltipTimingTokens(trigger)).toEqual({
      delayMs: null,
      warmthMs: null,
    })
    trigger.remove()
  })

  it('caches per element: the first read wins for that trigger', () => {
    const trigger = document.createElement('button')
    trigger.style.setProperty('--overlaid-tooltip-delay', '100ms')
    document.body.appendChild(trigger)

    expect(readTooltipTimingTokens(trigger)?.delayMs).toBe(100)
    trigger.style.setProperty('--overlaid-tooltip-delay', '900ms')
    expect(readTooltipTimingTokens(trigger)?.delayMs).toBe(100)
    trigger.remove()
  })

  it('is null for non-elements', () => {
    expect(readTooltipTimingTokens(null)).toBeNull()
    expect(readTooltipTimingTokens({ current: null })).toBeNull()
  })
})

describe('isInterestCapableTrigger (web)', () => {
  it("accepts interestfor's allowed hosts only", () => {
    const anchor = document.createElement('a')
    expect(isInterestCapableTrigger(document.createElement('button'))).toBe(
      true,
    )
    expect(isInterestCapableTrigger(anchor)).toBe(false)
    anchor.setAttribute('href', '/docs')
    expect(isInterestCapableTrigger(anchor)).toBe(true)
    expect(isInterestCapableTrigger(document.createElement('area'))).toBe(true)
    expect(isInterestCapableTrigger(document.createElement('div'))).toBe(false)
    expect(isInterestCapableTrigger(null)).toBe(false)
  })
})
