import {
  reduceSheetHost,
  type SheetHostCommand,
  type SheetHostEvent,
  type SheetHostState,
} from '../sheetHostMachine'

type Row = readonly [
  SheetHostState,
  SheetHostEvent,
  SheetHostState,
  readonly SheetHostCommand[] | undefined,
]

const STATES: readonly SheetHostState[] = [
  'closed',
  'open',
  'closing',
  'reopening',
]
const EVENTS: readonly SheetHostEvent[] = [
  'OPEN',
  'CLOSE',
  'DID_PRESENT',
  'DID_DISMISS',
]

describe('native sheet host machine', () => {
  it.each<Row>([
    ['closed', 'OPEN', 'open', ['present']],
    ['open', 'DID_PRESENT', 'open', ['hostShown']],
    ['open', 'CLOSE', 'closing', ['dismiss']],
    ['open', 'DID_DISMISS', 'closed', ['notifyClosed', 'exitComplete']],
    ['closing', 'DID_DISMISS', 'closed', ['exitComplete']],
    ['closing', 'OPEN', 'reopening', undefined],
    ['reopening', 'DID_DISMISS', 'open', ['present']],
    ['reopening', 'CLOSE', 'closing', undefined],
    ['closed', 'DID_DISMISS', 'closed', undefined],
    ['open', 'OPEN', 'open', undefined],
    ['closing', 'CLOSE', 'closing', undefined],
    ['reopening', 'OPEN', 'reopening', undefined],
  ])('%s x %s -> %s and %p', (state, event, expected, commands) => {
    expect(reduceSheetHost(state, event)).toEqual(
      commands ? { state: expected, commands } : { state: expected },
    )
  })

  it('is total across every state/event pair', () => {
    for (const state of STATES) {
      for (const event of EVENTS) {
        expect(STATES).toContain(reduceSheetHost(state, event).state)
      }
    }
  })

  it('classifies native versus JS dismissal from machine state', () => {
    expect(reduceSheetHost('open', 'DID_DISMISS').commands).toContain(
      'notifyClosed',
    )
    expect(reduceSheetHost('closing', 'DID_DISMISS').commands).not.toContain(
      'notifyClosed',
    )
  })
})
