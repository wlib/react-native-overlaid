/**
 * iOS screenshot generator for the docs.
 *
 * Drives the example app's gallery on a booted simulator through deep links
 * (see gallery/OverlayGallery.tsx): every scenario screen is captured in its
 * resting state, and — where the scenario opens through a helper Button —
 * with its overlay auto-opened via the `autopress=1` flag, so no synthetic
 * taps are needed.
 *
 * Popover and Tooltip scenarios open through anchored trigger elements that
 * deliberately stay plain (they demo the library's own Trigger parts), so
 * their native open states are captured interactively rather than by this
 * script; they are recorded in the manifest as `closed` only.
 *
 * Usage:
 *   1. Boot a simulator and build/install the example app once:
 *        cd example && npx expo prebuild && npx expo run:ios
 *   2. Keep Metro running (cd example && npx expo start) for Debug builds.
 *   3. node scripts/screenshots-ios.mjs
 *
 * Output: docs/screenshots/ios/<scenario>--<state>.png plus manifest.json.
 */
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots', 'ios')
const BUNDLE_ID = 'dev.overlaid.example'
const ROUTE_FILE = path.join(process.cwd(), 'example', '.overlaid-route.json')

/**
 * Scenario keys mirror gallery/scenarios/index.ts. `auto: true` marks the
 * scenarios whose overlays open via auto-pressable helper Buttons
 * ("Open …"/"Toggle …"); `settle` extends the wait for OS-animated chrome
 * (the TrueSheet present animation is the slow one).
 */
const SCENARIOS = [
  { key: 'dialog-basic', auto: true },
  { key: 'dialog-non-dismissable', auto: true },
  { key: 'dialog-scrollable', auto: true },
  { key: 'dialog-styled', auto: true },
  { key: 'dialog-compound', auto: true },
  { key: 'sheet-content-sized', auto: true, settle: 1200 },
  { key: 'sheet-three-detents', auto: true, settle: 1200 },
  { key: 'sheet-scrolling', auto: true, settle: 1200 },
  { key: 'sheet-non-dismissable', auto: true, settle: 1200 },
  { key: 'sheet-no-scrim', auto: true, settle: 1200 },
  { key: 'sheet-styled', auto: true, settle: 1200 },
  { key: 'drawer-right', auto: true },
  { key: 'drawer-left', auto: true },
  { key: 'drawer-fixed-width', auto: true },
  { key: 'drawer-non-dismissable', auto: true },
  { key: 'drawer-no-backdrop', auto: true },
  { key: 'drawer-styled', auto: true },
  { key: 'popover-basic' },
  { key: 'popover-displacement' },
  { key: 'popover-outside-press' },
  { key: 'popover-placements' },
  { key: 'popover-non-dismissable' },
  { key: 'popover-close-on-scroll' },
  { key: 'popover-scroll-inside' },
  { key: 'popover-forced-displacement' },
  { key: 'tooltip-hover-focus' },
  { key: 'tooltip-escape' },
  { key: 'tooltip-hint-vs-auto' },
  { key: 'tooltip-boundary' },
  { key: 'tooltip-render-prop' },
  // Stacked flows: nested "Open …" Buttons auto-press in turn, so the
  // capture shows the full stack (drawer → dialog, dialog for the sink).
  { key: 'stacking-popover-in-dialog', auto: true },
  { key: 'stacking-dialog-above-drawer', auto: true },
  { key: 'stacking-tooltip-in-sheet', auto: true, settle: 1200 },
  { key: 'stacking-kitchen-sink', auto: true },
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function simctl(...args) {
  return run('xcrun', ['simctl', ...args])
}

async function capture(file) {
  await simctl('io', 'booted', 'screenshot', path.join(OUT_DIR, file))
}

async function main() {
  try {
    await simctl('get_app_container', 'booted', BUNDLE_ID)
  } catch {
    throw new Error(
      `${BUNDLE_ID} is not installed on the booted simulator — boot one and run "npx expo run:ios" in example/ first.`,
    )
  }

  await mkdir(OUT_DIR, { recursive: true })

  // A deterministic status bar keeps the captures diff-friendly.
  await simctl(
    'status_bar',
    'booted',
    'override',
    '--time',
    '9:41',
    '--batteryState',
    'charged',
    '--batteryLevel',
    '100',
    '--cellularBars',
    '4',
    '--wifiBars',
    '3',
  ).catch(() => {})

  await simctl('launch', 'booted', BUNDLE_ID).catch(() => {})
  await wait(3000)

  const manifest = []
  const failures = []

  // Navigation goes through the Metro route channel (see
  // example/metro.config.js and gallery/OverlayGallery.tsx): writing this
  // file steers the app, with no taps and no deep-link permission prompt.
  const setRoute = async (key, autopress = false) => {
    await writeFile(
      ROUTE_FILE,
      `${JSON.stringify({ nonce: `${Date.now()}-${Math.random()}`, key, autopress })}\n`,
    )
  }

  await setRoute('')
  await wait(1200)
  await capture('gallery-home.png')
  manifest.push({
    scenario: 'gallery',
    state: 'home',
    file: 'gallery-home.png',
  })

  for (const scenario of SCENARIOS) {
    const states = [
      { name: 'closed', autopress: false },
      ...(scenario.auto ? [{ name: 'open', autopress: true }] : []),
    ]
    for (const state of states) {
      const file = `${scenario.key}--${state.name}.png`
      try {
        // Route through home so re-entering the scenario remounts it fresh.
        await setRoute('')
        await wait(800)
        await setRoute(scenario.key, state.autopress)
        await wait(1400 + (state.autopress ? 800 + (scenario.settle ?? 0) : 0))
        await capture(file)
        manifest.push({ scenario: scenario.key, state: state.name, file })
        process.stdout.write(`ok   ${file}\n`)
      } catch (error) {
        failures.push({
          scenario: scenario.key,
          state: state.name,
          error: `${error}`,
        })
        process.stdout.write(`FAIL ${file} — ${error}\n`)
      }
    }
  }

  await simctl('status_bar', 'booted', 'clear').catch(() => {})
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ platform: 'ios', bundleId: BUNDLE_ID, shots: manifest }, null, 2)}\n`,
  )
  process.stdout.write(
    `\n${manifest.length} screenshots, ${failures.length} failures\n`,
  )
  if (failures.length > 0) process.exit(1)
}

await main()
