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
const STATES = {
  'overlays-dialog--basic': [
    { name: 'open', steps: [{ click: 'Open dialog' }] },
  ],
  'overlays-dialog--non-dismissable': [
    { name: 'open', steps: [{ click: 'Open blocking dialog' }] },
  ],
  'overlays-dialog--scrollable-content': [
    { name: 'open', steps: [{ click: 'Open long dialog' }] },
  ],
  'overlays-dialog--styled-surface-and-backdrop': [
    { name: 'open', steps: [{ click: 'Open styled dialog' }] },
  ],
  'overlays-dialog--compound-parts': [
    { name: 'open', steps: [{ click: 'Open compound dialog' }] },
  ],

  'overlays-drawer--right-side': [
    { name: 'open', steps: [{ click: 'Open right drawer' }] },
  ],
  'overlays-drawer--left-side': [
    { name: 'open', steps: [{ click: 'Open left drawer' }] },
  ],
  'overlays-drawer--fixed-width-scrolling': [
    { name: 'open', steps: [{ click: 'Open narrow drawer' }] },
  ],
  'overlays-drawer--non-dismissable': [
    { name: 'open', steps: [{ click: 'Open blocking drawer' }] },
  ],
  'overlays-drawer--no-backdrop': [
    { name: 'open', steps: [{ click: 'Toggle inspector drawer' }] },
  ],
  'overlays-drawer--styled-surface': [
    { name: 'open', steps: [{ click: 'Open styled drawer' }] },
  ],

  'overlays-popover--basic': [
    { name: 'open', steps: [{ click: 'Toggle popover' }] },
  ],
  'overlays-popover--displaces-other-popover': [
    { name: 'first-open', steps: [{ click: 'Left trigger' }] },
    {
      name: 'second-displaces-first',
      steps: [{ click: 'Left trigger' }, { click: 'Right trigger' }],
    },
  ],
  'overlays-popover--outside-press-dismisses': [
    { name: 'open', steps: [{ click: 'Open popover' }] },
  ],
  'overlays-popover--placements': [
    { name: 'top', steps: [{ click: 'top' }] },
    { name: 'bottom', steps: [{ click: 'bottom' }] },
    { name: 'left', steps: [{ click: 'left' }] },
    { name: 'right', steps: [{ click: 'right' }] },
  ],
  'overlays-popover--non-dismissable': [
    { name: 'open', steps: [{ click: 'Open sticky popover' }] },
  ],
  'overlays-popover--close-on-scroll': [
    { name: 'open', steps: [{ click: 'Open, then scroll the page' }] },
    {
      name: 'dismissed-after-scroll',
      steps: [{ click: 'Open, then scroll the page' }, { scroll: 240 }],
    },
  ],
  'overlays-popover--scroll-inside-panel-does-not-dismiss': [
    { name: 'open', steps: [{ click: 'Open scrollable popover' }] },
  ],
  'overlays-popover--displacement-vs-non-dismissable': [
    {
      name: 'sticky-open',
      steps: [{ click: 'Open sticky popover (force-displaced)' }],
    },
    {
      name: 'veto-survives-displacement',
      steps: [
        { click: 'Toggle veto popover' },
        { click: 'Toggle displacing popover' },
      ],
    },
  ],
  // The story's play function parks a VETOING popover open, and Escape
  // cannot clear it — its own trigger toggle (programmatic) can.
  // RESETS below run right after settle for every state of that story.

  'overlays-sheet--content-sized': [
    { name: 'open', steps: [{ click: 'Open content sheet' }] },
  ],
  'overlays-sheet--three-detents': [
    { name: 'middle-detent', steps: [{ click: 'Open detented sheet' }] },
    {
      name: 'low-detent',
      steps: [
        { click: 'Open detented sheet' },
        { drag: { fromSelector: '[data-overlaid-sheet-handle]', dy: 200 } },
      ],
    },
  ],
  'overlays-sheet--scrolling-content': [
    { name: 'open', steps: [{ click: 'Open scrolling sheet' }] },
  ],
  'overlays-sheet--non-dismissable': [
    { name: 'open', steps: [{ click: 'Open blocking sheet' }] },
  ],
  'overlays-sheet--no-scrim': [
    { name: 'open', steps: [{ click: 'Open scrimless sheet' }] },
  ],
  'overlays-sheet--styled-and-narrow': [
    { name: 'open', steps: [{ click: 'Open styled sheet' }] },
  ],

  'overlays-stacking-nesting--popover-inside-dialog': [
    { name: 'dialog-open', steps: [{ click: 'Open dialog' }] },
    {
      name: 'popover-in-dialog',
      steps: [{ click: 'Open dialog' }, { click: 'Toggle nested popover' }],
    },
  ],
  'overlays-stacking-nesting--click-inside-dialog-spares-it': [
    {
      name: 'popover-in-dialog',
      steps: [{ click: 'Open dialog' }, { click: 'Toggle nested popover' }],
    },
    {
      // The scenario's whole point: the inside press closes the popover
      // but spares the ancestor dialog.
      name: 'popover-dismissed-dialog-spared',
      steps: [
        { click: 'Open dialog' },
        { click: 'Toggle nested popover' },
        // The popover panel covers the body text, so press the title —
        // equally inside the dialog, outside the popover.
        { click: 'Dialog with a popover' },
      ],
    },
  ],
  'overlays-stacking-nesting--dialog-above-drawer': [
    { name: 'drawer-open', steps: [{ click: 'Open drawer' }] },
    {
      name: 'dialog-above-drawer',
      steps: [{ click: 'Open drawer' }, { click: 'Open confirmation dialog' }],
    },
  ],
  'overlays-stacking-nesting--tooltip-inside-sheet': [
    { name: 'sheet-open', steps: [{ click: 'Open sheet' }] },
    {
      name: 'tooltip-in-sheet',
      steps: [{ click: 'Open sheet' }, { hover: 'ⓘ' }],
    },
  ],
  'overlays-stacking-nesting--kitchen-sink-three-deep': [
    { name: 'dialog-open', steps: [{ click: 'Open kitchen sink' }] },
    {
      name: 'two-deep',
      steps: [{ click: 'Open kitchen sink' }, { click: 'Open popover' }],
    },
    {
      name: 'three-deep',
      steps: [
        { click: 'Open kitchen sink' },
        { click: 'Open popover' },
        { hover: 'ⓘ' },
      ],
    },
  ],

  'overlays-tooltip--hover-and-focus': [
    { name: 'open', steps: [{ hover: 'Hover or focus me' }] },
  ],
  'overlays-tooltip--escape-dismisses-hint': [
    { name: 'open', steps: [{ hover: 'Hover, then press Escape' }] },
  ],
  'overlays-tooltip--hint-does-not-displace-auto': [
    {
      name: 'popover-plus-tooltip',
      steps: [{ click: '1. Open this popover' }, { hover: '2. Then hover me' }],
    },
  ],
  'overlays-tooltip--with-boundary': [
    { name: 'open', steps: [{ hover: 'Hover near the edge' }] },
  ],
  'overlays-tooltip--render-prop-trigger': [
    { name: 'open', steps: [{ hover: 'Custom trigger element' }] },
  ],
}

/**
 * Post-settle reset steps for stories whose auto-run play function leaves
 * state that Escape cannot clear (e.g. a vetoing popover — only its own
 * trigger toggle closes it).
 */
const RESETS = {
  'overlays-popover--displacement-vs-non-dismissable': [
    { click: 'Toggle veto popover' },
  ],
}

async function locate(page, text) {
  // RN-web renders text as div[dir=auto] leaves — except role="heading"
  // Texts, which become h1..h6. The last exact match is the innermost.
  const exact = page.locator(
    `:is(div[dir="auto"], h1, h2, h3, h4, h5, h6):text-is(${JSON.stringify(text)})`,
  )
  await exact.last().waitFor({ state: 'visible', timeout: 5000 })
  return exact.last()
}

async function overlaysOpen(page) {
  return page.evaluate(
    () =>
      document.querySelectorAll('dialog[open]').length +
      document.querySelectorAll('[data-overlaid-popover]').length,
  )
}

/** Let the auto-run play function finish, then dismiss whatever it left. */
async function settle(page, storyId) {
  await page.waitForSelector('#storybook-root > *', { timeout: 15000 })
  // Park the cursor first: a play function can end hovering a tooltip
  // trigger, and a hint would re-open under the resting pointer.
  await page.mouse.move(2, 2)
  await page.waitForTimeout(1800)
  for (let round = 0; round < 12; round += 1) {
    if ((await overlaysOpen(page)) === 0) break
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  for (const step of RESETS[storyId] ?? []) await runStep(page, step)
  await page.waitForTimeout(400)
}

/** Deterministic captures: no stray focus ring, cursor out of the frame. */
async function neutralize(page) {
  await page.evaluate(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  })
  await page.waitForTimeout(120)
}

async function runStep(page, step) {
  if (step.click) {
    await (await locate(page, step.click)).click()
    await page.waitForTimeout(500)
    return
  }
  if (step.hover) {
    await (await locate(page, step.hover)).hover()
    await page.waitForTimeout(600)
    return
  }
  if (step.drag) {
    const handle = page.locator(step.drag.fromSelector).last()
    const box = await handle.boundingBox()
    if (!box) throw new Error(`drag target missing: ${step.drag.fromSelector}`)
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + step.drag.dy, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(600)
    return
  }
  if (step.scroll) {
    await page.mouse.move(430, 320)
    await page.mouse.wheel(0, step.scroll)
    await page.waitForTimeout(600)
    return
  }
  if (step.wait) {
    await page.waitForTimeout(step.wait)
    return
  }
  throw new Error(`unknown step: ${JSON.stringify(step)}`)
}

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

  for (const story of stories) {
    const states = [{ name: 'closed', steps: [] }, ...(STATES[story.id] ?? [])]
    for (const state of states) {
      const file = `${story.id}--${state.name}.png`
      try {
        await page.goto(
          `${BASE_URL}/iframe.html?id=${story.id}&viewMode=story`,
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
        })
        process.stdout.write(`ok   ${file}\n`)
      } catch (error) {
        failures.push({ story: story.id, state: state.name, error: `${error}` })
        process.stdout.write(`FAIL ${file} — ${error}\n`)
      }
    }
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
