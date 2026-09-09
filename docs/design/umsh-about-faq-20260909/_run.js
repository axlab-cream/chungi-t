const fs = require('fs')
let src = fs.readFileSync('_check.js', 'utf-8')
src = src.replace('class DCLogic {}', 'class DCLogic { constructor() { this.state = {} } setState(p) { Object.assign(this.state, p) } }')
src += `
const c = new Component({})
c.state = { service: 'wedding', step: '1', faq: 'f1' }
const v = c.renderVals()
console.log('services', v.services.length, '/ steps', v.steps.length, '/ faqs', v.faqs.length)
console.log('current:', v.current.title, '|', v.current.badge, '|', v.current.volume, '| toc', v.current.toc.length)
const bad = v.services.filter((s) => !s.art || !s.family || !s.badge || !s.price)
console.log('빠진 값 있는 카드:', bad.length === 0 ? '없음' : bad.map((s) => s.title).join(', '))
console.log('선택 표시:', v.services.filter((s) => s.pick).map((s) => s.title).join(', '))
console.log('아트 파일:', v.services.map((s) => s.art).join(' '))
`
eval(src)
