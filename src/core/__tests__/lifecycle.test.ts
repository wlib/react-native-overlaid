import { PRESENT_GATES } from '../behaviorPolicy'
import { reduceLifecycle, UNMOUNTED, type LifecycleAction } from '../lifecycle'
import type { LifecycleState, OverlayKind, PresentGate } from '../types'

const open = { type: 'open' } as const
const hostShown = { type: 'host-shown' } as const
const layoutReady = { type: 'layout-ready' } as const
const exitComplete = { type: 'exit-complete' } as const
const close = (notify: boolean): LifecycleAction => ({
  type: 'request-close',
  notify,
})

function run(
  gates: readonly PresentGate[],
  actions: readonly LifecycleAction[],
  initial: LifecycleState = UNMOUNTED,
): LifecycleState {
  return actions.reduce(
    (state, action) => reduceLifecycle(gates, state, action),
    initial,
  )
}

describe('lifecycle presentation gates', () => {
  it.each<[OverlayKind, readonly LifecycleAction[]]>([
    ['dialog', [hostShown]],
    ['drawer', [hostShown]],
    ['sheet', [hostShown, layoutReady]],
    ['popover', [layoutReady]],
    ['tooltip', [layoutReady]],
  ])('%s presents only after all gates', (kind, signals) => {
    let state = reduceLifecycle(PRESENT_GATES[kind], UNMOUNTED, open)
    for (const signal of signals) {
      state = reduceLifecycle(PRESENT_GATES[kind], state, signal)
    }
    expect(state).toEqual({ phase: 'presented' })
  })

  it('records early signals while still mounting', () => {
    expect(run(PRESENT_GATES.sheet, [open, hostShown])).toEqual({
      phase: 'mounting',
      hostShown: true,
      layoutReady: false,
    })
  })

  it('presents immediately with no gates', () => {
    expect(reduceLifecycle([], UNMOUNTED, open)).toEqual({ phase: 'presented' })
  })
})

describe('lifecycle dismissal and reopen', () => {
  it('retains actual gate state when closed during mounting', () => {
    expect(run(PRESENT_GATES.sheet, [open, hostShown, close(false)])).toEqual({
      phase: 'dismissing',
      notify: false,
      hostShown: true,
      layoutReady: false,
    })
  })

  it('carries satisfied gates through a reopen during exit', () => {
    expect(
      run(PRESENT_GATES.sheet, [
        open,
        hostShown,
        layoutReady,
        close(true),
        open,
      ]),
    ).toEqual({ phase: 'presented' })
  })

  it('remembers a late gate while dismissing', () => {
    expect(
      run(PRESENT_GATES.sheet, [
        open,
        hostShown,
        close(true),
        layoutReady,
        open,
      ]),
    ).toEqual({ phase: 'presented' })
  })

  it('makes repeated open/close requests idempotent', () => {
    const mounting = run(PRESENT_GATES.sheet, [open])
    expect(reduceLifecycle(PRESENT_GATES.sheet, mounting, open)).toBe(mounting)
    const dismissing = reduceLifecycle(
      PRESENT_GATES.sheet,
      mounting,
      close(true),
    )
    expect(reduceLifecycle(PRESENT_GATES.sheet, dismissing, close(false))).toBe(
      dismissing,
    )
  })

  it('accepts real native completion from every mounted phase', () => {
    for (const state of [
      run(PRESENT_GATES.sheet, [open]),
      run(PRESENT_GATES.sheet, [open, hostShown, layoutReady]),
      run(PRESENT_GATES.sheet, [open, close(true)]),
    ]) {
      expect(reduceLifecycle(PRESENT_GATES.sheet, state, exitComplete)).toBe(
        UNMOUNTED,
      )
    }
  })
})

describe('lifecycle totality', () => {
  const states: LifecycleState[] = [
    UNMOUNTED,
    { phase: 'mounting', hostShown: false, layoutReady: false },
    { phase: 'presented' },
    {
      phase: 'dismissing',
      notify: true,
      hostShown: true,
      layoutReady: true,
    },
  ]
  const actions: LifecycleAction[] = [
    open,
    hostShown,
    layoutReady,
    close(true),
    exitComplete,
  ]

  it.each(
    states.flatMap((state) =>
      actions.map((action) => [state, action] as const),
    ),
  )('handles %p x %p', (state, action) => {
    expect(reduceLifecycle(PRESENT_GATES.sheet, state, action)).toBeDefined()
  })
})
