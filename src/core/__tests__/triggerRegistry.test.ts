import {
  clearHost,
  findTriggerAt,
  getTriggers,
  registerTrigger,
  type TriggerEntry,
} from '../triggerRegistry'

function trigger(id: string): TriggerEntry {
  return {
    id,
    ownerEntryId: id,
    behavior: 'auto',
    ref: { current: {} },
    onPress: jest.fn(),
  }
}

describe('native trigger registry', () => {
  afterEach(() => clearHost('test'))

  it('finds inclusive bounds and prefers the newest overlapping trigger', async () => {
    registerTrigger('test', trigger('old'))
    registerTrigger('test', trigger('new'))
    const match = await findTriggerAt('test', { x: 10, y: 30 }, async () => ({
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    }))
    expect(match?.id).toBe('new')
  })

  it('measures concurrently and isolates measurement failures', async () => {
    let active = 0
    let maximum = 0
    for (const id of ['a', 'b', 'c']) registerTrigger('test', trigger(id))

    const match = await findTriggerAt('test', { x: -1, y: -1 }, async (ref) => {
      active += 1
      maximum = Math.max(maximum, active)
      await Promise.resolve()
      active -= 1
      if (ref === getTriggers('test')[0]?.ref) throw new Error('unmeasurable')
      return { x: 0, y: 0, width: 10, height: 10 }
    })
    expect(match).toBeUndefined()
    expect(maximum).toBe(3)
  })

  it('does not return an entry removed during async measurement', async () => {
    const unregister = registerTrigger('test', trigger('stale'))
    let resolveMeasure:
      | ((value: {
          x: number
          y: number
          width: number
          height: number
        }) => void)
      | undefined
    const pending = findTriggerAt(
      'test',
      { x: 5, y: 5 },
      () =>
        new Promise((resolve) => {
          resolveMeasure = resolve
        }),
    )
    unregister()
    resolveMeasure?.({ x: 0, y: 0, width: 10, height: 10 })
    await expect(pending).resolves.toBeUndefined()
  })

  it('stale cleanup cannot remove a replacement with the same id', () => {
    const old = trigger('same')
    const replacement = trigger('same')
    const unregisterOld = registerTrigger('test', old)
    registerTrigger('test', replacement)
    unregisterOld()
    expect(getTriggers('test')).toEqual([replacement])
  })

  it('rejects malformed bounds', async () => {
    registerTrigger('test', trigger('a'))
    await expect(
      findTriggerAt('test', { x: 0, y: 0 }, async () => ({
        x: 0,
        y: 0,
        width: -1,
        height: 10,
      })),
    ).resolves.toBeUndefined()
  })
})
