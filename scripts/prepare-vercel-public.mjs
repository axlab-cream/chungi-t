import './build-public-faq.mjs'
import './verify-seo-foundation.mjs'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicRoot = join(root, 'public')
const sajuRoot = join(root, '사주')
const cmdgRoot = join(sajuRoot, '사주')
const runtimeSajuRoot = join(root, '.vercel-runtime', '사주')
const mediaCatalogPath = join(root, 'data', 'generated-media-catalog.json')
const imageExtensions = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif'])

function copyFile(from, to) {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
}

function copyDirectory(from, to) {
  rmSync(to, { recursive: true, force: true })
  copyDirectoryContents(from, to)
}

function copyDirectoryContents(from, to) {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from)) {
    const source = join(from, entry)
    const target = join(to, entry)
    if (statSync(source).isDirectory()) {
      copyDirectoryContents(source, target)
    } else {
      copyFile(source, target)
    }
  }
}

function copySelectedFiles(from, to, extensions, skip = new Set()) {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from)) {
    const source = join(from, entry)
    const target = join(to, entry)
    if (skip.has(source)) continue
    if (statSync(source).isDirectory()) {
      copySelectedFiles(source, target, extensions, skip)
    } else if (extensions.some((extension) => entry.toLowerCase().endsWith(extension))) {
      copyFile(source, target)
    }
  }
}

function collectFiles(from, out = []) {
  for (const entry of readdirSync(from)) {
    const source = join(from, entry)
    if (statSync(source).isDirectory()) collectFiles(source, out)
    else out.push(source)
  }
  return out
}

function writeMediaCatalog() {
  const files = collectFiles(sajuRoot)
  const htmlText = files.filter((file) => file.endsWith('.html')).map((file) => readFileSync(file, 'utf8'))
  const assets = files
    .filter((file) => imageExtensions.has(extname(file).toLowerCase()))
    .map((file) => {
      const publicPath = `/${relative(sajuRoot, file).split(sep).join('/')}`
      const referencedBy = htmlText.filter((text) => text.includes(basename(file))).length
      return {
        path: publicPath,
        bytes: statSync(file).size,
        referencedBy,
        status: referencedBy > 0 ? 'in_use' : 'unused',
      }
    })
    .sort((a, b) => (a.status === b.status ? b.bytes - a.bytes : a.status === 'unused' ? -1 : 1))
  mkdirSync(dirname(mediaCatalogPath), { recursive: true })
  writeFileSync(mediaCatalogPath, JSON.stringify(assets))
}

// `handle: filesystem` exposes only this generated directory. Recreate it from an
// allowlisted source set on every build so a stale or newly added public file can
// never survive into Production by accident.
rmSync(publicRoot, { recursive: true, force: true })
mkdirSync(publicRoot, { recursive: true })
rmSync(join(root, '.vercel-runtime'), { recursive: true, force: true })
copySelectedFiles(sajuRoot, runtimeSajuRoot, ['.html', '.css', '.js', '.mjs', '.json', '.txt', '.xml'])

copyFile(join(sajuRoot, 'portal.html'), join(publicRoot, 'portal.html'))
copyFile(join(sajuRoot, 'destiny.html'), join(publicRoot, 'destiny.html'))
copyFile(join(sajuRoot, 'chat.html'), join(publicRoot, 'chat.html'))
copyFile(join(sajuRoot, 'result.html'), join(publicRoot, 'result.html'))
copyFile(join(cmdgRoot, 'index.html'), join(publicRoot, 'cmdg', 'index.html'))

copyDirectory(join(sajuRoot, 'css'), join(publicRoot, 'css'))
copyDirectory(join(sajuRoot, 'js'), join(publicRoot, 'js'))
copyFile(join(sajuRoot, 'data', 'longform-blocks.json'), join(publicRoot, 'data', 'longform-blocks.json'))
copyDirectory(join(cmdgRoot, 'assets'), join(publicRoot, 'assets'))
copyDirectory(join(cmdgRoot, 'assets'), join(publicRoot, 'cmdg', 'assets'))

copyDirectory(join(sajuRoot, 'play', 'love-speed'), join(publicRoot, 'play', 'love-speed'))

// Binary media and local font sources belong in Vercel's static output, not inside
// the Node function. Keeping the whole `사주/**` tree in the function pushed its
// traced bundle to roughly 399 MB and fresh production instances failed at startup.
// The nested cmdg assets are already copied above, so skip that duplicate tree.
copySelectedFiles(
  sajuRoot,
  publicRoot,
  ['.png', '.mp4', '.ttf', '.webp', '.jpg', '.jpeg', '.gif', '.avif', '.webm', '.mp3', '.otf', '.woff', '.woff2', '.ico', '.svg'],
  new Set([cmdgRoot]),
)

// The admin media screen needs metadata, not hundreds of binary files in the
// serverless function. Generate the same real-file catalog during the build.
writeMediaCatalog()
