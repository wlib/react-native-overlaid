import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporaryRoot = mkdtempSync(join(tmpdir(), 'rno-package-smoke-'))

function run(command, args, cwd = root) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function createFixture(name, version, declarations = 'export {}\n') {
  const directory = join(
    temporaryRoot,
    'fixtures',
    `${name.replaceAll('/', '__')}__${version}`,
  )
  mkdirSync(directory, { recursive: true })
  const manifest = {
    name,
    version,
    main: './index.js',
    ...(declarations === null ? {} : { types: './index.d.ts' }),
  }
  writeJson(join(directory, 'package.json'), manifest)
  writeFileSync(join(directory, 'index.js'), 'export {}\n')
  if (declarations !== null) {
    writeFileSync(join(directory, 'index.d.ts'), declarations)
  }
  return `file:${directory}`
}

function installConsumer(name, packageTarball, dependencies) {
  const directory = join(temporaryRoot, name)
  mkdirSync(directory, { recursive: true })
  writeJson(join(directory, 'package.json'), {
    private: true,
    type: 'module',
    dependencies: {
      'react-native-overlaid': `file:${packageTarball}`,
      '@floating-ui/core': createFixture(
        '@floating-ui/core',
        '1.7.0',
        `export type Placement = string\n`,
      ),
      ...dependencies,
    },
  })
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--offline',
      '--cache',
      join(temporaryRoot, 'install-cache'),
    ],
    directory,
  )
  return directory
}

function requirePath(packageRoot, relativePath) {
  if (!existsSync(join(packageRoot, relativePath))) {
    throw new Error(`Packed artifact is missing ${relativePath}`)
  }
}

function collectModuleGraph(entry, platform) {
  const files = new Set()
  const pending = [entry]
  while (pending.length > 0) {
    const file = pending.pop()
    if (!file || files.has(file)) continue
    files.add(file)
    const source = readFileSync(file, 'utf8')
    const imports = source.matchAll(/\b(?:from|import)\s*['"]([^'"]+)['"]/g)
    for (const match of imports) {
      const specifier = match[1]
      if (!specifier?.startsWith('.')) continue
      const base = resolve(dirname(file), specifier)
      const candidates =
        platform === 'web'
          ? [`${base}.web.js`, `${base}.js`, join(base, 'index.web.js')]
          : [`${base}.native.js`, `${base}.js`, join(base, 'index.js')]
      const resolved = candidates.find(existsSync)
      if (!resolved) {
        throw new Error(
          `Could not ${platform}-resolve ${specifier} from ${file}`,
        )
      }
      pending.push(resolved)
    }
  }
  return files
}

function assertGraph(graph, includedSuffix, excludedSuffix) {
  if (![...graph].some((path) => path.endsWith(includedSuffix))) {
    throw new Error(`Resolved graph did not include ${includedSuffix}`)
  }
  if ([...graph].some((path) => path.endsWith(excludedSuffix))) {
    throw new Error(`Resolved graph unexpectedly included ${excludedSuffix}`)
  }
}

try {
  const packDirectory = join(temporaryRoot, 'tarball')
  const cacheDirectory = join(temporaryRoot, 'npm-cache')
  mkdirSync(packDirectory, { recursive: true })

  const packResult = JSON.parse(
    run('npm', [
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      packDirectory,
      '--cache',
      cacheDirectory,
    ]),
  )
  const filename = packResult[0]?.filename
  if (typeof filename !== 'string') throw new Error('npm pack returned no file')
  const packageTarball = join(packDirectory, filename)

  const webConsumer = installConsumer('web-consumer', packageTarball, {
    react: createFixture('react', '18.2.0', null),
    'react-dom': createFixture('react-dom', '18.2.0'),
    'react-native': createFixture(
      'react-native',
      '0.76.0',
      `export type StyleProp<T> = T | readonly StyleProp<T>[] | false | null | undefined\n` +
        `export interface ViewStyle { [property: string]: unknown }\n` +
        `export interface TextStyle { [property: string]: unknown }\n` +
        `export interface GestureResponderEvent { nativeEvent: Record<string, unknown> }\n` +
        `export interface PressableProps {\n` +
        `  onPress?: (...args: never[]) => unknown\n` +
        `  onPointerDown?: (...args: never[]) => unknown\n` +
        `  onPointerEnter?: (...args: never[]) => unknown\n` +
        `  onPointerLeave?: (...args: never[]) => unknown\n` +
        `  onFocus?: (...args: never[]) => unknown\n` +
        `  onBlur?: (...args: never[]) => unknown\n` +
        `}\n` +
        `export interface ScrollViewProps { [property: string]: unknown }\n` +
        `export interface View {}\n`,
    ),
    'react-native-web': createFixture('react-native-web', '0.21.0'),
    '@floating-ui/react-dom': createFixture('@floating-ui/react-dom', '2.1.0'),
    '@types/react': `file:${join(root, 'node_modules', '@types', 'react')}`,
    csstype: `file:${join(root, 'node_modules', 'csstype')}`,
  })
  const nativeConsumer = installConsumer('native-consumer', packageTarball, {
    react: createFixture('react', '19.1.4', null),
    'react-native': createFixture('react-native', '0.81.0'),
    '@lodev09/react-native-true-sheet': createFixture(
      '@lodev09/react-native-true-sheet',
      '3.11.0',
    ),
  })

  const webPackage = join(webConsumer, 'node_modules', 'react-native-overlaid')
  const nativePackage = join(
    nativeConsumer,
    'node_modules',
    'react-native-overlaid',
  )
  for (const artifact of [
    'lib/module/index.js',
    'lib/module/chrome/ModalContainer.web.js',
    'lib/typescript/index.d.ts',
    'styles.css',
    'styles.css.d.ts',
  ]) {
    requirePath(webPackage, artifact)
  }

  const packedFiles = readdirSync(webPackage, { recursive: true }).map(String)
  const forbidden = packedFiles.find(
    (path) =>
      path.includes('__tests__') ||
      path.includes('jest.mocks') ||
      /(^|\/)\w+\.test\.[^/]+$/.test(path) ||
      /^docs\/(PLAN|PRODUCT|PARITY)\.md$/.test(path),
  )
  if (forbidden !== undefined) {
    throw new Error(`Private development file was packed: ${forbidden}`)
  }

  if (
    existsSync(
      join(webConsumer, 'node_modules', '@lodev09', 'react-native-true-sheet'),
    )
  ) {
    throw new Error('Web-only install unexpectedly requires TrueSheet')
  }
  requirePath(nativePackage, 'lib/module/chrome/SheetSurface.js')

  const webGraph = collectModuleGraph(
    join(webPackage, 'lib/module/index.js'),
    'web',
  )
  assertGraph(
    webGraph,
    '/chrome/ModalContainer.web.js',
    '/chrome/ModalContainer.js',
  )
  assertGraph(
    webGraph,
    '/chrome/SheetSurface.web.js',
    '/chrome/SheetSurface.js',
  )
  const nativeGraph = collectModuleGraph(
    join(nativePackage, 'lib/module/index.js'),
    'native',
  )
  assertGraph(
    nativeGraph,
    '/chrome/SheetSurface.js',
    '/chrome/SheetSurface.web.js',
  )
  const webGraphSource = [...webGraph]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  const nativeGraphSource = [...nativeGraph]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  if (webGraphSource.includes('@lodev09/react-native-true-sheet')) {
    throw new Error('Web graph reached the native TrueSheet dependency')
  }
  if (!nativeGraphSource.includes('@lodev09/react-native-true-sheet')) {
    throw new Error('Native graph did not reach the TrueSheet dependency')
  }
  if (
    !existsSync(
      join(
        nativeConsumer,
        'node_modules',
        '@lodev09',
        'react-native-true-sheet',
      ),
    )
  ) {
    throw new Error('Native consumer did not install its TrueSheet peer')
  }

  writeFileSync(
    join(webConsumer, 'index.ts'),
    `import 'react-native-overlaid/styles.css'\n` +
      `import type { TooltipProps } from 'react-native-overlaid'\n` +
      `export const tooltip = { text: 'Hint', children: null as never } satisfies TooltipProps\n`,
  )
  writeJson(join(webConsumer, 'tsconfig.json'), {
    compilerOptions: {
      exactOptionalPropertyTypes: true,
      lib: ['ES2022', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      noEmit: true,
      noUncheckedSideEffectImports: true,
      skipLibCheck: false,
      strict: true,
      target: 'ES2022',
    },
    include: ['index.ts'],
  })
  run(
    join(root, 'node_modules', '.bin', 'tsc'),
    ['-p', join(webConsumer, 'tsconfig.json')],
    webConsumer,
  )

  const manifest = JSON.parse(
    readFileSync(join(webPackage, 'package.json'), 'utf8'),
  )
  if (manifest.exports?.['./styles.css']?.types !== './styles.css.d.ts') {
    throw new Error('Packed CSS export does not expose its declaration')
  }

  process.stdout.write(
    `Package smoke check passed for isolated web/native installs (${filename}).\n`,
  )
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
