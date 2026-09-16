import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

/**
 * 줄끝(CRLF) 가드.
 *
 * 2026-09-14: Windows 에서 전체 테스트가 54건 실패했다. 내용은 한 글자도 다르지 않았다.
 * `tone-v2` 의 릴리스·증거 검사는 **파일 원본 바이트의 sha256** 을 고정하는데,
 * Windows 기본값 `core.autocrlf=true` 가 체크아웃 때 LF 를 CRLF 로 바꿔 놓아
 * 같은 파일의 해시가 달라진 것이다.
 *
 * ```
 *                  원본 바이트          LF 로 맞춘 값        릴리스에 적힌 값
 * lucky-color      669bcfa9802d2b6c     ad21c843643ed773     ad21c843643ed773
 * ```
 *
 * 그 54건은 해시 diff 만 쏟아내서 원인을 읽어 낼 수 없었다. 이 검사는 같은 상황을
 * **한 줄의 읽을 수 있는 실패**로 바꾼다. 무엇을 해야 하는지까지 적는다.
 *
 * CI 는 ubuntu-latest 라 LF 로 받는다. 이 검사가 잡는 것은 개발자 기계의 체크아웃 설정이다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** 해시로 고정되는 트리. 소스 코드는 해시 대상이 아니므로 보지 않는다. */
const HASH_PINNED = ['data/tone-v2', 'tone-v2/releases', 'tone-v2/evaluations', 'tone-v2/generated', 'tone-v2/source']
const TEXT = /\.(json|md|txt|ts|mjs|js|csv|ya?ml)$/i

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (TEXT.test(name)) out.push(path)
  }
  return out
}

test('1. 해시로 고정되는 파일에 CRLF 가 없다', () => {
  const offenders: string[] = []
  let scanned = 0

  for (const tree of HASH_PINNED) {
    for (const file of walk(join(ROOT, tree))) {
      scanned += 1
      if (readFileSync(file, 'utf8').includes('\r\n')) offenders.push(relative(ROOT, file).replace(/\\/g, '/'))
    }
  }
  assert.ok(scanned > 0, '검사 대상 트리를 하나도 찾지 못했다. HASH_PINNED 경로를 확인할 것.')

  assert.deepEqual(
    offenders.slice(0, 5),
    [],
    [
      '',
      `줄끝이 CRLF 인 파일이 ${offenders.length}개 있다 (검사 대상 ${scanned}개).`,
      '',
      '이 트리의 파일은 원본 바이트의 sha256 으로 고정된다. 줄끝만 바뀌어도 내용이 같은 채로',
      '해시가 어긋나 릴리스·증거 검사가 무더기로 깨진다(2026-09-14: 54건).',
      '',
      '고치는 법 — 커밋되지 않은 변경을 먼저 커밋한 뒤:',
      '  git config core.autocrlf false',
      '  git rm --cached -r . --quiet',
      '  git reset --hard',
      '',
      `처음 몇 개: ${offenders.slice(0, 5).join(', ')}`,
    ].join('\n'),
  )
})

test('2. .gitattributes 가 줄끝을 LF 로 고정한다', () => {
  const path = join(ROOT, '.gitattributes')
  assert.ok(existsSync(path), '.gitattributes 가 없으면 기계마다 줄끝이 달라진다.')
  const source = readFileSync(path, 'utf8')
  assert.match(source, /^\*\s+text=auto\s+eol=lf\s*$/m, '기본 규칙 `* text=auto eol=lf` 가 있어야 한다')

  // .editorconfig 와 같은 말을 해야 한다. 둘이 어긋나면 편집기와 git 이 서로를 되돌린다.
  const editorconfig = readFileSync(join(ROOT, '.editorconfig'), 'utf8')
  assert.match(editorconfig, /end_of_line\s*=\s*lf/, '.editorconfig 도 lf 여야 한다')
})
