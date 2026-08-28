import { resolveExitCeilingMs } from '../exitCeiling'

describe('resolveExitCeilingMs (web)', () => {
  it('is exitMs plus slack when the panel declares no transition', () => {
    const panel = document.createElement('div')
    document.body.appendChild(panel)
    expect(resolveExitCeilingMs(120, panel)).toBe(220)
    panel.remove()
  })

  it('lets a longer computed transition raise the ceiling above exitMs', () => {
    const panel = document.createElement('div')
    panel.style.transitionDuration = '0.5s'
    panel.style.transitionDelay = '0.1s'
    document.body.appendChild(panel)
    expect(resolveExitCeilingMs(120, panel)).toBe(700)
    panel.remove()
  })

  it('keeps exitMs as the floor when the computed transition is shorter', () => {
    const panel = document.createElement('div')
    panel.style.transitionDuration = '50ms'
    document.body.appendChild(panel)
    expect(resolveExitCeilingMs(120, panel)).toBe(220)
    panel.remove()
  })

  it('falls back to exitMs plus slack without a panel element', () => {
    expect(resolveExitCeilingMs(80, null)).toBe(180)
    expect(resolveExitCeilingMs(80, { current: null })).toBe(180)
  })
})
