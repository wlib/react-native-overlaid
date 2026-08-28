import { act, renderHook } from '@testing-library/react'
import type { LayerHost } from '../../core/types'
import {
  useHoverIntent,
  type HoverIntentConfig,
  type HoverIntentHandle,
} from '../useHoverIntent'

// Warmth is keyed by host identity, so a fresh key per test isolates the
// module-level registry without any test-only reset hook.
const freshHost = () => ({}) as LayerHost

const config = (overrides?: Partial<HoverIntentConfig>): HoverIntentConfig => ({
  delayMs: 400,
  warmthMs: 700,
  closeGraceMs: 150,
  ...overrides,
})

type HarnessProps = {
  host: LayerHost
  isOpen: boolean
  config: HoverIntentConfig
}

function setup(host: LayerHost, initial?: Partial<HarnessProps>) {
  const onOpen = jest.fn()
  const onClose = jest.fn()
  const rendered = renderHook(
    (props: HarnessProps) =>
      useHoverIntent(props.host, props.isOpen, props.config, {
        onOpen,
        onClose,
      }),
    {
      initialProps: {
        host,
        isOpen: false,
        config: config(),
        ...initial,
      },
    },
  )
  const handle = (): HoverIntentHandle => rendered.result.current
  return { rendered, handle, onOpen, onClose }
}

const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms))

describe('useHoverIntent', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('waits the full delay on a cold first hover', () => {
    const { handle, onOpen } = setup(freshHost())

    act(() => handle().pointerEnter())
    expect(onOpen).not.toHaveBeenCalled()
    advance(399)
    expect(onOpen).not.toHaveBeenCalled()
    advance(1)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('opens immediately when delay is false', () => {
    const { handle, onOpen } = setup(freshHost(), {
      config: config({ delayMs: false }),
    })
    act(() => handle().pointerEnter())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('leaving before the delay elapses cancels the pending open', () => {
    const { handle, onOpen } = setup(freshHost())

    act(() => handle().pointerEnter())
    advance(200)
    act(() => handle().pointerLeave())
    advance(1000)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('cancel() clears a pending open (Escape while nothing is shown)', () => {
    const { handle, onOpen } = setup(freshHost())

    act(() => handle().pointerEnter())
    act(() => handle().cancel())
    advance(1000)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('opens instantly inside the warm window after a close, and cools off after it', () => {
    const host = freshHost()
    const { rendered, handle, onOpen } = setup(host)

    // A full open/close cycle warms the host at the falling edge.
    rendered.rerender({ host, isOpen: true, config: config() })
    rendered.rerender({ host, isOpen: false, config: config() })

    advance(699)
    act(() => handle().pointerEnter())
    expect(onOpen).toHaveBeenCalledTimes(1)

    // Close again (warm restarts), then let the warmth fully expire: the
    // next hover is cold and pays the delay once more.
    rendered.rerender({ host, isOpen: true, config: config() })
    rendered.rerender({ host, isOpen: false, config: config() })
    advance(700)
    act(() => handle().pointerEnter())
    expect(onOpen).toHaveBeenCalledTimes(1)
    advance(400)
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('warmth: false never grants an instant open', () => {
    const host = freshHost()
    const warmthless = config({ warmthMs: false })
    const { rendered, handle, onOpen } = setup(host, { config: warmthless })

    rendered.rerender({ host, isOpen: true, config: warmthless })
    rendered.rerender({ host, isOpen: false, config: warmthless })
    act(() => handle().pointerEnter())
    expect(onOpen).not.toHaveBeenCalled()
    advance(400)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('a sibling hint open in the same host makes hover instant', () => {
    const host = freshHost()
    const sibling = setup(host)
    sibling.rendered.rerender({ host, isOpen: true, config: config() })

    const { handle, onOpen } = setup(host)
    act(() => handle().pointerEnter())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('hosts do not warm each other', () => {
    const warmedHost = freshHost()
    const closed = setup(warmedHost)
    closed.rendered.rerender({
      host: warmedHost,
      isOpen: true,
      config: config(),
    })
    closed.rendered.rerender({
      host: warmedHost,
      isOpen: false,
      config: config(),
    })

    const { handle, onOpen } = setup(freshHost())
    act(() => handle().pointerEnter())
    expect(onOpen).not.toHaveBeenCalled()
    advance(400)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('closes after the leave grace while open, and re-enter cancels it', () => {
    const host = freshHost()
    const { rendered, handle, onClose } = setup(host)
    rendered.rerender({ host, isOpen: true, config: config() })

    act(() => handle().pointerLeave())
    advance(149)
    expect(onClose).not.toHaveBeenCalled()
    act(() => handle().pointerEnter())
    advance(1000)
    expect(onClose).not.toHaveBeenCalled()

    act(() => handle().pointerLeave())
    advance(150)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('focus opens instantly and blur closes instantly', () => {
    const host = freshHost()
    const { rendered, handle, onOpen, onClose } = setup(host)

    act(() => handle().focus())
    expect(onOpen).toHaveBeenCalledTimes(1)

    rendered.rerender({ host, isOpen: true, config: config() })
    act(() => handle().blur())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('unmounting an open hint releases its registry count and warms the host', () => {
    const host = freshHost()
    const open = setup(host)
    open.rendered.rerender({ host, isOpen: true, config: config() })
    open.rendered.unmount()

    // Not instant-via-openHints (the count was released) but instant via
    // the warm window the unmount started.
    advance(699)
    const { handle, onOpen } = setup(host)
    act(() => handle().pointerEnter())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('resolves a thunk config at the moment a timer is armed', () => {
    const host = freshHost()
    const onOpen = jest.fn()
    const onClose = jest.fn()
    // The delay source changes after mount — the way a CSS timing token
    // only becomes readable at first hover.
    let delayMs: number | false = 400
    const rendered = renderHook(() =>
      useHoverIntent(host, false, () => config({ delayMs }), {
        onOpen,
        onClose,
      }),
    )

    delayMs = 100
    act(() => rendered.result.current.pointerEnter())
    advance(99)
    expect(onOpen).not.toHaveBeenCalled()
    advance(1)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('an open from another channel drops a stale pending timer', () => {
    const host = freshHost()
    const { rendered, handle, onOpen } = setup(host)

    act(() => handle().pointerEnter())
    // Focus (or a tap) opened the hint before the hover delay elapsed.
    rendered.rerender({ host, isOpen: true, config: config() })
    advance(1000)
    expect(onOpen).not.toHaveBeenCalled()
  })
})
