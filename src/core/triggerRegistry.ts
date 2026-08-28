import type { Behavior, NodeRef, Point } from './types'

export type Rect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type TriggerEntry = Readonly<{
  id: string
  ownerEntryId: string
  /** Behavior of the overlay this trigger opens; hints never displace autos. */
  behavior: Behavior
  ref: NodeRef
  onPress: () => void
}>

const triggersByHost = new Map<string, Map<string, TriggerEntry>>()

/** Register by stable id; stale cleanup cannot remove a newer registration. */
export function registerTrigger(
  hostName: string,
  entry: TriggerEntry,
): () => void {
  let host = triggersByHost.get(hostName)
  if (!host) {
    host = new Map()
    triggersByHost.set(hostName, host)
  }
  host.set(entry.id, entry)

  return () => {
    if (host?.get(entry.id) !== entry) return
    host.delete(entry.id)
    if (host.size === 0) triggersByHost.delete(hostName)
  }
}

/**
 * Measure concurrently, then select the newest registered hit. Registrations
 * are revalidated after the async boundary so unmounted/stale triggers can
 * never be fired.
 */
export async function findTriggerAt(
  hostName: string,
  point: Point,
  measure: (ref: NodeRef) => Promise<Rect | undefined>,
): Promise<TriggerEntry | undefined> {
  const host = triggersByHost.get(hostName)
  if (!host) return undefined

  const entries = [...host.values()].reverse()
  const measured = await Promise.all(
    entries.map(async (entry) => {
      try {
        return { entry, bounds: await measure(entry.ref) }
      } catch {
        return { entry, bounds: undefined }
      }
    }),
  )

  for (const { entry, bounds } of measured) {
    if (host.get(entry.id) !== entry || !isValidRect(bounds)) continue
    if (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    ) {
      return entry
    }
  }
  return undefined
}

export function getTriggers(hostName: string): TriggerEntry[] {
  return [...(triggersByHost.get(hostName)?.values() ?? [])]
}

/** Primarily useful for deterministic host teardown and tests. */
export function clearHost(hostName: string): void {
  triggersByHost.delete(hostName)
}

function isValidRect(rect: Rect | undefined): rect is Rect {
  return Boolean(
    rect &&
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width >= 0 &&
    rect.height >= 0,
  )
}
