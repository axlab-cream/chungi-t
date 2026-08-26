const ELEMENT_COLORS = {
  wood: 'var(--wood)', fire: 'var(--fire)', earth: 'var(--earth)', metal: 'var(--metal)', water: 'var(--water)',
}
const ELEMENT_LABELS = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' }

function loadAnalysis() {
  const raw = sessionStorage.getItem('cheongi_analysis')
  const birthRaw = sessionStorage.getItem('cheongi_birth')
  if (!raw || !birthRaw) {
    location.href = 'index.html'
    return null
  }
  return { analysis: JSON.parse(raw), birth: JSON.parse(birthRaw) }
}

function renderElements(elements) {
  const max = Math.max(...Object.values(elements), 1)
  const container = document.getElementById('elements')
  container.innerHTML = ''
  for (const [key, count] of Object.entries(elements)) {
    const row = document.createElement('div')
    row.className = 'element-bar'
    row.innerHTML = `
      <span>${ELEMENT_LABELS[key]}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%;background:${ELEMENT_COLORS[key]}"></div></div>
      <span>${count}</span>
    `
    container.appendChild(row)
  }
}

const data = loadAnalysis()
if (data) {
  const { analysis, birth } = data
  const name = birth.name ? `${birth.name}님의 ` : ''
  document.getElementById('result-title').textContent = `${name}사주팔자`
  document.getElementById('birth-label').textContent =
    `${birth.year}년 ${birth.month}월 ${birth.day}일 · ${birth.gender === 'female' ? '여' : '남'} · ${birth.calendar === 'lunar' ? '음력' : '양력'}`

  document.getElementById('p-hour').textContent = analysis.pillars.hour.hanja
  document.getElementById('p-hour-ko').textContent = analysis.pillars.hour.ko
  document.getElementById('p-day').textContent = analysis.pillars.day.hanja
  document.getElementById('p-day-ko').textContent = analysis.pillars.day.ko
  document.getElementById('p-month').textContent = analysis.pillars.month.hanja
  document.getElementById('p-month-ko').textContent = analysis.pillars.month.ko
  document.getElementById('p-year').textContent = analysis.pillars.year.hanja
  document.getElementById('p-year-ko').textContent = analysis.pillars.year.ko

  document.getElementById('day-master').textContent =
    `${analysis.dayMaster.hanja} (${analysis.dayMaster.ko} · ${analysis.dayMaster.element})`
  document.getElementById('day-master-desc').textContent = analysis.preview?.personality ?? ''

  renderElements(analysis.elements)
  document.getElementById('element-meta').textContent =
    `강한 기운: ${analysis.dominantElement} · 보완: ${analysis.weakElement}${analysis.usefulGod ? ` · 용신: ${analysis.usefulGod}` : ''}`

  document.getElementById('love-fortune').textContent = analysis.preview?.loveFortune ?? ''
  document.getElementById('wealth-fortune').textContent = analysis.preview?.wealthFortune ?? ''

  if (analysis.fortune) {
    document.getElementById('year-fortune').textContent =
      `${analysis.fortune.currentYear}년 세운 ${analysis.fortune.yearPillar} — 현재 대운 ${analysis.fortune.currentDaewoon}`
    document.getElementById('daewoon-fortune').textContent =
      analysis.fortune.daewoon.map((d) => `${d.age}: ${d.pillar}`).join(' · ')
  }
}

document.getElementById('btn-chat').addEventListener('click', () => {
  location.href = 'chat.html'
})

document.getElementById('btn-back').addEventListener('click', () => {
  location.href = 'index.html'
})
