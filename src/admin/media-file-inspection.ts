import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import { inflateSync } from 'node:zlib'

export const MEDIA_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const MEDIA_VIDEO_MAX_BYTES = 100 * 1024 * 1024
export const MEDIA_ALLOWED_MIMES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4'] as const)
export const MEDIA_RIGHTS_BASES = Object.freeze(['owned', 'licensed', 'public_domain', 'user_provided'] as const)

export type MediaKind = 'image' | 'video'
export type MediaRightsBasis = typeof MEDIA_RIGHTS_BASES[number]

export type MediaInspection = {
  kind: MediaKind
  mime: typeof MEDIA_ALLOWED_MIMES[number]
  bytes: number
  width: number
  height: number
  durationSeconds: number | null
  checksum: string
}

export type MediaUploadInput = {
  fileName: string
  mime: string
  bytes: number
  alt: string
  rightsBasis: string
  rightsEvidence: string
  posterAssetId?: string | null
}

export type ValidMediaUploadInput = {
  fileName: string
  mime: typeof MEDIA_ALLOWED_MIMES[number]
  bytes: number
  kind: MediaKind
  alt: string
  rightsBasis: MediaRightsBasis
  rightsEvidence: string
  posterAssetId: string | null
}

export class MediaInspectionError extends Error {
  constructor(public readonly code: string) {
    super(code)
  }
}

function requiredText(value: unknown, max: number, code: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > max) throw new MediaInspectionError(code)
  return text
}

function isAllowedMime(value: string): value is typeof MEDIA_ALLOWED_MIMES[number] {
  return (MEDIA_ALLOWED_MIMES as readonly string[]).includes(value)
}

function isRightsBasis(value: string): value is MediaRightsBasis {
  return (MEDIA_RIGHTS_BASES as readonly string[]).includes(value)
}

function safeFileName(value: unknown): string {
  const normalized = basename(String(value ?? '').replace(/\\/g, '/')).normalize('NFC')
  if (!normalized || normalized === '.' || normalized.length > 180 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new MediaInspectionError('MEDIA_FILE_NAME_INVALID')
  }
  return normalized
}

export function validateMediaUploadInput(input: MediaUploadInput): ValidMediaUploadInput {
  const mime = String(input.mime ?? '').toLowerCase()
  if (!isAllowedMime(mime)) throw new MediaInspectionError('MEDIA_MIME_UNSUPPORTED')
  const kind: MediaKind = mime === 'video/mp4' ? 'video' : 'image'
  const bytes = Number(input.bytes)
  const maxBytes = kind === 'video' ? MEDIA_VIDEO_MAX_BYTES : MEDIA_IMAGE_MAX_BYTES
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > maxBytes) throw new MediaInspectionError('MEDIA_FILE_TOO_LARGE')
  const rightsBasis = String(input.rightsBasis ?? '')
  if (!isRightsBasis(rightsBasis)) throw new MediaInspectionError('MEDIA_RIGHTS_BASIS_INVALID')
  const posterAssetId = typeof input.posterAssetId === 'string' && input.posterAssetId.trim() ? input.posterAssetId.trim() : null
  if (kind === 'video' && !posterAssetId) throw new MediaInspectionError('MEDIA_POSTER_REQUIRED')
  return {
    fileName: safeFileName(input.fileName),
    mime,
    bytes,
    kind,
    alt: requiredText(input.alt, 300, 'MEDIA_ALT_REQUIRED'),
    rightsBasis,
    rightsEvidence: requiredText(input.rightsEvidence, 1000, 'MEDIA_RIGHTS_EVIDENCE_REQUIRED'),
    posterAssetId,
  }
}

function sniffMime(buffer: Buffer): typeof MEDIA_ALLOWED_MIMES[number] | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4'
  return null
}

function jpegDimensions(buffer: Buffer): { width: number, height: number } | null {
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

function webpDimensions(buffer: Buffer): { width: number, height: number } | null {
  const chunk = buffer.subarray(12, 16).toString('ascii')
  if (chunk === 'VP8X' && buffer.length >= 30) return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    return { width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8), height: 1 + ((buffer[22] & 0xc0) >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10) }
  }
  if (chunk === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  }
  return null
}

function imageDimensions(buffer: Buffer, mime: string): { width: number, height: number } | null {
  if (mime === 'image/png') {
    let offset = 8; let width = 0; let height = 0; const data: Buffer[] = []; let ended = false
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset); const type = buffer.subarray(offset + 4, offset + 8).toString('ascii'); const end = offset + 12 + length
      if (end > buffer.length) return null
      if (type === 'IHDR') { if (offset !== 8 || length !== 13) return null; width = buffer.readUInt32BE(offset + 8); height = buffer.readUInt32BE(offset + 12) }
      if (type === 'IDAT') data.push(buffer.subarray(offset + 8, offset + 8 + length))
      if (type === 'IEND') { if (length !== 0) return null; ended = true; break }
      offset = end
    }
    if (!width || !height || !data.length || !ended) return null
    try { if (!inflateSync(Buffer.concat(data)).length) return null } catch { return null }
    return { width, height }
  }
  if (mime === 'image/gif' && buffer.length >= 10) return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
  if (mime === 'image/jpeg') return jpegDimensions(buffer)
  if (mime === 'image/webp') return webpDimensions(buffer)
  return null
}

type Mp4Box = { type: string, start: number, end: number }

function mp4Boxes(buffer: Buffer, start = 0, end = buffer.length): Mp4Box[] {
  const boxes: Mp4Box[] = []
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

function mp4Metadata(buffer: Buffer): { width: number, height: number, durationSeconds: number } | null {
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
    const durationBytes = version === 1 ? 8 : 4
    if (durationOffset + durationBytes > mdhd.end || tkhd.end - 8 < tkhd.start) return null
    const timescale = buffer.readUInt32BE(timescaleOffset)
    const duration = version === 1 ? Number(buffer.readBigUInt64BE(durationOffset)) : buffer.readUInt32BE(durationOffset)
    const width = Math.round(buffer.readUInt32BE(tkhd.end - 8) / 65536)
    const height = Math.round(buffer.readUInt32BE(tkhd.end - 4) / 65536)
    if (timescale <= 0 || duration <= 0 || width <= 0 || height <= 0) return null
    return { width, height, durationSeconds: Math.round((duration / timescale) * 1000) / 1000 }
  }
  return null
}

export function inspectMediaFile(buffer: Buffer, declaredMime: string): MediaInspection {
  const detectedMime = sniffMime(buffer)
  if (!detectedMime) throw new MediaInspectionError('MEDIA_SIGNATURE_INVALID')
  if (detectedMime !== declaredMime) throw new MediaInspectionError('MEDIA_MIME_MISMATCH')
  const kind: MediaKind = detectedMime === 'video/mp4' ? 'video' : 'image'
  const maxBytes = kind === 'video' ? MEDIA_VIDEO_MAX_BYTES : MEDIA_IMAGE_MAX_BYTES
  if (buffer.length > maxBytes) throw new MediaInspectionError('MEDIA_FILE_TOO_LARGE')
  const video = kind === 'video' ? mp4Metadata(buffer) : null
  const dimensions = kind === 'video' ? video : imageDimensions(buffer, detectedMime)
  if (kind === 'video' && !video) throw new MediaInspectionError('MEDIA_VIDEO_METADATA_INVALID')
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) throw new MediaInspectionError('MEDIA_IMAGE_DIMENSIONS_INVALID')
  return {
    kind,
    mime: detectedMime,
    bytes: buffer.length,
    width: dimensions.width,
    height: dimensions.height,
    durationSeconds: video?.durationSeconds ?? null,
    checksum: createHash('sha256').update(buffer).digest('hex'),
  }
}
