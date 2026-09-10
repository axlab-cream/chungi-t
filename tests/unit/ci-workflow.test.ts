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
        for (const banned of ['vercel deploy', 'vercel --prod', 'amondnet/vercel-action', 'vercel/action']) {
          assert.ok(!steps.includes(banned), `${name} 에 배포 단계가 들어왔다: ${banned}`)
        }
      }
    })

    it('워크플로 권한이 읽기로 제한된다', () => {
      for (const name of workflows) {
        const yaml = readFileSync(new URL(name, workflowDir), 'utf8')
        assert.match(yaml, /permissions:\s*\n\s*contents: read/, `${name} 에 권한 제한이 없다`)
      }
    })
  })

  describe('정상 동작', () => {
    const ci = read('.github/workflows/ci.yml')

    it('회귀 게이트를 전부 실행한다', () => {
      // 게이트를 조용히 빼면 그 회귀가 배포 전에 잡히지 않는다.
      for (const step of ['npm ci', 'npm run typecheck', 'npm test', 'verify-seo-foundation.mjs', 'npm run qa:all-services']) {
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
