/**
 * Builds docs/screenshots/README.md — a browsable gallery of every captured
 * variant/state on both platforms — from the two capture manifests:
 *
 *   docs/screenshots/web/manifest.json   (scripts/screenshots-web.mjs)
 *   docs/screenshots/ios/manifest.json   (scripts/screenshots-ios.mjs)
 *
 * Run it after either capture script. Missing platforms/states degrade to
 * whatever exists, so a web-only run still produces a valid page.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = path.join(process.cwd(), 'docs', 'screenshots')

/** Storybook story id → native scenario key (gallery/scenarios/index.ts). */
const STORY_TO_SCENARIO = {
  'overlays-dialog--basic': 'dialog-basic',
  'overlays-dialog--non-dismissable': 'dialog-non-dismissable',
  'overlays-dialog--scrollable-content': 'dialog-scrollable',
  'overlays-dialog--styled-surface-and-backdrop': 'dialog-styled',
  'overlays-dialog--compound-parts': 'dialog-compound',
  'overlays-drawer--right-side': 'drawer-right',
  'overlays-drawer--left-side': 'drawer-left',
  'overlays-drawer--fixed-width-scrolling': 'drawer-fixed-width',
  'overlays-drawer--non-dismissable': 'drawer-non-dismissable',
  'overlays-drawer--no-backdrop': 'drawer-no-backdrop',
  'overlays-drawer--styled-surface': 'drawer-styled',
  'overlays-popover--basic': 'popover-basic',
  'overlays-popover--displaces-other-popover': 'popover-displacement',
  'overlays-popover--outside-press-dismisses': 'popover-outside-press',
  'overlays-popover--placements': 'popover-placements',
  'overlays-popover--non-dismissable': 'popover-non-dismissable',
  'overlays-popover--close-on-scroll': 'popover-close-on-scroll',
  'overlays-popover--scroll-inside-panel-does-not-dismiss':
    'popover-scroll-inside',
  'overlays-popover--displacement-vs-non-dismissable':
    'popover-forced-displacement',
  'overlays-sheet--content-sized': 'sheet-content-sized',
  'overlays-sheet--three-detents': 'sheet-three-detents',
  'overlays-sheet--scrolling-content': 'sheet-scrolling',
  'overlays-sheet--non-dismissable': 'sheet-non-dismissable',
  'overlays-sheet--no-scrim': 'sheet-no-scrim',
  'overlays-sheet--styled-and-narrow': 'sheet-styled',
  'overlays-stacking-nesting--popover-inside-dialog':
    'stacking-popover-in-dialog',
  'overlays-stacking-nesting--click-inside-dialog-spares-it':
    'stacking-popover-in-dialog',
  'overlays-stacking-nesting--dialog-above-drawer':
    'stacking-dialog-above-drawer',
  'overlays-stacking-nesting--tooltip-inside-sheet':
    'stacking-tooltip-in-sheet',
  'overlays-stacking-nesting--kitchen-sink-three-deep': 'stacking-kitchen-sink',
  'overlays-tooltip--hover-and-focus': 'tooltip-hover-focus',
  'overlays-tooltip--escape-dismisses-hint': 'tooltip-escape',
  'overlays-tooltip--hint-does-not-displace-auto': 'tooltip-hint-vs-auto',
  'overlays-tooltip--with-boundary': 'tooltip-boundary',
  'overlays-tooltip--render-prop-trigger': 'tooltip-render-prop',
}

async function loadManifest(platform) {
  try {
    const raw = await readFile(
      path.join(ROOT, platform, 'manifest.json'),
      'utf8',
    )
    return JSON.parse(raw).shots
  } catch {
    return []
  }
}

function image(platform, shot, width) {
  return `<img src="${platform}/${shot.file}" alt="${shot.file}" width="${width}">`
}

async function main() {
  const web = await loadManifest('web')
  const ios = await loadManifest('ios')

  const families = new Map()
  const familyOf = (scenarioKey) => {
    const [family] = scenarioKey.split('-')
    return family.charAt(0).toUpperCase() + family.slice(1)
  }

  for (const shot of web) {
    const scenario = STORY_TO_SCENARIO[shot.story] ?? shot.story
    const groupKey = shot.story
    const family = familyOf(scenario)
    if (!families.has(family)) families.set(family, new Map())
    const group = families.get(family)
    if (!group.has(groupKey)) {
      group.set(groupKey, {
        title: `${shot.title} — ${shot.name}`,
        scenario,
        web: [],
        ios: [],
      })
    }
    group.get(groupKey).web.push(shot)
  }

  for (const shot of ios) {
    if (shot.scenario === 'gallery') continue
    const family = familyOf(shot.scenario)
    if (!families.has(family)) families.set(family, new Map())
    const group = families.get(family)
    const existing = [...group.values()].find(
      (entry) => entry.scenario === shot.scenario,
    )
    if (existing) existing.ios.push(shot)
    else {
      group.set(shot.scenario, {
        title: shot.scenario,
        scenario: shot.scenario,
        web: [],
        ios: [shot],
      })
    }
  }

  const lines = [
    '# Screenshot gallery',
    '',
    'Generated — do not edit by hand. Regenerate with:',
    '',
    '```sh',
    'npm run storybook                    # terminal 1',
    'node scripts/screenshots-web.mjs     # web captures',
    'node scripts/screenshots-ios.mjs     # iOS captures (booted sim + example app)',
    'node scripts/screenshots-index.mjs   # this page',
    '```',
    '',
    'Each entry shows every captured state: web (Storybook, Chromium) on top,',
    'iOS (example app, simulator) below. Popover/Tooltip open states on iOS',
    'are captured interactively (their triggers are anchored elements, not',
    'auto-pressable buttons) and may be absent from automated runs.',
    '',
  ]

  const familyOrder = [
    'Dialog',
    'Sheet',
    'Drawer',
    'Popover',
    'Tooltip',
    'Stacking',
  ]
  for (const family of familyOrder) {
    const group = families.get(family)
    if (!group) continue
    lines.push(`## ${family}`, '')
    for (const entry of group.values()) {
      lines.push(`### ${entry.title}`, '')
      if (entry.web.length > 0) {
        lines.push('**Web**', '')
        lines.push('<p>')
        for (const shot of entry.web) lines.push(image('web', shot, 320))
        lines.push('</p>', '')
      }
      if (entry.ios.length > 0) {
        lines.push('**iOS**', '')
        lines.push('<p>')
        for (const shot of entry.ios) lines.push(image('ios', shot, 200))
        lines.push('</p>', '')
      }
    }
  }

  await writeFile(path.join(ROOT, 'README.md'), `${lines.join('\n')}\n`)
  process.stdout.write(
    `docs/screenshots/README.md written (${web.length} web, ${ios.length} ios shots)\n`,
  )
}

await main()
