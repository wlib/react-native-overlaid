/**
 * Web screenshot generator for the docs.
 *
 * Walks every Storybook story (the same scenario registry that drives the
 * native gallery), drives each one through its named states with real
 * pointer input, and captures full-viewport PNGs — full-viewport because
 * overlay chrome lives in the browser top layer, which element screenshots
 * cannot see.
 *
 * Usage:
 *   npm run storybook          # dev server on :6006 (or a static build URL)
 *   node scripts/screenshots-web.mjs [--url http://localhost:6006]
 *
 * Output: docs/screenshots/web/<story-id>--<state>.png plus manifest.json
 * (consumed by scripts/screenshots-index.mjs to build the docs gallery).
 *
 * Play functions auto-run when a story loads in the preview iframe; the
 * settle step lets them finish and dismisses anything they left open, so
 * every capture starts from the story's resting state.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import {
  FALLBACK_CAPS_QUERY,
  FALLBACK_CAPS_STORIES,
  STATES,
  neutralize,
  runStep,
  settle,
} from './lib/webStates.mjs'

const urlArgIndex = process.argv.indexOf('--url')
const BASE_URL =
  urlArgIndex === -1 ? 'http://localhost:6006' : process.argv[urlArgIndex + 1]
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots', 'web')
const VIEWPORT = { width: 860, height: 640 }

/**
 * Named states per story beyond the implicit "closed" resting capture.
 * Steps: {click|hover: exact RN Text content} | {drag: {fromSelector, dy}}
 * | {wait: ms}. Steps run in order; the screenshot is taken after the last
 * step settles.
 */
async function main() {
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
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  })

  const manifest = []
  const failures = []

  const captureStory = async (story, { query, suffix, caps } = {}) => {
    const states = [{ name: 'closed', steps: [] }, ...(STATES[story.id] ?? [])]
    for (const state of states) {
      const file = `${story.id}--${state.name}${suffix ?? ''}.png`
      try {
        await page.goto(
          `${BASE_URL}/iframe.html?id=${story.id}&viewMode=story${
            query ? `&${query}` : ''
          }`,
          { waitUntil: 'domcontentloaded' },
        )
        await settle(page, story.id)
        for (const step of state.steps) await runStep(page, step)
        await neutralize(page)
        await page.screenshot({ path: path.join(OUT_DIR, file) })
        manifest.push({
          story: story.id,
          title: story.title,
          name: story.name,
          state: state.name,
          file,
          ...(caps ? { caps } : {}),
        })
        process.stdout.write(`ok   ${file}\n`)
      } catch (error) {
        failures.push({ story: story.id, state: state.name, error: `${error}` })
        process.stdout.write(`FAIL ${file} — ${error}\n`)
      }
    }
  }

  for (const story of stories) await captureStory(story)

  for (const story of stories) {
    if (!FALLBACK_CAPS_STORIES.includes(story.id)) continue
    await captureStory(story, {
      query: FALLBACK_CAPS_QUERY,
      suffix: '--caps-none',
      caps: 'none',
    })
  }

  await browser.close()
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ viewport: VIEWPORT, platform: 'web', shots: manifest }, null, 2)}\n`,
  )

  process.stdout.write(
    `\n${manifest.length} screenshots, ${failures.length} failures\n`,
  )
  if (failures.length > 0) process.exit(1)
}

await main()
