import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { CMDG_READING_CONTRACT } from '../../src/report/cmdg-reading-contract.js'
import '../../사주/js/umsh-love-target.js'

/**
 * 천명사주는 전체 사주라 연애·일 장을 쓰려면 관계·일·연애 상대를 알아야 한다.
 * 8월에 뺀 관계·일 화면을 한 화면으로 되살리고, 관계 기준은 "이성/동성" 대신 연애 상대 성별로 묻는다.
 * 서버·AI·참고서는 기존 orientation 칸을 그대로 쓰므로, 화면이 그 칸을 올바르게 채우는지가 핵심이다.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const source = readFileSync(join(root, '사주', '사주', 'index.html'), 'utf8').replaceAll('\r\n', '\n')

// 화면은 /js/umsh-love-target.js 를 먼저 불러온다. 테스트도 같은 파일을 window 로 넘긴다.
const win = { UMSHLoveTarget: (globalThis as unknown as { UMSHLoveTarget: { LOVE_TARGETS: string[] } }).UMSHLoveTarget }

const fn = (name: string) => {
  const start = source.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} 을 찾지 못했습니다`)
  const end = source.indexOf('\n      }\n', start)
  return source.slice(start, end + '\n      }'.length)
}

function mapping(gender: string, loveTarget: string): string {
  const state = { gender, loveTarget }
  // eslint-disable-next-line no-new-func
  return new Function('state', 'window', `${fn('orientationFromLoveTarget')}\nreturn orientationFromLoveTarget();`)(state, win)
}

describe('천명사주 생활 정보 입력', () => {
  it('시간 입력 다음에 연애 상대 → 지금 관계 → 요즘 일 → 고민 순으로 한 문항씩 묻는다(연애운은 자체 고민 화면 그대로)', () => {
    const goes = source.match(/go\(isLoveThisYearService\(\) \? "concern" : "love-target"\)/g) ?? []
    assert.equal(goes.length, 2, '시간 입력·시간 모름 두 경로 모두')
    assert.match(source, /"love-target": renderLoveTarget,\s*"life-relationship": renderLifeRelationship,\s*"life-work": renderLifeWork,/)
    assert.match(fn('renderLoveTarget'), /next: "life-relationship"/)
    assert.match(fn('renderLifeRelationship'), /next: "life-work"/)
    assert.match(fn('renderLifeWork'), /next: "concern"/)
    assert.doesNotMatch(fn('renderLifeQuestion'), /건너뛰기|life-skip/, '세 문항은 필수라 건너뛸 수 없다')
    assert.match(fn('renderLifeQuestion'), /data-action="life-next" data-require="\$\{key\}" data-goto="\$\{next\}"/, '고른 뒤 다음으로를 눌러 넘어간다')
    assert.match(source, /if \(action === "life-next"\) \{[\s\S]{0,160}showNudge\("하나를 골라 주세요\."\)/, '안 고르면 넘어가지 않는다')
  })

  it('모든 입력 화면에서 이전은 패널 맨 위(제목 위) 같은 자리에 있고, 아래 버튼 줄에는 없다', () => {
    for (const name of ['renderName', 'renderBirth', 'renderTime', 'renderLifeQuestion', 'renderLoveConcern', 'renderConcern']) {
      const body = fn(name)
      assert.match(body, /<section class="panel[^"]*">\s*\$\{stepBackButton\(\)\}/, `${name}: 패널 맨 위에 이전`)
      assert.doesNotMatch(body, /class="ghost" type="button" data-action="prev"/, `${name}: 아래 줄 이전 없음`)
    }
    assert.match(fn('stepBackButton'), /data-action="prev"/)
  })

  it('연애 상대는 남자/여자/둘 다·상관없음이고, 화면에 지향 표현을 쓰지 않는다', () => {
    assert.match(source, /const LOVE_TARGET_OPTIONS = window\.UMSHLoveTarget\.LOVE_TARGETS;/)
    assert.match(source, /<script src="\/js\/umsh-love-target\.js[^"]*"><\/script>/, '공용 파일을 불러온다')
    assert.deepEqual([...win.UMSHLoveTarget.LOVE_TARGETS], ['남자', '여자', '둘 다·상관없음'])
    for (const name of ['renderLifeQuestion', 'renderLoveTarget', 'renderLifeRelationship', 'renderLifeWork']) {
      assert.doesNotMatch(fn(name), /동성|이성|LGBT|헤테로/, `${name} 에 지향 표현이 없어야 한다`)
    }
  })

  it('고민 화면에 들어올 때 연애 상대로부터 관계 기준 값을 채운다(저장 프로필에서 온 경우 포함)', () => {
    const concern = fn('renderConcern')
    assert.match(concern, /state\.orientation = orientationFromLoveTarget\(\);/)
  })

  it('연애 상대 성별을 본인 성별과 맞춰 기존 관계 기준 값으로 바꾼다', () => {
    assert.equal(mapping('여자', '남자'), '이성 관계 중심 · 연애 상대 남자')
    assert.equal(mapping('여자', '여자'), '동성 관계 중심 · 연애 상대 여자')
    assert.equal(mapping('남자', '남자'), '동성 관계 중심 · 연애 상대 남자')
    assert.equal(mapping('남자', '둘 다·상관없음'), '관계 패턴 중심 · 연애 상대 성별 무관')
    assert.equal(mapping('남자', ''), '관계 패턴 중심 · 연애 상대 성별 무관', '고르지 않으면 성별 무관')
  })

  it('AI 지시문은 입력된 연애 상대 성별을 따르고, 없으면 성별을 짐작하지 않게 한다', () => {
    assert.match(CMDG_READING_CONTRACT, /연애 상대 남자\/여자/)
    assert.match(CMDG_READING_CONTRACT, /본인 성별로 상대 성별을 짐작하지 마세요/)
  })

  it('저장 프로필·로그인 복귀로 바로 고민 화면에 가는 경로도 세 문항이 비면 먼저 묻는다', () => {
    assert.match(source, /go\(profile \? concernOrLifeScene\(\) : "name"\)/)
    assert.match(source, /go\(backToResult \? "result" : concernOrLifeScene\(\)\)/)
    const scene = (state: Record<string, string>) =>
      new Function('state', 'isLoveThisYearService', 'LOVE_TARGET_OPTIONS', 'window', `${fn('loveTargetFromOrientation')}
${fn('concernOrLifeScene')}
return concernOrLifeScene();`)(state, () => false, ['남자', '여자', '둘 다·상관없음'], win)
    assert.equal(scene({ orientation: '이성 관계 중심 · 연애 상대 남자', relationship: '솔로예요', work: '직장 다녀요' }), 'concern')
    assert.equal(scene({ orientation: '이성 관계 중심', relationship: '솔로예요', work: '직장 다녀요' }), 'love-target', '예전 값엔 상대 성별이 없어 다시 묻는다')
    assert.equal(scene({ orientation: '관계 패턴 중심 · 연애 상대 성별 무관', relationship: '', work: '직장 다녀요' }), 'love-target')
  })

  it('세 문항 화면은 새로고침해도 그 화면으로 돌아온다(URL 복원 목록)', () => {
    const list = source.slice(source.indexOf('const urlScenes = new Set(['), source.indexOf(']);', source.indexOf('const urlScenes = new Set([')))
    for (const scene of ['love-target', 'life-relationship', 'life-work']) assert.ok(list.includes(`"${scene}"`), scene)
  })
})
