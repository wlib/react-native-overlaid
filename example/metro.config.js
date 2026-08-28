// react-native-overlaid is a file: link to the parent directory, so Metro must watch it
// and must resolve the singleton packages (react, react-native, true-sheet)
// from THIS app's node_modules — a second copy of react from the library's
// own node_modules would break hooks at runtime.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const libraryRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [libraryRoot]

const singletons = [
  'react',
  'react-dom',
  'react-native',
  '@lodev09/react-native-true-sheet',
]

config.resolver.blockList = singletons.map(
  (name) =>
    new RegExp(
      `^${libraryRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/${name.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      )}/.*$`,
    ),
)

config.resolver.extraNodeModules = Object.fromEntries(
  singletons.map((name) => [
    name,
    path.join(projectRoot, 'node_modules', name),
  ]),
)

// Screenshot-automation route channel (dev only). The gallery polls
// GET /overlaid-route on the bundler origin; scripts/screenshots-ios.mjs
// writes example/.overlaid-route.json to navigate the app without taps or
// deep-link permission prompts. See gallery/OverlayGallery.tsx.
const fs = require('fs')
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    if (req.url && req.url.startsWith('/overlaid-route')) {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      try {
        res.end(fs.readFileSync(path.join(projectRoot, '.overlaid-route.json')))
      } catch {
        res.end('null')
      }
      return
    }
    return middleware(req, res, next)
  },
}

module.exports = config
