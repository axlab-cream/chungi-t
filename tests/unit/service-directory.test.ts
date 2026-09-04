import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listServiceDirectory, serviceHrefForKey } from '../../src/server/service-directory.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('검색 목록은 서비스마다 자기 썸네일을 가진다', () => {
  const services = listServiceDirectory()
  assert.ok(services.length > 0)

  // 같은 그림을 돌려 쓰면 검색 화면에 똑같은 카드가 여러 장 뜬다.
  const images = services.map((service) => service.image)
  assert.equal(new Set(images).size, images.length, '중복된 썸네일이 있습니다')
  images.forEach((image) => assert.ok(image, '썸네일이 비어 있는 서비스가 있습니다'))

  // 목록에 있는 그림은 실제로 저장소에 있어야 한다. /assets 는 사주/사주/assets 와
  // 사주/assets 두 곳에서 서빙되므로 둘 다 본다.
  services.forEach((service) => {
    const candidates = service.image.startsWith('/assets/')
      ? [join(ROOT, '사주', '사주', service.image), join(ROOT, '사주', service.image)]
      : [join(ROOT, '사주', service.image)]
    assert.ok(
      candidates.some((candidate) => existsSync(candidate)),
      `${service.key} 썸네일 파일 없음: ${service.image}`,
    )
  })
})

test('검색 목록은 카탈로그의 제목과 금액을 그대로 쓴다', () => {
  const services = listServiceDirectory()
  const keys = services.map((service) => service.key)
  assert.equal(new Set(keys).size, keys.length, '중복된 서비스 키가 있습니다')

  services.forEach((service) => {
    assert.ok(service.title, `${service.key} 제목 없음`)
    assert.ok(service.amount > 0, `${service.key} 금액 없음`)
    assert.match(service.href, /^\//, `${service.key} 경로가 절대 경로가 아닙니다`)
  })

  // 고양이 궁합은 방금 연 서비스라 목록에 반드시 있어야 한다.
  assert.ok(keys.includes('cat_compatibility'))
})

test('보관함은 저장된 풀이를 원래 서비스로 되돌린다', () => {
  assert.equal(serviceHrefForKey('cat_compatibility'), '/match/cat')
  assert.equal(serviceHrefForKey('job_choice'), '/work/job-choice')
  // 목록에서 감춘 서비스도 보관함에서는 열 수 있어야 한다.
  assert.equal(serviceHrefForKey('love_mind'), '/love/mind')
  assert.equal(serviceHrefForKey(undefined), undefined)
  assert.equal(serviceHrefForKey('nope'), undefined)
})
