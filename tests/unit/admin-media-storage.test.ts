import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MediaInspectionError,
  inspectMediaFile,
  validateMediaUploadInput,
} from '../../src/admin/media-file-inspection.js'
import { MediaStoreError, createMediaStore } from '../../src/admin/media-store.js'

function png(): Buffer {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
}

function errorCode(action: () => unknown): string {
  try {
    action()
    return 'NO_ERROR'
  } catch (error) {
    assert.ok(error instanceof MediaInspectionError)
    return error.code
  }
}

describe('T23 Storage 원본 미디어 검사', () => {
  it('실제 PNG 시그니처·규격·checksum을 서버에서 계산한다', () => {
    const result = inspectMediaFile(png(), 'image/png')

    assert.equal(result.kind, 'image')
    assert.equal(result.mime, 'image/png')
    assert.equal(result.width, 1)
    assert.equal(result.height, 1)
    assert.equal(result.durationSeconds, null)
    assert.match(result.checksum, /^[a-f0-9]{64}$/)
  })

  it('선언 MIME과 실제 시그니처가 다르면 거절한다', () => {
    assert.equal(errorCode(() => inspectMediaFile(png(), 'image/jpeg')), 'MEDIA_MIME_MISMATCH')
  })

  it('손상 파일과 메타데이터가 없는 MP4를 승인하지 않는다', () => {
    assert.equal(errorCode(() => inspectMediaFile(Buffer.from('not-an-image'), 'image/png')), 'MEDIA_SIGNATURE_INVALID')
    assert.equal(errorCode(() => inspectMediaFile(png().subarray(0, 28), 'image/png')), 'MEDIA_IMAGE_DIMENSIONS_INVALID')
    const brokenMp4 = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from('ftypisom'), Buffer.alloc(4)])
    assert.equal(errorCode(() => inspectMediaFile(brokenMp4, 'video/mp4')), 'MEDIA_VIDEO_METADATA_INVALID')
  })

  it('이미지 10MB 상한을 서버 최종 검사에서도 적용한다', () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1)
    png().copy(oversized)
    assert.equal(errorCode(() => inspectMediaFile(oversized, 'image/png')), 'MEDIA_FILE_TOO_LARGE')
  })

  it('업로드 시작 입력에 alt와 권리 근거를 요구하고 영상 poster를 요구한다', () => {
    assert.equal(errorCode(() => validateMediaUploadInput({ fileName: 'hero.png', mime: 'image/png', bytes: 32, alt: '', rightsBasis: 'owned', rightsEvidence: '촬영 원본 계약 2026-09' })), 'MEDIA_ALT_REQUIRED')
    assert.equal(errorCode(() => validateMediaUploadInput({ fileName: 'hero.png', mime: 'image/png', bytes: 32, alt: '운명상회 소개', rightsBasis: 'owned', rightsEvidence: '' })), 'MEDIA_RIGHTS_EVIDENCE_REQUIRED')
    assert.equal(errorCode(() => validateMediaUploadInput({ fileName: 'intro.mp4', mime: 'video/mp4', bytes: 32, alt: '서비스 소개 영상', rightsBasis: 'licensed', rightsEvidence: 'license-2026-09' })), 'MEDIA_POSTER_REQUIRED')

    assert.deepEqual(validateMediaUploadInput({
      fileName: '../hero.png', mime: 'image/png', bytes: 32, alt: '운명상회 소개',
      rightsBasis: 'owned', rightsEvidence: '촬영 원본 계약 2026-09',
    }), {
      fileName: 'hero.png', mime: 'image/png', bytes: 32, kind: 'image', alt: '운명상회 소개',
      rightsBasis: 'owned', rightsEvidence: '촬영 원본 계약 2026-09', posterAssetId: null,
    })
  })
})

describe('T23 Supabase private Storage lifecycle', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const baseRow = {
    id,
    bucket_id: 'umsh-media',
    object_path: `uploads/${id}/hero.png`,
    original_name: 'hero.png',
    kind: 'image',
    mime_type: 'image/png',
    declared_bytes: 68,
    byte_size: null,
    width: null,
    height: null,
    duration_seconds: null,
    checksum: null,
    alt_text: '운명상회 소개',
    rights_basis: 'owned',
    rights_evidence: '촬영 원본 계약 2026-09',
    poster_asset_id: null,
    state: 'uploading',
    rejection_code: null,
    created_by_email: 'operator@example.invalid',
    created_at: '2026-09-12T00:00:00.000Z',
    updated_at: '2026-09-12T00:00:00.000Z',
    approved_at: null,
    deleted_at: null,
  }

  it('private bucket과 metadata row를 만든 뒤 signed upload URL만 반환한다', async () => {
    const calls: Array<{ url: string, init?: RequestInit }> = []
    const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init })
      if (url.endsWith('/storage/v1/bucket/umsh-media')) return new Response('{}', { status: 404 })
      if (url.endsWith('/storage/v1/bucket')) return Response.json({}, { status: 201 })
      if (url.includes('/rest/v1/media_assets')) return Response.json([baseRow], { status: 201 })
      if (url.includes('/storage/v1/object/upload/sign/')) return Response.json({ url: `/object/upload/sign/umsh-media/${baseRow.object_path}?token=signed-only` })
      return new Response('unexpected', { status: 500 })
    }
    const store = createMediaStore({ supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'server-secret', fetch: fakeFetch })
    const result = await store.beginUpload({
      id,
      actorEmail: 'operator@example.invalid',
      input: validateMediaUploadInput({ fileName: 'hero.png', mime: 'image/png', bytes: 68, alt: '운명상회 소개', rightsBasis: 'owned', rightsEvidence: '촬영 원본 계약 2026-09' }),
    })

    assert.equal(result.asset.state, 'uploading')
    assert.match(result.uploadUrl, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/upload\/sign\//)
    assert.doesNotMatch(JSON.stringify(result), /server-secret/)
    assert.ok(calls.some((call) => call.url.endsWith('/storage/v1/bucket')))
    assert.ok(calls.every((call) => !String(call.init?.body ?? '').includes('server-secret')))
  })

  it('Storage 원본을 다시 내려받아 검사한 값만 approved row에 저장한다', async () => {
    const updates: string[] = []
    const approved = { ...baseRow, state: 'approved', byte_size: 68, width: 1, height: 1, checksum: 'a'.repeat(64), approved_at: '2026-09-12T00:01:00.000Z' }
    const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/rest/v1/media_assets') && (!init?.method || init.method === 'GET')) return Response.json([baseRow])
      if (url.includes('/storage/v1/object/authenticated/')) { const bytes = Uint8Array.from(png()); return new Response(bytes.buffer, { headers: { 'content-type': 'image/png' } }) }
      if (url.includes('/rest/v1/media_assets') && init?.method === 'PATCH') { updates.push(String(init.body)); return Response.json([approved]) }
      return new Response('unexpected', { status: 500 })
    }
    const store = createMediaStore({ supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'server-secret', fetch: fakeFetch })
    const result = await store.finalizeUpload({ id, actorEmail: 'operator@example.invalid' })

    assert.equal(result.state, 'approved')
    assert.ok(updates.some((body) => body.includes('"width":1') && body.includes('"height":1') && body.includes('"checksum"')))
  })

  it('참조 중인 자산 삭제는 Storage 호출 전에 차단한다', async () => {
    let storageDeleteCalled = false
    const fakeFetch = async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/rest/v1/rpc/begin_media_asset_delete')) return Response.json({ message: 'MEDIA_ASSET_REFERENCED' }, { status: 400 })
      if (url.includes('/storage/v1/object/')) storageDeleteCalled = true
      return new Response('unexpected', { status: 500 })
    }
    const store = createMediaStore({ supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'server-secret', fetch: fakeFetch })

    await assert.rejects(() => store.deleteAsset(id), (error: unknown) => error instanceof MediaStoreError && error.code === 'MEDIA_ASSET_REFERENCED')
    assert.equal(storageDeleteCalled, false)
  })
})
