/**
 * iOS transition/animation video generator for the docs.
 *
 * Mirrors scripts/screenshots-ios.mjs (booted simulator, installed example
 * app, Metro running, navigation via the Metro route channel) but records
 * `simctl io recordVideo` clips instead of stills. Each clip covers the
 * scenario's auto-pressed open — the OS present animation — and its
 * dismissal via the route payload's `dismissAfter`, which escapes the layer
 * stack through the kernel (see AutoDismissDriver in
 * gallery/OverlayGallery.tsx), so exits are the real animated paths and
 * stacked scenarios unwind one layer at a time.
 *
 * Usage: node scripts/videos-ios.mjs   (requires ffmpeg on PATH)
 * Output: docs/videos/ios/<scenario>.mp4 + .webp plus manifest.json.
 */
import { execFile, spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const OUT_DIR = path.join(process.cwd(), 'docs', 'videos', 'ios')
const RAW_DIR = path.join(OUT_DIR, '.raw')
const BUNDLE_ID = 'dev.overlaid.example'
const ROUTE_FILE = path.join(process.cwd(), 'example', '.overlaid-route.json')

/**
 * Every auto-pressable scenario (popover/tooltip triggers are deliberately
 * plain library Trigger parts — no helper Button to self-press, so those
 * families have no headless-drivable native clips, mirroring the
 * screenshot pipeline's documented limitation).
 * `dismissAfter` is measured from scenario mount; `record` is the total
 * clip length before the recorder is stopped. Sheets present via the
 * slower OS animation; stacking chains open and unwind extra layers.
 */
const dialog = { dismissAfter: 2600, record: 6400 }
const sheet = { dismissAfter: 3400, record: 7400 }
const stack = { dismissAfter: 3000, record: 8200 }
const SCENARIOS = [
  { key: 'dialog-basic', ...dialog },
  { key: 'dialog-non-dismissable', ...dialog },
  { key: 'dialog-scrollable', ...dialog },
  { key: 'dialog-styled', ...dialog },
  { key: 'dialog-compound', ...dialog },
  { key: 'sheet-content-sized', ...sheet },
  { key: 'sheet-three-detents', ...sheet },
  { key: 'sheet-scrolling', ...sheet },
  { key: 'sheet-non-dismissable', ...sheet },
  { key: 'sheet-no-scrim', ...sheet },
  { key: 'sheet-styled', ...sheet },
  { key: 'drawer-right', ...dialog },
  { key: 'drawer-left', ...dialog },
  { key: 'drawer-fixed-width', ...dialog },
  { key: 'drawer-non-dismissable', ...dialog },
  { key: 'drawer-no-backdrop', ...dialog },
  { key: 'drawer-styled', ...dialog },
  { key: 'stacking-popover-in-dialog', ...stack },
  { key: 'stacking-dialog-above-drawer', ...stack },
  { key: 'stacking-tooltip-in-sheet', dismissAfter: 3800, record: 8600 },
  { key: 'stacking-kitchen-sink', dismissAfter: 3400, record: 9200 },
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function simctl(...args) {
  return run('xcrun', ['simctl', ...args])
}

async function setRoute(key, autopress = false, dismissAfter) {
  await writeFile(
    ROUTE_FILE,
    `${JSON.stringify({
      nonce: `${Date.now()}-${Math.random()}`,
      key,
      autopress,
      ...(dismissAfter === undefined ? {} : { dismissAfter }),
    })}\n`,
  )
}

function record(file) {
  const child = spawn(
    'xcrun',
    [
      'simctl',
      'io',
      'booted',
      'recordVideo',
      '--codec',
      'h264',
      '--force',
      file,
    ],
    { stdio: 'ignore' },
  )
  return {
    stop: () =>
      new Promise((resolve, reject) => {
        child.on('close', resolve)
        child.on('error', reject)
        child.kill('SIGINT')
      }),
  }
}

async function transcode(rawFile, name) {
  // Trim the pre-navigation lead-in; scale for repo-friendly sizes.
  await run('ffmpeg', [
    '-y',
    '-ss',
    '0.8',
    '-i',
    rawFile,
    '-vf',
    'scale=604:-2',
    '-c:v',
    'libx264',
    '-crf',
    '28',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-an',
    path.join(OUT_DIR, `${name}.mp4`),
  ])
  // Animated WebP preview: committed video files cannot play inline on
  // GitHub (the sanitizer strips every video form), but an animated WebP
  // referenced as an image does.
  await run('ffmpeg', [
    '-y',
    '-ss',
    '0.8',
    '-i',
    rawFile,
    '-vf',
    'fps=12,scale=280:-1',
    '-c:v',
    'libwebp',
    '-q:v',
    '45',
    '-loop',
    '0',
    '-an',
    path.join(OUT_DIR, `${name}.webp`),
  ])
}

async function main() {
  await run('ffmpeg', ['-version']).catch(() => {
    throw new Error('ffmpeg is required on PATH for video transcoding.')
  })
  try {
    await simctl('get_app_container', 'booted', BUNDLE_ID)
  } catch {
    throw new Error(
      `${BUNDLE_ID} is not installed on the booted simulator — boot one and run "npx expo run:ios" in example/ first.`,
    )
  }

  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(RAW_DIR, { recursive: true })

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

  // Relaunch so the app picks up the freshest bundle from Metro, then warm
  // the route channel with a throwaway navigation: the first scenario after
  // a relaunch pays Metro's rebuild/transform delay, which would push a
  // recorded dismissal past the recorder stop.
  await simctl('terminate', 'booted', BUNDLE_ID).catch(() => {})
  await simctl('launch', 'booted', BUNDLE_ID)
  await wait(3500)
  await setRoute(SCENARIOS[0].key, false)
  await wait(2500)
  await setRoute('')
  await wait(1000)

  const manifest = []
  const failures = []

  for (const scenario of SCENARIOS) {
    const rawFile = path.join(RAW_DIR, `${scenario.key}.mp4`)
    try {
      await setRoute('')
      await wait(1000)
      const recorder = record(rawFile)
      await wait(700)
      await setRoute(scenario.key, true, scenario.dismissAfter)
      await wait(scenario.record)
      await recorder.stop()
      await transcode(rawFile, scenario.key)
      manifest.push({
        scenario: scenario.key,
        mp4: `${scenario.key}.mp4`,
        webp: `${scenario.key}.webp`,
      })
      process.stdout.write(`ok   ${scenario.key}\n`)
    } catch (error) {
      failures.push({ scenario: scenario.key, error: `${error}` })
      process.stdout.write(`FAIL ${scenario.key} — ${error}\n`)
    }
  }

  await simctl('status_bar', 'booted', 'clear').catch(() => {})
  await rm(RAW_DIR, { recursive: true, force: true })
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ platform: 'ios', bundleId: BUNDLE_ID, clips: manifest }, null, 2)}\n`,
  )
  process.stdout.write(
    `\n${manifest.length} clips, ${failures.length} failures\n`,
  )
  if (failures.length > 0) process.exit(1)
}

await main()
