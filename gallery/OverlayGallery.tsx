/**
 * OverlayGallery — a dependency-free story browser for iOS/Android dev apps.
 *
 * No navigation library: a single useState drives list ⇄ scenario screens.
 * Wraps everything in OverlayHost so every scenario runs under a real layer
 * host, exactly as an app would. Pass `insets` (safe-area top/bottom, e.g.
 * from react-native-safe-area-context in the host app) instead of pulling in
 * a safe-area dependency — the gallery pads its own list with them and
 * provides them to scenarios, which forward them to overlay components.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { OverlayHost, type OverlayInsets } from '../src'
import { deepestAttachedDescendant } from '../src/core/layerHost'
import { useLayerHost } from '../src/react/LayerHostContext'
import { AutoPressProvider } from './autoPress'
import { scenarios, type Scenario } from './scenarios'
import { GalleryInsetsProvider } from './scenarios/insets'

/**
 * Deep-link routes for automated capture and QA shortcuts:
 *   <scheme>://scenario/<key>[?autopress=1]   open one scenario screen
 *   <scheme>://home                           back to the list
 * `autopress=1` makes helper Buttons titled "Open …"/"Toggle …" press
 * themselves after mount, so screenshot tooling can capture open overlays
 * without injecting taps.
 */
function parseGalleryUrl(
  url: string,
): { key: string; autopress: boolean } | null {
  const match = /:\/\/(?:scenario\/([^/?#]+)|home)(?:\?([^#]*))?/.exec(url)
  if (!match) return null
  const key = match[1] ? decodeURIComponent(match[1]) : ''
  const autopress = /(?:^|&)autopress=1(?:&|$)/.test(match[2] ?? '')
  return { key, autopress }
}

/**
 * Dev-build route channel for zero-touch automation: the Metro config in
 * example/metro.config.js serves example/.overlaid-route.json at
 * /overlaid-route on the bundler origin, and scripts/screenshots-ios.mjs
 * writes it to navigate the gallery without taps (deep links from simctl
 * hit iOS's one-time "Open in app?" prompt). Native dev builds only.
 */
function bundlerOrigin(): string | null {
  try {
    // Internal but stable across RN versions (and new-arch safe, where
    // NativeModules.SourceCode is no longer populated). Web resolves this
    // module too, so bail there via the http check on the reported URL.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const getDevServer =
      require('react-native/Libraries/Core/Devtools/getDevServer') as
        (() => { url?: string }) | { default?: () => { url?: string } }
    const resolved =
      typeof getDevServer === 'function' ? getDevServer : getDevServer.default
    const url = resolved?.().url
    if (!url || !/^https?:/.test(url)) return null
    return url.replace(/\/+$/, '')
  } catch {
    return null
  }
}

// TrueSheet is an optional peer dependency; a plain import would crash the
// whole gallery when it isn't installed. The guarded require only tells us
// the JS package resolves — inside Expo Go the package exists but its native
// module doesn't, so Sheet scenarios still need a dev build (see
// example/README.md). We surface the note for the resolvable-but-untested
// case too, since we can't probe the native side without rendering one.
declare function require(id: string): unknown
function detectTrueSheet(): boolean {
  try {
    require('@lodev09/react-native-true-sheet')
    return true
  } catch {
    return false
  }
}
const HAS_TRUE_SHEET = detectTrueSheet()

/**
 * Video tooling's dismissal driver: `dismissAfter` (ms) in the route payload
 * escapes the layer stack through the kernel's own routing — the same path a
 * user's Escape/back takes — so capture scripts can film each family's real
 * exit animation with no injected input. Repeats every 900 ms until the walk
 * reports 'unhandled', unwinding stacked scenarios one animated layer at a
 * time.
 */
function AutoDismissDriver({
  delayMs,
  seq,
}: {
  delayMs: number | null
  seq: number
}) {
  const host = useLayerHost()
  useEffect(() => {
    if (delayMs === null) return
    let timer: ReturnType<typeof setTimeout>
    const fire = () => {
      const outcome = deepestAttachedDescendant(host).dispatchEscape()
      if (outcome !== 'unhandled') timer = setTimeout(fire, 900)
    }
    timer = setTimeout(fire, delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, host, seq])
  return null
}

type Family = Scenario['family']
const FAMILIES: readonly Family[] = [
  'Dialog',
  'Sheet',
  'Drawer',
  'Popover',
  'Tooltip',
  'Stacking',
]

const usesSheet = (s: Scenario) =>
  s.family === 'Sheet' || s.key === 'stacking-tooltip-in-sheet'

export function OverlayGallery({
  insets = {},
}: {
  /** Safe-area insets from the host app (e.g. useSafeAreaInsets()). */
  insets?: OverlayInsets
}) {
  const [filter, setFilter] = useState<Family | 'All'>('All')
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [autoPress, setAutoPress] = useState(false)
  const [dismissAfter, setDismissAfter] = useState<number | null>(null)
  const [routeSeq, setRouteSeq] = useState(0)

  useEffect(() => {
    const apply = (url: string | null) => {
      const route = url ? parseGalleryUrl(url) : null
      if (!route) return
      const exists = scenarios.some((s) => s.key === route.key)
      setActiveKey(exists ? route.key : null)
      setAutoPress(exists && route.autopress)
    }
    Linking.getInitialURL().then(apply, () => {})
    const subscription = Linking.addEventListener('url', (event) =>
      apply(event.url),
    )
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!__DEV__) return
    const origin = bundlerOrigin()
    if (origin === null) return
    let lastNonce = ''
    let cancelled = false
    const timer = setInterval(() => {
      fetch(`${origin}/overlaid-route?ts=${Date.now()}`)
        .then((response) => response.json())
        .then(
          (
            route: {
              nonce?: string
              key?: string
              autopress?: boolean
              dismissAfter?: number
            } | null,
          ) => {
            if (cancelled || !route || typeof route.nonce !== 'string') return
            if (route.nonce === lastNonce) return
            lastNonce = route.nonce
            const key = route.key ?? ''
            const exists = scenarios.some((s) => s.key === key)
            setActiveKey(exists ? key : null)
            setAutoPress(exists && route.autopress === true)
            setDismissAfter(
              exists && typeof route.dismissAfter === 'number'
                ? route.dismissAfter
                : null,
            )
            setRouteSeq((seq) => seq + 1)
          },
        )
        .catch(() => {})
    }, 400)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const active = scenarios.find((s) => s.key === activeKey)

  const sections = useMemo(() => {
    const visible = scenarios.filter(
      (s) => !s.webOnly && (filter === 'All' || s.family === filter),
    )
    return FAMILIES.map((family) => ({
      title: family,
      data: visible.filter((s) => s.family === family),
    })).filter((section) => section.data.length > 0)
  }, [filter])

  return (
    <OverlayHost>
      <AutoDismissDriver delayMs={dismissAfter} seq={routeSeq} />
      <GalleryInsetsProvider value={insets}>
        <View
          style={[
            styles.root,
            { paddingTop: insets.top ?? 0, paddingBottom: insets.bottom ?? 0 },
          ]}
        >
          {active ? (
            <AutoPressProvider value={autoPress}>
              <ScenarioScreen
                key={`${active.key}:${autoPress}`}
                scenario={active}
                onBack={() => {
                  setActiveKey(null)
                  setAutoPress(false)
                }}
              />
            </AutoPressProvider>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.appTitle}>react-native-overlaid</Text>
                <Text style={styles.appSubtitle}>
                  Overlay scenarios — native QA gallery
                </Text>
              </View>
              <View style={styles.filterRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterContent}
                >
                  {(['All', ...FAMILIES] as const).map((family) => {
                    const selected = filter === family
                    return (
                      <Pressable
                        key={family}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setFilter(family)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            selected && styles.chipLabelSelected,
                          ]}
                        >
                          {family}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
              <SectionList
                sections={sections}
                keyExtractor={(s) => s.key}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={Separator}
                renderSectionHeader={({ section }) => (
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                )}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActiveKey(item.key)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.rowDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                )}
              />
            </>
          )}
        </View>
      </GalleryInsetsProvider>
    </OverlayHost>
  )
}

function ScenarioScreen({
  scenario,
  onBack,
}: {
  scenario: Scenario
  onBack: () => void
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.backLabel}>‹ Scenarios</Text>
        </Pressable>
        <Text style={styles.screenFamily}>{scenario.family}</Text>
      </View>
      <Text style={styles.screenTitle}>{scenario.title}</Text>
      {scenario.description ? (
        <Text style={styles.screenDescription}>{scenario.description}</Text>
      ) : null}
      {usesSheet(scenario) && !HAS_TRUE_SHEET ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>TrueSheet required</Text>
          <Text style={styles.noticeBody}>
            This scenario presents a native sheet, which needs the optional
            @lodev09/react-native-true-sheet module. Install it and run a dev
            build (not Expo Go) to exercise it.
          </Text>
        </View>
      ) : null}
      <View style={styles.stage}>
        <scenario.Component />
      </View>
    </View>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
  },
  filterRow: {
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipLabelSelected: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#9ca3af',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: '#f3f4f6',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  rowDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6b7280',
  },
  chevron: {
    marginLeft: 12,
    fontSize: 22,
    color: '#d1d5db',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 20,
  },
  screen: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2563eb',
  },
  screenFamily: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#9ca3af',
  },
  screenTitle: {
    paddingHorizontal: 20,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  screenDescription: {
    paddingHorizontal: 20,
    paddingTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  notice: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 12,
    gap: 4,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 16,
    color: '#92400e',
  },
  stage: {
    flex: 1,
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 20,
  },
})
