/**
 * Web transition/animation video generator for the docs.
 *
 * Covers EVERY Storybook story: each clip is one continuous take driving
 * the story through its named states (the shared STATES table also used by
 * the screenshot pipeline) with real input, then dismissing with Escape
 * rounds — so entry reveals, displacement, drags, and kernel-routed exits
 * are all on film. Stories whose overlays refuse Escape (veto/blocking
 * scenarios) deliberately end open: the refusal is the demo.
 *
 * A handful of stories carry bespoke choreography (OVERRIDES) where the
 * generic derivation would undersell them — e.g. the tooltip's
 * delayed-then-instant hover intent.
 *
 * Each story's autorun play is allowed to finish first, then the page is
 * settled and the take starts; ffmpeg trims the recording to the take and
 * also emits an animated WebP preview (GitHub's markup sanitizer strips
 * every inline-video form for committed files, but committed animated
 * WebP referenced as an image plays inline).
 *
 * Usage:
 *   npm run storybook:build && npx http-server storybook-static -p 6006
 *   node scripts/videos-web.mjs [--url http://localhost:6006]
 *
 * Requires ffmpeg on PATH. Output: docs/videos/web/<story>.webm + .webp
 * plus manifest.json.
 */
import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { STATES, runStep, settle } from './lib/webStates.mjs'

const run = promisify(execFile)
const urlArgIndex = process.argv.indexOf('--url')
const BASE_URL =
  urlArgIndex === -1 ? 'http://localhost:6006' : process.argv[urlArgIndex + 1]
const OUT_DIR = path.join(process.cwd(), 'docs', 'videos', 'web')
const RAW_DIR = path.join(OUT_DIR, '.raw')
const VIEWPORT = { width: 860, height: 640 }

/** Bespoke takes where the generic states+Escape derivation undersells the
 *  behavior. Steps here also accept {escape}, {clickAt: [x, y]}, and
 *  {park} (move the cursor out of frame) on top of the shared step kinds. */
const OVERRIDES = {
  'overlays-tooltip--delayed-then-instant': [
    { hover: 'Hover me first' },
    { wait: 1100 },
    { hover: 'Then hover me' },
    { wait: 900 },
    { park: true },
    { wait: 600 },
  ],
  'overlays-popover--basic': [
    { click: 'Toggle popover' },
    { wait: 1100 },
    { clickAt: [40, 600] },
    { wait: 700 },
  ],
  'overlays-sheet--three-detents': [
    { click: 'Open detented sheet' },
    { wait: 1200 },
    { drag: { fromSelector: '[data-overlaid-sheet-handle]', dy: -220 } },
    { wait: 1000 },
    { drag: { fromSelector: '[data-overlaid-sheet-handle]', dy: 320 } },
    { wait: 1000 },
    { escape: true },
    { wait: 900 },
  ],
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function runVideoStep(page, step) {
  if (step.escape) {
    await page.keyboard.press('Escape')
    return
  }
  if (step.clickAt) {
    await page.mouse.click(step.clickAt[0], step.clickAt[1])
    return
  }
  if (step.park) {
    await page.mouse.move(2, 2)
    return
  }
  await runStep(page, step)
}

/** One continuous take through the story's states: later states that
 *  repeat an earlier state's steps as a prefix only run the remainder. */
function deriveTake(storyId) {
  const states = STATES[storyId] ?? []
  const take = []
  const executed = []
  for (const state of states) {
    const continues =
      executed.length > 0 &&
      executed.length <= state.steps.length &&
      executed.every(
        (step, i) => JSON.stringify(step) === JSON.stringify(state.steps[i]),
      )
    const remainder = continues
      ? state.steps.slice(executed.length)
      : state.steps
    take.push(...remainder, { wait: 900 })
    executed.length = 0
    executed.push(...state.steps)
  }
  if (take.length === 0) return take
  // Kernel-routed dismissal rounds; refusals (veto stories) simply hold.
  take.push(
    { escape: true },
    { wait: 700 },
    { escape: true },
    { wait: 700 },
    { escape: true },
    { wait: 800 },
  )
  return take
}

async function transcode(rawFile, trimSeconds, name) {
  const trim = Math.max(0, trimSeconds).toFixed(2)
  await run('ffmpeg', [
    '-y',
    '-ss',
    trim,
    '-i',
    rawFile,
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '40',
    '-an',
    path.join(OUT_DIR, `${name}.webm`),
  ])
  await run('ffmpeg', [
    '-y',
    '-ss',
    trim,
    '-i',
    rawFile,
    '-vf',
    'fps=12,scale=420:-1',
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
  const indexResponse = await fetch(`${BASE_URL}/index.json`)
  if (!indexResponse.ok) {
    throw new Error(
      `Cannot load ${BASE_URL}/index.json — is the Storybook server running?`,
    )
  }
  const index = await indexResponse.json()
  const stories = Object.values(index.entries).filter(
    (entry) => entry.type === 'story',
  )

  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(RAW_DIR, { recursive: true })
  const browser = await chromium.launch()
  const manifest = []
  const failures = []

  for (const story of stories) {
    const take = OVERRIDES[story.id] ?? deriveTake(story.id)
    if (take.length === 0) continue
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: RAW_DIR, size: VIEWPORT },
      reducedMotion: 'no-preference',
    })
    const page = await context.newPage()
    const pageStart = Date.now()
    try {
      await page.goto(`${BASE_URL}/iframe.html?id=${story.id}&viewMode=story`, {
        waitUntil: 'domcontentloaded',
      })
      await settle(page, story.id)
      // Trim the recording to the take (with a small lead-in).
      const trimSeconds = (Date.now() - pageStart) / 1000 - 0.2
      for (const step of take) await runVideoStep(page, step)
      await wait(400)
      const video = page.video()
      await context.close()
      const rawFile = await video.path()
      await transcode(rawFile, trimSeconds, story.id)
      manifest.push({
        story: story.id,
        title: story.title,
        name: story.name,
        webm: `${story.id}.webm`,
        webp: `${story.id}.webp`,
      })
      process.stdout.write(`ok   ${story.id}\n`)
    } catch (error) {
      await context.close().catch(() => {})
      failures.push({ story: story.id, error: `${error}` })
      process.stdout.write(`FAIL ${story.id} — ${error}\n`)
    }
  }

  await browser.close()
  await rm(RAW_DIR, { recursive: true, force: true })
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ platform: 'web', clips: manifest }, null, 2)}\n`,
  )
  process.stdout.write(
    `\n${manifest.length} clips, ${failures.length} failures\n`,
  )
  if (failures.length > 0) process.exit(1)
}

await main()
