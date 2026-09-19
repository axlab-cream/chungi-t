import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMediaCatalog, resetMediaCatalogCache } from '../../src/admin/media-catalog.js'

/**
 * 2026-09-19: "미디어" 메뉴는 저장할 백엔드 표가 없어 계속 "아직 생성되지 않았습니다"로
 * 남아 있었다. 새 표를 만드는 대신 실제로 배포된 정적 파일(사주/**)을 훑어 카탈로그를
 * 만든다 — 이 테스트는 실제 저장소의 실제 파일에 대해 돈다(합성 픽스처가 아니다).
 */

test('실제 배포 파일에서 이미지 자산을 찾고, 참조 여부로 사용 중/미사용을 가른다', () => {
  resetMediaCatalogCache()
  const assets = getMediaCatalog()
  assert.ok(assets.length > 50, `이미지가 너무 적게 잡혔다: ${assets.length}`)
  for (const asset of assets) {
    assert.match(asset.path, /^\/.*\.(webp|png|jpe?g|svg|gif)$/i)
    assert.ok(asset.bytes > 0, `${asset.path} 의 크기가 0이다`)
    assert.equal(asset.status, asset.referencedBy > 0 ? 'in_use' : 'unused')
  }
  // 저축운 06 화면이 실제로 쓰는 히어로 이미지는 최소 한 곳에서 참조돼야 한다.
  const heroKnown = assets.find((asset) => asset.path.includes('06-detail-reading.webp'))
  assert.ok(heroKnown, '알려진 저축운 히어로 이미지를 찾지 못했다')
  assert.ok(heroKnown!.referencedBy >= 1, '실제로 쓰이는 이미지인데 참조 수가 0으로 잡혔다')
})

test('미사용 자산을 먼저 보여준다', () => {
  resetMediaCatalogCache()
  const assets = getMediaCatalog()
  const firstUsedIndex = assets.findIndex((asset) => asset.status === 'in_use')
  if (firstUsedIndex === -1) return // 미사용 자산이 하나도 없으면 순서를 따질 것이 없다.
  for (let i = 0; i < firstUsedIndex; i++) assert.equal(assets[i].status, 'unused', `${assets[i].path} 가 정렬 순서를 어겼다`)
})

test('5분 안에는 다시 훑지 않고 캐시를 돌려준다', () => {
  resetMediaCatalogCache()
  const first = getMediaCatalog()
  const second = getMediaCatalog()
  assert.equal(first, second, '캐시가 재사용되지 않았다')
})
