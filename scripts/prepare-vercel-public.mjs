import './build-public-faq.mjs'
import './verify-seo-foundation.mjs'
import { buildAdminMediaInventory } from './build-admin-media-inventory.mjs'
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicRoot = join(root, 'public')
const sajuRoot = join(root, '사주')
const cmdgRoot = join(sajuRoot, '사주')

buildAdminMediaInventory(root)

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

// `handle: filesystem` exposes only this generated directory. Recreate it from an
// allowlisted source set on every build so a stale or newly added public file can
// never survive into Production by accident.
rmSync(publicRoot, { recursive: true, force: true })
mkdirSync(publicRoot, { recursive: true })

copyFile(join(sajuRoot, 'portal.html'), join(publicRoot, 'portal.html'))
copyFile(join(sajuRoot, 'destiny.html'), join(publicRoot, 'destiny.html'))
copyFile(join(sajuRoot, 'chat.html'), join(publicRoot, 'chat.html'))
copyFile(join(sajuRoot, 'result.html'), join(publicRoot, 'result.html'))
copyFile(join(cmdgRoot, 'index.html'), join(publicRoot, 'cmdg', 'index.html'))

copyDirectory(join(sajuRoot, 'css'), join(publicRoot, 'css'))
copyDirectory(join(sajuRoot, 'js'), join(publicRoot, 'js'))
copyDirectory(join(cmdgRoot, 'assets'), join(publicRoot, 'assets'))
copyDirectory(join(cmdgRoot, 'assets'), join(publicRoot, 'cmdg', 'assets'))
