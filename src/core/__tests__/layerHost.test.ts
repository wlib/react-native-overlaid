import { createLayerHost, deepestAttachedDescendant } from '../layerHost'
import type { Behavior, LayerEntry } from '../types'

function layer(
  id: string,
  behavior: Behavior,
  fire: jest.Mock,
  parentEntryId: string | null = null,
): LayerEntry {
  return {
    id,
    behavior,
    parentEntryId,
    panelRef: { current: null },
    triggerRef: { current: null },
    fire: fire as LayerEntry['fire'],
  }
}

describe('layer host execution', () => {
  it('continues past a dying transient but a refusing modal swallows', () => {
    const host = createLayerHost('root', null)
    const below = jest.fn(() => true)
    const dying = jest.fn(() => false)
    host.push(layer('below', 'auto', below))
    host.push(layer('dying', 'auto', dying))
    expect(host.dispatchEscape()).toBe('handled')
    expect(dying).toHaveBeenCalledWith('escape')
    expect(below).toHaveBeenCalledWith('escape')

    host.push(
      layer(
        'modal',
        'modal',
        jest.fn(() => false),
      ),
    )
    expect(host.dispatchBackButton()).toBe('swallowed')
    expect(below).toHaveBeenCalledTimes(1)
  })

  it('reports escape unhandled when a platform-channel entry owns it', () => {
    // The browser both closes the delegated layer and must see an
    // unprevented keydown — 'swallowed'/'handled' would preventDefault and
    // suppress the browser's own close request.
    const host = createLayerHost('root', null)
    const managedModal = jest.fn(() => false)
    const delegated = jest.fn(() => true)
    host.push(layer('modal', 'modal', managedModal))
    host.push({ ...layer('delegated', 'auto', delegated), channel: 'platform' })

    expect(host.dispatchEscape()).toBe('unhandled')
    expect(delegated).not.toHaveBeenCalled()
    expect(managedModal).not.toHaveBeenCalled()
  })

  it('never fires a platform-channel entry on outside press', () => {
    const host = createLayerHost('root', null)
    const managed = jest.fn(() => true)
    const delegated = jest.fn(() => true)
    host.push(layer('managed', 'auto', managed))
    host.push({ ...layer('delegated', 'auto', delegated), channel: 'platform' })

    expect(host.dispatchOutsidePress({ x: 0, y: 0 }, null)).toBe(true)
    expect(managed).toHaveBeenCalledWith('outside-press')
    expect(delegated).not.toHaveBeenCalled()
  })

  it('force-displaces unrelated transient layers', () => {
    const host = createLayerHost('root', null)
    const unrelated = jest.fn(() => true)
    const parent = jest.fn(() => true)
    const child = jest.fn(() => true)
    host.push(layer('unrelated', 'auto', unrelated))
    host.push(layer('parent', 'auto', parent))
    host.push(layer('child', 'auto', child, 'parent'))
    expect(host.dismissTransient('child')).toBe(true)
    expect(unrelated).toHaveBeenCalledWith('outside-press', { force: true })
    expect(parent).not.toHaveBeenCalled()
  })

  it('uses structural containment without referencing DOM globals', () => {
    const host = createLayerHost('root', null)
    const target = {}
    const panel = { contains: (candidate: unknown) => candidate === target }
    const fire = jest.fn(() => true)
    host.push({
      ...layer('popover', 'auto', fire),
      panelRef: { current: panel },
    })
    expect(host.dispatchOutsidePress({ x: 0, y: 0 }, target)).toBe(false)
    expect(fire).not.toHaveBeenCalled()
  })

  it('uses page bounds to preserve native ancestor containment', () => {
    const host = createLayerHost('root', null)
    const parent = jest.fn(() => true)
    const child = jest.fn(() => true)
    host.push({
      ...layer('parent', 'auto', parent),
      boundsRef: {
        current: { x: 0, y: 0, width: 200, height: 200 },
      },
    })
    host.push({
      ...layer('child', 'auto', child, 'parent'),
      boundsRef: {
        current: { x: 50, y: 50, width: 100, height: 100 },
      },
    })

    expect(host.dispatchOutsidePress({ x: 20, y: 20 }, null)).toBe(true)
    expect(child).toHaveBeenCalledWith('outside-press')
    expect(parent).not.toHaveBeenCalled()
  })
})

describe('layer host maintenance', () => {
  it('updates without promotion and only notifies for real removal', () => {
    const host = createLayerHost('root', null)
    const listener = jest.fn()
    host.subscribe(listener)
    host.push(
      layer(
        'first',
        'auto',
        jest.fn(() => true),
      ),
    )
    host.push(
      layer(
        'second',
        'auto',
        jest.fn(() => true),
      ),
    )
    host.push(
      layer(
        'first',
        'hint',
        jest.fn(() => true),
      ),
    )
    expect(host.getStack().map(({ id }) => id)).toEqual(['first', 'second'])
    expect(listener).toHaveBeenCalledTimes(3)
    host.remove('missing')
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('closeAll snapshots and walks top-down', () => {
    const host = createLayerHost('root', null)
    const order: string[] = []
    const top = jest.fn(() => {
      order.push('top')
      host.push(
        layer(
          'new',
          'auto',
          jest.fn(() => true),
        ),
      )
      return true
    })
    const bottom = jest.fn(() => {
      order.push('bottom')
      return true
    })
    host.push(layer('bottom', 'modal', bottom))
    host.push(layer('top', 'auto', top))
    expect(host.closeAll()).toBe(true)
    expect(order).toEqual(['top', 'bottom'])
    expect(host.getStack().some(({ id }) => id === 'new')).toBe(true)
  })

  it('closeAll visits newer child windows before its local stack', () => {
    const root = createLayerHost('root', null)
    const child = createLayerHost('child', root)
    root.attachChild(child)
    const order: string[] = []
    root.push(
      layer(
        'root-layer',
        'modal',
        jest.fn(() => {
          order.push('root')
          return true
        }),
      ),
    )
    child.push(
      layer(
        'child-layer',
        'auto',
        jest.fn(() => {
          order.push('child')
          return true
        }),
      ),
    )
    expect(root.closeAll()).toBe(true)
    expect(order).toEqual(['child', 'root'])
  })

  it('rejects cycles hidden in an older child-host branch', () => {
    const host = createLayerHost('host', null)
    const candidate = createLayerHost('candidate', null)
    const olderBranch = createLayerHost('older', candidate)
    const newerBranch = createLayerHost('newer', candidate)
    candidate.attachChild(olderBranch)
    candidate.attachChild(newerBranch)
    olderBranch.attachChild(host)

    host.attachChild(candidate)
    expect(host.getChildren()).not.toContain(candidate)
  })
})

describe('nested hosts', () => {
  it('delegates upward only when the local host has no blocker', () => {
    const root = createLayerHost('root', null)
    const child = createLayerHost('child', root)
    const rootFire = jest.fn(() => true)
    root.push(layer('root-layer', 'auto', rootFire))
    expect(child.dispatchEscape()).toBe('handled')

    child.push(
      layer(
        'modal',
        'modal',
        jest.fn(() => false),
      ),
    )
    expect(child.dispatchEscape()).toBe('swallowed')
    expect(rootFire).toHaveBeenCalledTimes(1)
  })

  it('selects the newest deepest attached window and resists cycles', () => {
    const root = createLayerHost('root', null)
    const old = createLayerHost('old', root)
    const recent = createLayerHost('recent', root)
    const nested = createLayerHost('nested', recent)
    root.attachChild(old)
    root.attachChild(recent)
    recent.attachChild(nested)
    nested.attachChild(root)
    expect(deepestAttachedDescendant(root)).toBe(nested)
    recent.detachChild(nested)
    root.detachChild(recent)
    expect(deepestAttachedDescendant(root)).toBe(old)
  })
})
