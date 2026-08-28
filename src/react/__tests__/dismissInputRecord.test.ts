import {
  recordDismissInput,
  resetDismissInputRecord,
  sniffDismissCause,
} from '../dismissInputRecord'

describe('dismissal-cause sniffing', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetDismissInputRecord()
  })
  afterEach(() => jest.useRealTimers())

  it('maps a recent pointerdown to the surface-appropriate press cause', () => {
    recordDismissInput('pointerdown')
    expect(sniffDismissCause('transient')).toBe('outside-press')
    expect(sniffDismissCause('modal')).toBe('backdrop-press')
  })

  it('maps a recent escape to escape on both surfaces', () => {
    recordDismissInput('escape')
    expect(sniffDismissCause('transient')).toBe('escape')
    expect(sniffDismissCause('modal')).toBe('escape')
  })

  it('falls back to escape outside the sniffing window and when nothing was recorded', () => {
    expect(sniffDismissCause('transient')).toBe('escape')
    recordDismissInput('pointerdown')
    jest.advanceTimersByTime(151)
    expect(sniffDismissCause('transient')).toBe('escape')
    expect(sniffDismissCause('modal')).toBe('escape')
  })

  it('uses the newest recorded input', () => {
    recordDismissInput('escape')
    recordDismissInput('pointerdown')
    expect(sniffDismissCause('modal')).toBe('backdrop-press')
  })
})
