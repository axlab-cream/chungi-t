import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listAdminMediaAssets, mediaInventorySummary } from '../../src/admin/media-inventory.js'

describe('관리자 실제 미디어 인벤토리 (T23 Slice 1)', () => {
  it('현재 배포 자산을 검사된 관리자 DTO로 읽는다', () => {
    const assets = listAdminMediaAssets()

    assert.ok(assets.length >= 80, `실제 assets 83개 기준보다 적다: ${assets.length}`)
    assert.equal(new Set(assets.map((asset) => asset.id)).size, assets.length, '자산 ID가 중복된다')
    for (const asset of assets) {
      assert.match(asset.publicUrl, /^\/assets\/[A-Za-z0-9%_!$&'()*+,;=:@/?.-]+$/, `${asset.name}: 공개 URL이 허용 루트 밖이다`)
      assert.match(asset.checksum, /^[a-f0-9]{64}$/, `${asset.name}: SHA-256이 없다`)
      assert.ok(asset.bytes > 0, `${asset.name}: 실제 파일 크기가 없다`)
      assert.ok(['image', 'video', 'font'].includes(asset.kind), `${asset.name}: 허용하지 않은 자산 종류다`)
      assert.ok(['valid', 'invalid'].includes(asset.validation.status), `${asset.name}: 검사 상태가 없다`)
      assert.equal(asset.rightsStatus, 'unverified', `${asset.name}: 근거 없이 권리 승인을 표시한다`)
      assert.ok(!('filePath' in asset), `${asset.name}: 서버 파일 경로를 노출한다`)
    }
  })

  it('서비스 카드 자산의 실제 코드 참조와 영상 poster 미연결을 구분한다', () => {
    const assets = listAdminMediaAssets()
    const card = assets.find((asset) => asset.name === 'umsh-cmdg-card-bg.webp')
    const splash = assets.find((asset) => asset.name === 'umsh-splash.mp4')

    assert.ok(card)
    assert.ok(card.references.includes('src/server/service-directory.ts'))
    assert.ok(splash)
    assert.equal(splash.kind, 'video')
    assert.ok(Number(splash.durationSeconds) > 0)
    assert.ok(Number(splash.width) > 0 && Number(splash.height) > 0)
    assert.equal(splash.posterUrl, null)
  })

  it('요약은 실제 목록에서 계산하고 빈 값을 성공처럼 만들지 않는다', () => {
    const assets = listAdminMediaAssets()
    const summary = mediaInventorySummary(assets)

    assert.equal(summary.total, assets.length)
    assert.equal(summary.referenced, assets.filter((asset) => asset.references.length > 0).length)
    assert.equal(summary.rightsUnverified, assets.length)
    assert.equal(summary.videoPosterMissing, assets.filter((asset) => asset.kind === 'video' && !asset.posterUrl).length)
  })
})
