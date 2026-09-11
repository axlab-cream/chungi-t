import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const ASSET_ROOT = join(SCRIPT_ROOT, '사주', '사주', 'assets')
const OUTPUT = join(SCRIPT_ROOT, 'data', 'admin-media-inventory.json')
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.ts'])
const MIME_BY_EXTENSION = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.mp4', 'video/mp4'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
])

function walk(root) {
  const result = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) result.push(...walk(path))
    else result.push(path)
  }
  return result
}

function posix(value) {
  return value.replace(/\\/g, '/')
}

function publicUrl(relativePath) {
  return '/assets/' + posix(relativePath).split('/').map((part) => encodeURIComponent(part)).join('/')
}

function sniffMime(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4'
  if (buffer.subarray(0, 4).toString('ascii') === 'wOF2') return 'font/woff2'
  if (buffer.subarray(0, 4).toString('ascii') === 'wOFF') return 'font/woff'
  if (buffer.subarray(0, 4).equals(Buffer.from([0x00, 0x01, 0x00, 0x00])) || buffer.subarray(0, 4).toString('ascii') === 'true') return 'font/ttf'
  return null
}

function jpegDimensions(buffer) {
  let offset = 2
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue }
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
    }
    if (length < 2) break
    offset += length + 2
  }
  return null
}

function webpDimensions(buffer) {
  const chunk = buffer.subarray(12, 16).toString('ascii')
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    }
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    return {
      width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
      height: 1 + ((buffer[22] & 0xc0) >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10),
    }
  }
  if (chunk === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  }
  return null
}

function imageDimensions(buffer, mime) {
  if (mime === 'image/png' && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  if (mime === 'image/gif' && buffer.length >= 10) return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
  if (mime === 'image/jpeg') return jpegDimensions(buffer)
  if (mime === 'image/webp') return webpDimensions(buffer)
  return null
}

function mp4Boxes(buffer, start = 0, end = buffer.length) {
  const boxes = []
  let offset = start
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    let header = 8
    if (size === 1 && offset + 16 <= end) { size = Number(buffer.readBigUInt64BE(offset + 8)); header = 16 }
    else if (size === 0) size = end - offset
    if (!Number.isSafeInteger(size) || size < header || offset + size > end) break
    boxes.push({ type, start: offset + header, end: offset + size })
    offset += size
  }
  return boxes
}

function mp4Metadata(buffer) {
  const moov = mp4Boxes(buffer).find((box) => box.type === 'moov')
  if (!moov) return null
  for (const trak of mp4Boxes(buffer, moov.start, moov.end).filter((box) => box.type === 'trak')) {
    const children = mp4Boxes(buffer, trak.start, trak.end)
    const mdia = children.find((box) => box.type === 'mdia')
    const tkhd = children.find((box) => box.type === 'tkhd')
    if (!mdia || !tkhd) continue
    const media = mp4Boxes(buffer, mdia.start, mdia.end)
    const hdlr = media.find((box) => box.type === 'hdlr')
    const mdhd = media.find((box) => box.type === 'mdhd')
    if (!hdlr || !mdhd || buffer.subarray(hdlr.start + 8, hdlr.start + 12).toString('ascii') !== 'vide') continue
    const version = buffer[mdhd.start]
    const timescaleOffset = mdhd.start + (version === 1 ? 20 : 12)
    const durationOffset = mdhd.start + (version === 1 ? 24 : 16)
    if (durationOffset + (version === 1 ? 8 : 4) > mdhd.end || tkhd.end - 8 < tkhd.start) return null
    const timescale = buffer.readUInt32BE(timescaleOffset)
    const duration = version === 1 ? Number(buffer.readBigUInt64BE(durationOffset)) : buffer.readUInt32BE(durationOffset)
    return {
      width: Math.round(buffer.readUInt32BE(tkhd.end - 8) / 65536),
      height: Math.round(buffer.readUInt32BE(tkhd.end - 4) / 65536),
      durationSeconds: timescale > 0 ? Math.round((duration / timescale) * 1000) / 1000 : null,
    }
  }
  return null
}

function referenceFiles(projectRoot, assetsRoot) {
  const candidates = [join(projectRoot, '사주'), join(projectRoot, 'src')]
    .flatMap((root) => walk(root))
    .filter((path) => !path.startsWith(assetsRoot) && TEXT_EXTENSIONS.has(extname(path).toLowerCase()))
  return candidates.map((path) => ({
    path: posix(relative(projectRoot, path)),
    text: readFileSync(path, 'utf8'),
  }))
}

export function buildAdminMediaInventory(projectRoot = SCRIPT_ROOT) {
  const assetsRoot = join(projectRoot, '사주', '사주', 'assets')
  const refs = referenceFiles(projectRoot, assetsRoot)
  const assets = walk(assetsRoot)
    .filter((path) => MIME_BY_EXTENSION.has(extname(path).toLowerCase()))
    .map((path) => {
      const file = readFileSync(path)
      const relativePath = posix(relative(assetsRoot, path))
      const expectedMime = MIME_BY_EXTENSION.get(extname(path).toLowerCase())
      const detectedMime = sniffMime(file)
      const kind = expectedMime.startsWith('image/') ? 'image' : expectedMime.startsWith('video/') ? 'video' : 'font'
      const video = detectedMime === 'video/mp4' ? mp4Metadata(file) : null
      const dimensions = kind === 'video' ? video : imageDimensions(file, detectedMime)
      const issues = []
      if (detectedMime !== expectedMime) issues.push('MIME_SIGNATURE_MISMATCH')
      if (kind === 'image' && !dimensions) issues.push('IMAGE_DIMENSIONS_UNREADABLE')
      if (kind === 'video' && !video) issues.push('VIDEO_METADATA_UNREADABLE')
      if (kind === 'video' && file.length > 100 * 1024 * 1024) issues.push('VIDEO_TOO_LARGE')
      if (kind === 'image' && file.length > 10 * 1024 * 1024) issues.push('IMAGE_TOO_LARGE')
      const checksum = createHash('sha256').update(file).digest('hex')
      const url = publicUrl(relativePath)
      return {
        id: 'static:' + createHash('sha256').update(url).digest('hex').slice(0, 20),
        name: relativePath.split('/').at(-1),
        kind,
        mime: detectedMime || expectedMime,
        bytes: file.length,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        durationSeconds: video?.durationSeconds ?? null,
        checksum,
        publicUrl: url,
        references: refs.filter((candidate) => candidate.text.includes(relativePath.split('/').at(-1))).map((candidate) => candidate.path),
        posterUrl: null,
        rightsStatus: 'unverified',
        validation: { status: issues.length ? 'invalid' : 'valid', issues },
      }
    })
    .sort((left, right) => left.publicUrl.localeCompare(right.publicUrl))
  const output = { schemaVersion: 1, assets }
  writeFileSync(join(projectRoot, 'data', 'admin-media-inventory.json'), JSON.stringify(output, null, 2) + '\n')
  return output
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const result = buildAdminMediaInventory()
  process.stdout.write(`Generated admin media inventory: ${result.assets.length} assets\n`)
}
