import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, it } from 'node:test'

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const workflowDir = new URL('../../.github/workflows/', import.meta.url)
const workflows = readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name))

describe('[TASK] CI 워크플로 계약', () => {
  describe('보안', () => {
    it('Actions 에서 배포하지 않는다', () => {
      // 배포는 Vercel Git 연동이 한다. 여기에 배포를 넣으면 push 한 번에 배포가 두 번
      // 돌아 빌드가 중복되고 Preview URL 이 경쟁한다(T02 리서치 F9).
      assert.ok(workflows.length > 0, '워크플로가 없다')
      for (const name of workflows) {
        // 주석은 대상이 아니다. 이 금지 규칙을 설명하는 주석 자체가 걸리기 때문이다.
        const steps = readFileSync(new URL(name, workflowDir), 'utf8')
          .split('\n')
          .filter((line) => !line.trim().startsWith('#'))
          .join('\n')
        // 문자열 목록으로 보면 `npx vercel@latest --prod` 같은 형태를 놓친다
        // (2026-09-10 Codex 리뷰 Minor). 실수 방지용 계약이며, 권한 있는 사람의
        // 의도적 우회를 막는 통제는 아니다.
        const bannedPatterns: Array<[RegExp, string]> = [
          [/\bvercel(@[^\s]+)?\s+(deploy|--prod|build\s+--prod)/i, 'Vercel CLI 배포'],
          [/\bvercel(@[^\s]+)?\b[^\n]*--prod/i, 'Vercel CLI production 배포'],
          [/uses:\s*[^\s]*vercel/i, 'Vercel 배포 액션'],
          [/uses:\s*[^\s]*(netlify|cloudflare\/wrangler)/i, '다른 호스팅 배포 액션'],
        ]
        for (const [pattern, label] of bannedPatterns) {
          assert.ok(!pattern.test(steps), `${name} 에 배포 단계가 들어왔다: ${label}`)
        }
      }
    })

    it('워크플로 권한이 읽기 하나로 제한된다', () => {
      // 존재만 확인하면 `pull-requests: write` 나 job 수준 권한 승격을 놓친다
      // (2026-09-10 Codex 리뷰 Major). 블록 내용과 위치를 함께 본다.
      for (const name of workflows) {
        const lines = readFileSync(new URL(name, workflowDir), 'utf8').split('\n')
        const declarations = lines
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => /^\s*permissions:/.test(line))
        assert.equal(declarations.length, 1, `${name} 의 permissions 선언이 ${declarations.length}개다`)

        const [{ line, index }] = declarations
        // 들여쓰기가 있으면 job 수준 선언이다. 최상위 하나만 허용한다.
        assert.match(line, /^permissions:/, `${name} 에 job 수준 permissions 가 있다: ${line.trim()}`)

        const entries: string[] = []
        for (const next of lines.slice(index + 1)) {
          if (!next.trim() || next.trim().startsWith('#')) continue
          if (!/^\s+/.test(next)) break
          entries.push(next.trim())
        }
        assert.deepEqual(entries, ['contents: read'], `${name} 의 권한이 읽기 하나가 아니다`)
      }
    })
  })

  describe('정상 동작', () => {
    const ci = read('.github/workflows/ci.yml')

    it('회귀 게이트를 전부 실행한다', () => {
      // 게이트를 조용히 빼면 그 회귀가 배포 전에 잡히지 않는다.
      for (const step of ['npm ci', 'npm run typecheck', 'npm test', 'verify-seo-foundation.mjs', 'npm run qa:all-services', 'npm run vercel-build', 'git diff --exit-code']) {
        assert.ok(ci.includes(step), `CI 에 ${step} 가 없다`)
      }
    })

    it('package.json 의 모든 check 스크립트가 CI 에 있거나 제외 이유가 적혀 있다', () => {
      const scripts = Object.keys(JSON.parse(read('package.json')).scripts).filter((name) => name.startsWith('check:'))
      assert.ok(scripts.length > 10, `check 스크립트가 ${scripts.length}개뿐이다`)
      // 비밀값이 필요한 것과 배포 직전 preflight 는 CI 대상이 아니다. 다만 워크플로에
      // 그 이유가 적혀 있어야 한다 — 이유 없이 빠진 검사를 잡기 위한 조건이다.
      const excluded = ['check:integrations', 'check:production-source']
      for (const script of scripts) {
        const name = script.replace('check:', '')
        if (excluded.includes(script)) {
          assert.ok(ci.includes(script), `${script} 를 제외했는데 이유가 워크플로에 없다`)
          continue
        }
        assert.ok(ci.includes(name), `${script} 가 CI 에서 빠졌다`)
      }
    })

    it('Node 버전을 `.nvmrc` 한 곳에서 읽는다', () => {
      assert.match(ci, /node-version-file: \.nvmrc/)
      assert.match(read('.nvmrc').trim(), /^\d+$/)
    })
  })
})
