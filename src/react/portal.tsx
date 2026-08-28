import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { measureNodeInWindow } from './measurement'

type HostRender = (nodes: ReactNode) => void
type HostRegistration = { render: HostRender }

class PortalRegistry {
  private readonly hosts = new Map<string, HostRegistration[]>()
  private readonly content = new Map<string, Map<string, ReactNode>>()

  registerHost(name: string, render: HostRender): () => void {
    const registration = { render }
    const hosts = this.hosts.get(name) ?? []
    hosts[hosts.length - 1]?.render(null)
    this.hosts.set(name, [...hosts, registration])
    this.flush(name)
    return () => {
      const current = this.hosts.get(name)
      if (!current) return
      const wasActive = current[current.length - 1] === registration
      const next = current.filter((item) => item !== registration)
      if (next.length) this.hosts.set(name, next)
      else this.hosts.delete(name)
      // If an overlapping replacement disappears, restore the older live host.
      if (wasActive && next.length) this.flush(name)
    }
  }

  setPortal(hostName: string, key: string, node: ReactNode): void {
    const content = this.content.get(hostName) ?? new Map<string, ReactNode>()
    content.set(key, node)
    this.content.set(hostName, content)
    this.flush(hostName)
  }

  removePortal(hostName: string, key: string): void {
    const content = this.content.get(hostName)
    if (!content) return
    content.delete(key)
    if (!content.size) this.content.delete(hostName)
    this.flush(hostName)
  }

  private flush(name: string): void {
    const hosts = this.hosts.get(name)
    const render = hosts?.[hosts.length - 1]?.render
    if (!render) return
    const content = this.content.get(name)
    render(
      content
        ? Array.from(content, ([key, node]) => (
            <Fragment key={key}>{node}</Fragment>
          ))
        : null,
    )
  }
}

const PortalRegistryContext = createContext<PortalRegistry | null>(null)

export function PortalScope({ children }: { children?: ReactNode }) {
  const registry = useMemo(() => new PortalRegistry(), [])
  return (
    <PortalRegistryContext.Provider value={registry}>
      {children}
    </PortalRegistryContext.Provider>
  )
}

function useRegistry(component: string): PortalRegistry {
  const registry = useContext(PortalRegistryContext)
  if (!registry) {
    throw new Error(`${component} must be used inside the native <OverlayHost>`)
  }
  return registry
}

export type HostOffset = {
  x: number
  y: number
  ready: boolean
  remeasure: () => void
}

const HostOffsetContext = createContext<HostOffset>({
  x: 0,
  y: 0,
  ready: false,
  remeasure: () => undefined,
})

export function useHostOffset(): HostOffset {
  return useContext(HostOffsetContext)
}

export function PortalHost({
  name,
  style,
}: {
  name: string
  style?: StyleProp<ViewStyle>
}) {
  const registry = useRegistry('PortalHost')
  const [nodes, setNodes] = useState<ReactNode>(null)
  const viewRef = useRef<View | null>(null)
  const [origin, setOrigin] = useState({ x: 0, y: 0, ready: false })
  const measureGeneration = useRef(0)

  useLayoutEffect(() => registry.registerHost(name, setNodes), [name, registry])

  const remeasure = useCallback(() => {
    const generation = ++measureGeneration.current
    void measureNodeInWindow(viewRef).then((measurement) => {
      if (!measurement || generation !== measureGeneration.current) return
      setOrigin((previous) =>
        previous.ready &&
        previous.x === measurement.x &&
        previous.y === measurement.y
          ? previous
          : { x: measurement.x, y: measurement.y, ready: true },
      )
    })
  }, [])

  useLayoutEffect(
    () => () => {
      measureGeneration.current += 1
    },
    [],
  )

  const offset = useMemo<HostOffset>(
    () => ({ ...origin, remeasure }),
    [origin, remeasure],
  )

  return (
    <View
      ref={viewRef}
      collapsable={false}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, style]}
      onLayout={remeasure}
    >
      <HostOffsetContext.Provider value={offset}>
        {nodes}
      </HostOffsetContext.Provider>
    </View>
  )
}

export function Portal({
  hostName,
  children,
}: {
  hostName: string
  children?: ReactNode
}) {
  const registry = useRegistry('Portal')
  const key = useId()

  // Publish each commit so source props/context bridge values remain current.
  useLayoutEffect(() => {
    registry.setPortal(hostName, key, children)
  })
  useLayoutEffect(
    () => () => registry.removePortal(hostName, key),
    [hostName, key, registry],
  )
  return null
}
