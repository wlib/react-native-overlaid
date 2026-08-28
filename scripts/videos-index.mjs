/**
 * Builds docs/videos/README.md from the web and iOS video manifests.
 * Animated WebP previews play inline (GitHub's sanitizer strips every
 * inline form of committed VIDEO files, but a committed animated WebP
 * referenced as an image plays); each preview links to its full-quality
 * clip (WebM for web captures, H.264 MP4 for simulator captures).
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DIR = path.join(process.cwd(), 'docs', 'videos')

async function manifest(platform) {
  try {
    return JSON.parse(
      await readFile(path.join(DIR, platform, 'manifest.json'), 'utf8'),
    )
  } catch {
    return null
  }
}

const label = (key) =>
  key
    .replace(/^overlays-/, '')
    .replace(/--/g, ' — ')
    .replace(/-/g, ' ')

function grid(rows, columns) {
  const lines = []
  for (let i = 0; i < rows.length; i += columns) {
    const chunk = rows.slice(i, i + columns)
    lines.push(
      `| ${chunk.map((r) => r.title).join(' | ')} |`,
      `| ${chunk.map(() => '---').join(' | ')} |`,
      `| ${chunk.map((r) => r.cell).join(' | ')} |`,
      '',
    )
  }
  return lines.join('\n')
}

async function main() {
  const web = await manifest('web')
  const ios = await manifest('ios')
  const out = ['# Motion gallery', '']
  out.push(
    'Recorded transition/animation clips complementing the still gallery in',
    '[`docs/screenshots`](../screenshots/README.md). Each cell plays inline',
    '(animated WebP preview); click through for the full-quality clip.',
    'Regenerate with `npm run videos:web` (static Storybook + Playwright),',
    '`npm run videos:ios` (booted simulator + Metro), and',
    '`npm run videos:index`.',
    '',
  )
  if (web) {
    out.push('## Web (Chromium)', '')
    out.push(
      'One continuous take per story: states in order, then Escape rounds.',
      'Blocking/veto stories deliberately end open — the refusal is the',
      'demo.',
      '',
    )
    out.push(
      grid(
        web.clips.map((clip) => ({
          title: clip.name ? `${clip.title} — ${clip.name}` : label(clip.story),
          cell: `[![${clip.story}](web/${clip.webp})](web/${clip.webm})`,
        })),
        2,
      ),
    )
  }
  if (ios) {
    out.push('## iOS (simulator)', '')
    out.push(
      'Auto-pressed opens (the OS present animations) and kernel-routed',
      'dismissals via the route channel; stacked scenarios unwind one layer',
      'at a time. Popover/Tooltip scenarios open through plain library',
      'Trigger parts and have no headless-drivable native clips.',
      '',
    )
    out.push(
      grid(
        ios.clips.map((clip) => ({
          title: label(clip.scenario),
          cell: `[![${clip.scenario}](ios/${clip.webp})](ios/${clip.mp4})`,
        })),
        3,
      ),
    )
  }
  await writeFile(path.join(DIR, 'README.md'), `${out.join('\n')}\n`)
  process.stdout.write(
    `docs/videos/README.md written (${web?.clips.length ?? 0} web, ${ios?.clips.length ?? 0} ios clips)\n`,
  )
}

await main()
