import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-14 운영 장애 회귀 방지.
 *
 * 증상: /cmdg/ 에서 "해석 시작"을 눌러도 고민 화면으로 되돌아왔다. 아무 안내도 없었다.
 *
 * 실제로 겹친 원인이 네 가지였다.
 *   1. `window.UMSHReportAccess.firstInsight` 를 가드 없이 불렀다. /cmdg/ 는
 *      `umsh-report-access.js` 를 로드하지 않으므로 renderResult 가 TypeError 로 죽었다.
 *   2. 그 TypeError 가 `analyzeBirth().catch` 로 흘러가 "분석 실패"로 둔갑했다.
 *      분석 API 는 200 이었는데도 사용자는 앞 화면으로 되돌려졌다.
 *   3. `showNudge` 가 `stage.querySelector(".panel")?.append` 였다. 로딩 화면에는
 *      `.panel` 이 없어 오류 문구가 조용히 버려졌다. 화면 전환 전에 부르기까지 했다.
 *   4. `saveCurrentUserProfile` 이 검증 전에 캐시를 덮어썼다. 한 번 실패하면
 *      정상 프로필 캐시가 빈 값으로 바뀌어 문제가 영구화됐다.
 *
 * 아래 검사는 이 네 가지가 다시 들어오는 것을 막는다. 런타임 테스트가 아니라
 * 소스 계약 검사다 — 이 파일들은 브라우저에서만 실행되므로 정적으로 고정한다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const CMDG = join(root, '사주', '사주', 'index.html')
const JS_DIR = join(root, '사주', 'js')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** 주석은 계약 검사 대상이 아니다. 설명문에 든 예시 코드에 걸리지 않게 걷어낸다. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

test('1. window.UMSHReportAccess 는 가드 없이 호출하지 않는다', () => {
  const targets = [CMDG, ...readdirSync(JS_DIR).filter((f) => f.endsWith('.js')).map((f) => join(JS_DIR, f))]
  const offenders: string[] = []

  for (const file of targets) {
    const source = stripComments(read(file))
    // `window.UMSHReportAccess.<멤버>` 또는 `global.UMSHReportAccess.<멤버>` 접근을 전부 찾는다.
    const pattern = /(?:window|global)\.UMSHReportAccess\.(\w+)/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(source)) !== null) {
      const lineStart = source.lastIndexOf('\n', match.index) + 1
      const before = source.slice(lineStart, match.index)

      // (a) 같은 줄에서 존재를 확인했는가
      const guardedInline =
        /(?:window|global)\.UMSHReportAccess\s*(?:\?|&&)/.test(before) ||
        /if\s*\(\s*(?:window|global)\.UMSHReportAccess\s*\)/.test(before) ||
        before.includes('UMSHReportAccess?.')

      // (b) 바로 앞 블록이 `if (window.UMSHReportAccess) {` 인가.
      //     umsh-report-view.js 처럼 블록 단위로 감싼 경우가 있다.
      const window400 = source.slice(Math.max(0, match.index - 400), match.index)
      const guardedByBlock =
        /if\s*\(\s*(?:window|global)\.UMSHReportAccess\s*\)\s*\{[^}]*$/.test(window400)

      // (c) 모듈 진입부에서 없으면 즉시 중단하는가.
      //     newyear-service.js 는 이 계약을 명시적으로 선언한다.
      const guardedByEntry =
        /if\s*\(\s*!\s*(?:window|global)\.UMSHReportAccess\s*\)\s*(?:\{[^}]*)?throw/.test(
          source.slice(0, match.index),
        )

      // 모듈 자신의 정의부는 제외한다.
      const isDefinition = /(?:window|global)\.UMSHReportAccess\s*=/.test(source.slice(lineStart, lineStart + 200))

      if (!guardedInline && !guardedByBlock && !guardedByEntry && !isDefinition) {
        offenders.push(`${file.slice(root.length + 1)}: ${source.slice(lineStart, match.index + 40).trim()}`)
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    '가드 없는 UMSHReportAccess 접근이 있다. /cmdg/ 등 이 스크립트를 로드하지 않는 페이지에서 TypeError 로 죽는다.',
  )
})

test('2. 씬 렌더 실패가 호출부로 새어 나가지 않는다', () => {
  const source = stripComments(read(CMDG))
  const dispatch = source.indexOf('steps[scene]()')
  assert.notEqual(dispatch, -1, 'go() 의 씬 디스패치를 찾지 못했다')

  const before = source.slice(Math.max(0, dispatch - 400), dispatch)
  assert.match(
    before,
    /try\s*\{[^}]*$/,
    'steps[scene]() 이 try 블록 안에 있어야 한다. 렌더 오류가 analyzeBirth().catch 로 흘러가면 분석 실패로 둔갑한다.',
  )
  assert.ok(
    source.includes('renderSceneFailure('),
    '렌더 실패 시 사용자에게 보이는 화면(renderSceneFailure)이 있어야 한다.',
  )
})

test('3. 실패 안내는 버려지지 않고, 화면 전환 뒤에 붙는다', () => {
  const source = stripComments(read(CMDG))

  assert.ok(
    !source.includes('stage.querySelector(".panel")?.append(nudge)'),
    'showNudge 가 .panel 없을 때 조용히 사라진다. 로딩 화면에는 .panel 이 없다.',
  )
  assert.match(
    source,
    /function showNudge[\s\S]{0,600}?stage\.querySelector\("\.panel"\)\s*\|\|/,
    'showNudge 에 대체 컨테이너 폴백이 있어야 한다.',
  )

  // analyzeBirth 의 catch: go() 가 showNudge() 보다 먼저 와야 한다.
  const catchBlock = source.match(/\.catch\(\(err\)\s*=>\s*\{([\s\S]{0,500}?)\}\);/g) ?? []
  const analyzeCatch = catchBlock.find((block) => block.includes('사주 분석에 실패했습니다'))
  assert.ok(analyzeCatch, 'analyzeBirth 의 catch 블록을 찾지 못했다')
  const goAt = analyzeCatch.indexOf('go(')
  const nudgeAt = analyzeCatch.indexOf('showNudge(')
  assert.ok(goAt !== -1 && nudgeAt !== -1, 'catch 블록에 go/showNudge 가 모두 있어야 한다')
  assert.ok(
    goAt < nudgeAt,
    'go() 가 stage.innerHTML 을 갈아끼우므로 showNudge 를 먼저 부르면 안내가 지워진다.',
  )
})

test('4. 프로필 저장은 검증 전에 캐시를 덮어쓰지 않는다', () => {
  const source = stripComments(read(CMDG))
  const start = source.indexOf('async function saveCurrentUserProfile')
  assert.notEqual(start, -1, 'saveCurrentUserProfile 을 찾지 못했다')
  const body = source.slice(start, start + 900)

  const guardAt = body.indexOf('hasUsableProfileState()')
  const writeAt = body.indexOf('writeCachedUserProfile(')
  assert.ok(guardAt !== -1, '저장 전에 hasUsableProfileState() 검증이 있어야 한다')
  assert.ok(writeAt !== -1, 'writeCachedUserProfile 호출을 찾지 못했다')
  assert.ok(
    guardAt < writeAt,
    '검증보다 캐시 쓰기가 먼저다. 실패한 시도가 정상 프로필 캐시를 빈 값으로 덮어써 문제가 영구화된다.',
  )
})

test('5. 이름 규칙은 서버와 같다', () => {
  // 기존 사주와 최신 /cmdg/의 이름 계약을 함께 검사한다. 다른 렌더 가드는 유지한다.
  const client = stripComments(read(join(root, '사주', 'cmdg', 'index.html')))
  const server = stripComments(read(join(root, 'src', 'server', 'app.ts')))
  const message = '이름은 문자 2자 이상 20자 이하로 입력해 주세요.'

  function functionSource(source: string, name: string): string {
    const match = source.match(new RegExp(
      'function ' + name + '\\([^)]*\\)(?:\\s*:\\s*boolean)?\\s*\\{[\\s\\S]*?^\\s*\\}', 'm',
    ))
    assert.ok(match, name + ' 함수를 찾지 못했다')
    return match[0].replace('value: string', 'value').replace(/\)\s*:\s*boolean/, ')')
  }

  const serverValid = new Function(
    functionSource(server, 'isValidProfileName') + '; return isValidProfileName;',
  )() as (value: string) => boolean
  const legacy = stripComments(read(CMDG))
  const legacyChecks = new Function(
    functionSource(legacy, 'isUsableProfileName') + '\n' +
    functionSource(legacy, 'validateName') + '\n' +
    'return { isUsableProfileName, validateName };',
  )() as {
    isUsableProfileName: (value: string) => boolean
    validateName: (value: string) => string
  }
  let cached: { userId: string; name: string } | null = null
  const clientChecks = new Function('readCachedUserProfile',
    functionSource(client, 'isUsableProfileName') + '\n' +
    functionSource(client, 'validateName') + '\n' +
    functionSource(client, 'cachedProfileForSession') + '\n' +
    'return { isUsableProfileName, validateName, cachedProfileForSession };',
  )(() => cached) as {
    isUsableProfileName: (value: string) => boolean
    validateName: (value: string) => string
    cachedProfileForSession: (session: { user: { id: string } } | null) => unknown
  }

  const cases: [string, boolean][] = [
    ['Alex Morgan', true], ['日本語', true], ['한글', true],
    ['A. B', true], ["O'Neil", true], ['O’Neil', true], ['Anne-Marie', true],
    ['  Alex Morgan  ', true], ['e\u0301mile', true], ['한글', true],
    ['𐐀𐐁', true], ['𐐀'.repeat(20), true], ['가'.repeat(20), true],
    ['', false], ['  ', false], ['A', false], ['e\u0301', false],
    ['가'.repeat(21), false], ['𐐀'.repeat(21), false],
    ['<b>Alex</b>', false], ['Alex123', false], ['123', false],
    ['Alex_Morgan', false], ['Alex@Morgan', false], ['Alex🙂', false],
    ['.Alex', false], ["'Alex", false], ['-Alex', false], ['Alex\tMorgan', false],
  ]
  for (const [name, expected] of cases) {
    assert.equal(serverValid(name), expected, '서버: ' + JSON.stringify(name))
    assert.equal(legacyChecks.isUsableProfileName(name), expected, '기존 사주 캐시 이름: ' + JSON.stringify(name))
    assert.equal(legacyChecks.validateName(name), expected ? '' : message, '기존 사주 입력 안내: ' + JSON.stringify(name))
    assert.equal(clientChecks.isUsableProfileName(name), expected, '캐시 이름: ' + JSON.stringify(name))
    assert.equal(clientChecks.validateName(name), expected ? '' : message, '입력 안내: ' + JSON.stringify(name))
    cached = { userId: 'owner', name }
    assert.equal(clientChecks.cachedProfileForSession({ user: { id: 'owner' } }), expected ? cached : null,
      '캐시 복원: ' + JSON.stringify(name))
    assert.equal(clientChecks.cachedProfileForSession(null), expected ? cached : null,
      '세션 없는 캐시: ' + JSON.stringify(name))
  }
  cached = { userId: 'owner', name: 'Alex Morgan' }
  assert.equal(clientChecks.cachedProfileForSession({ user: { id: 'other' } }), null)
  cached = null
  assert.equal(clientChecks.cachedProfileForSession(null), null)
  assert.match(functionSource(client, 'applyUserProfile'), /!isUsableProfileName\(profile\.name\)/,
    '서버 또는 캐시 프로필을 적용하기 전에 같은 이름 검증을 사용해야 한다')
  assert.ok(server.includes(message), '클라이언트 안내 문구는 서버와 같아야 한다')
})

test('6. 고민 화면은 캐시에서 프로필을 복구한다', () => {
  const source = stripComments(read(CMDG))
  const start = source.indexOf('function renderConcern')
  assert.notEqual(start, -1, 'renderConcern 을 찾지 못했다')
  const body = source.slice(start, start + 700)
  assert.ok(
    body.includes('hydrateProfileFromCache('),
    'renderConcern 이 캐시에서 상태를 복구해야 한다. 복구하지 않으면 새로고침 뒤 빈 상태로 분석을 시도해 실패한다.',
  )
})

test('7. 결과 화면 CTA 는 스크롤 중에도 붙어 있다', () => {
  // 결과 article 은 15,324px — 912px 뷰포트로 16.8화면이다. 그런데 구매로 가는 CTA 는
  // 15,084px, 사실상 맨 끝에 하나뿐이다. 이 규칙이 그 버튼을 화면에 붙들어 둔다.
  //
  // 2026-09-14 에 이 수정이 한 번 조용히 사라졌고, `position: relative` 인 채로 배포돼
  // 있었다. 클래스 이름이 sticky 라서 눈으로는 걸러지지 않는다. 그래서 고정한다.
  const source = stripComments(read(CMDG))
  const rule = source.match(/\.sticky-story-cta\s*\{[^}]*\}/)
  assert.ok(rule, '.sticky-story-cta 규칙을 찾지 못했다')
  assert.match(
    rule[0], /position:\s*sticky/,
    '결과 화면 CTA 가 고정되지 않는다. 구매 동선이 16.8화면 아래로 내려간다.',
  )
  assert.match(rule[0], /bottom:\s*0/, 'sticky 는 기준 변(bottom)이 있어야 붙는다')
})
