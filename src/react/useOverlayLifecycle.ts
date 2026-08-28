import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import {
  BEHAVIOR,
  PRESENT_GATES,
  decideDismissRequest,
} from '../core/behaviorPolicy'
import {
  reduceLifecycle,
  UNMOUNTED,
  type LifecycleAction,
} from '../core/lifecycle'
import type {
  Behavior,
  DismissEvent,
  Bounds,
  LayerHost,
  LifecycleState,
  OverlayKind,
  Phase,
  PresentGate,
} from '../core/types'
import { useOptionalLayerHost } from './LayerHostContext'

export type OverlayLifecycleInput = {
  open: boolean
  onOpenChange: (next: boolean) => void
  kind: OverlayKind
  behavior: Behavior
  dismissable: boolean
  onDismissRequest?: ((event: DismissEvent) => boolean | void) | undefined
  exitMs: number
  presentGates?: ReadonlyArray<PresentGate> | undefined
  parentEntryId?: string | null
}

export function useOverlayLifecycle(input: OverlayLifecycleInput) {
  const gates = input.presentGates ?? PRESENT_GATES[input.kind]
  const id = useId()
  const host = useOptionalLayerHost()
  const panelRef = useRef<unknown>(null)
  const triggerRef = useRef<unknown>(null)
  const boundsRef = useRef<Bounds | null>(null)
  const registeredHost = useRef<LayerHost | null>(null)
  const gatesRef = useRef(gates)
  const onChangeRef = useRef(input.onOpenChange)
  const vetoRef = useRef(input.onDismissRequest)
  const notifiedThisCycle = useRef(false)
  gatesRef.current = gates
  onChangeRef.current = input.onOpenChange
  vetoRef.current = input.onDismissRequest

  const reducer = useCallback(
    (state: LifecycleState, action: LifecycleAction) =>
      reduceLifecycle(gatesRef.current, state, action),
    [],
  )
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    (): LifecycleState =>
      input.open
        ? reduceLifecycle(gates, UNMOUNTED, { type: 'open' })
        : UNMOUNTED,
  )
  const stateRef = useRef(state)
  stateRef.current = state

  // Eagerly advance the ref as well as React state. Multiple dismissal inputs
  // in one event turn must observe the first transition's dying state.
  const send = useCallback((action: LifecycleAction) => {
    const previous = stateRef.current
    const next = reduceLifecycle(gatesRef.current, previous, action)
    if (
      action.type === 'open' &&
      previous.phase !== 'mounting' &&
      previous.phase !== 'presented'
    ) {
      notifiedThisCycle.current = false
    }
    stateRef.current = next
    dispatch(action)
  }, [])

  useEffect(() => {
    send(
      input.open ? { type: 'open' } : { type: 'request-close', notify: false },
    )
  }, [input.open, send])

  useEffect(() => {
    if (state.phase !== 'dismissing') return
    if (input.exitMs <= 0) {
      send({ type: 'exit-complete' })
      return
    }
    const timer = setTimeout(
      () => send({ type: 'exit-complete' }),
      input.exitMs,
    )
    return () => clearTimeout(timer)
  }, [input.exitMs, send, state.phase])

  useEffect(() => {
    if (
      state.phase === 'dismissing' &&
      state.notify &&
      !notifiedThisCycle.current
    ) {
      notifiedThisCycle.current = true
      onChangeRef.current(false)
    }
  }, [state])

  const fire = useCallback(
    (event: DismissEvent, options?: Readonly<{ force?: boolean }>): boolean => {
      const phase = stateRef.current.phase
      const vetoed =
        event !== 'programmatic' && vetoRef.current?.(event) === false
      const decision = decideDismissRequest({
        event,
        vetoed,
        force: options?.force === true,
        dismissable: input.dismissable,
        phase,
      })
      if (decision.kind === 'refuse' || phase === 'unmounted') return false
      if (decision.completion === 'immediate') {
        // Force tears down immediately. Latch notification before queueing it
        // so two synchronous force plans cannot double-notify.
        if (decision.notify && !notifiedThisCycle.current) {
          notifiedThisCycle.current = true
          const notify = () => onChangeRef.current(false)
          if (typeof queueMicrotask === 'function') queueMicrotask(notify)
          else setTimeout(notify, 0)
        }
        send({ type: 'exit-complete' })
        return true
      }
      send({ type: 'request-close', notify: decision.notify })
      return true
    },
    [input.dismissable, send],
  )

  const isMounted = state.phase !== 'unmounted'
  useEffect(() => {
    if (!host || !isMounted) {
      registeredHost.current?.remove(id)
      registeredHost.current = null
      return
    }
    if (registeredHost.current && registeredHost.current !== host) {
      registeredHost.current.remove(id)
    }
    host.push({
      id,
      behavior: input.behavior,
      parentEntryId: input.parentEntryId ?? null,
      panelRef,
      triggerRef,
      boundsRef,
      fire,
    })
    registeredHost.current = host
  }, [fire, host, id, input.behavior, input.parentEntryId, isMounted])

  useEffect(
    () => () => {
      registeredHost.current?.remove(id)
      registeredHost.current = null
    },
    [id],
  )

  // Initial-open and reopen paths can jump directly to presented, so detect
  // the closed -> open-ish edge rather than a particular phase.
  const previousPhase = useRef<Phase>('unmounted')
  useEffect(() => {
    const wasOpen =
      previousPhase.current === 'mounting' ||
      previousPhase.current === 'presented'
    previousPhase.current = state.phase
    const nowOpen = state.phase === 'mounting' || state.phase === 'presented'
    if (
      host &&
      nowOpen &&
      !wasOpen &&
      BEHAVIOR[input.behavior].displacesTransientsOnOpen
    ) {
      host.dismissTransient(id)
    }
  }, [host, id, input.behavior, state.phase])

  const requestDismiss = useCallback(
    (event: DismissEvent) => fire(event),
    [fire],
  )
  const requestClose = useCallback(() => {
    fire('programmatic')
  }, [fire])
  const setOpen = useCallback((next: boolean) => onChangeRef.current(next), [])
  const toggle = useCallback(() => {
    const phase = stateRef.current.phase
    if (phase === 'mounting' || phase === 'presented') fire('programmatic')
    else onChangeRef.current(true)
  }, [fire])
  const onHostShown = useCallback(() => send({ type: 'host-shown' }), [send])
  const onLayoutReady = useCallback(
    () => send({ type: 'layout-ready' }),
    [send],
  )
  const onExitComplete = useCallback(() => {
    // Ignore stale completion from an exit that was interrupted by reopen.
    if (stateRef.current.phase === 'dismissing') send({ type: 'exit-complete' })
  }, [send])
  const onHostDismissed = useCallback(() => {
    // Imperative platform hosts report actual removal. Their host machine
    // filters reopen races before emitting this signal, so no exit phase is
    // required here (an OS gesture can close directly from `presented`).
    if (stateRef.current.phase !== 'unmounted') send({ type: 'exit-complete' })
  }, [send])

  return useMemo(
    () => ({
      id,
      state: {
        phase: state.phase,
        isMounted: state.phase !== 'unmounted',
        isOpen: state.phase === 'mounting' || state.phase === 'presented',
        isPresented: state.phase === 'presented',
      },
      refs: { panel: panelRef, trigger: triggerRef, bounds: boundsRef },
      signals: {
        onHostShown,
        onLayoutReady,
        onExitComplete,
        onHostDismissed,
      },
      actions: { setOpen, toggle, requestClose, requestDismiss },
    }),
    [
      id,
      onExitComplete,
      onHostDismissed,
      onHostShown,
      onLayoutReady,
      requestClose,
      requestDismiss,
      setOpen,
      state.phase,
      toggle,
    ],
  )
}
