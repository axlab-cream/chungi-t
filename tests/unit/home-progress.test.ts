import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('home progress uses completed server sections and disappears on completion', () => {
  const element = () => ({ hidden: false, disabled: false, style: {}, children: [] as any[], attrs: {} as Record<string, string>, setAttribute(key: string, value: string) { this.attrs[key] = value }, replaceChildren(...children: any[]) { this.children = children } })
  const box = element(), pdf = element(), window: any = {}
  runInNewContext(readFileSync('사주/js/umsh-home-reading.js', 'utf8'), { window, document: { getElementById: (id: string) => id === 'status-box' ? box : pdf, createElement: element } })
  const render = (statuses: string[]) => window.UMSHHomeReading.renderProgress({ sections: statuses.map(status => ({ status })) })
  render(['complete', 'pending', 'generating', 'failed'])
  assert.equal(box.hidden, false)
  assert.equal(box.children[1].value, 1)
  assert.equal(box.children[1].max, 4)
  assert.equal(pdf.disabled, true)
  assert.match(box.children[2].textContent, /1개 항목을 완료하지 못했습니다/)
  render(['complete', 'failed'])
  assert.equal(box.attrs['aria-busy'], 'false')
  render(['complete', 'complete'])
  assert.equal(box.hidden, true)
  assert.equal(box.children.length, 0)
  assert.equal(pdf.disabled, false)
  render([])
  assert.equal(box.hidden, false)
  assert.equal(box.children[1].value, undefined)
  assert.equal(pdf.disabled, true)
})

test('home index omits static implementation notices', () => {
  const page = readFileSync('사주/place/home/05-step-5-chat/chat.html', 'utf8')
  const visible = page.replace(/<script\b[\s\S]*?<\/script>/g, '')
  assert.doesNotMatch(visible, /상세는 서버 권한|상세 본문 전체는 06 단계|운영 환경의 로그인/)
})
