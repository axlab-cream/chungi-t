const HOUR_LABELS = [
  { value: 0, label: '자시 (00:00~01:00)' },
  { value: 1, label: '축시 (01:00~03:00)' },
  { value: 3, label: '인시 (03:00~05:00)' },
  { value: 5, label: '묘시 (05:00~07:00)' },
  { value: 7, label: '진시 (07:00~09:00)' },
  { value: 9, label: '사시 (09:00~11:00)' },
  { value: 11, label: '오시 (11:00~13:00)' },
  { value: 13, label: '미시 (13:00~15:00)' },
  { value: 15, label: '신시 (15:00~17:00)' },
  { value: 17, label: '유시 (17:00~19:00)' },
  { value: 19, label: '술시 (19:00~21:00)' },
  { value: 21, label: '해시 (21:00~23:00)' },
  { value: 23, label: '야자시 (23:00~00:00)' },
]

const hourSelect = document.getElementById('hour-select')
for (const h of HOUR_LABELS) {
  const opt = document.createElement('option')
  opt.value = h.value
  opt.textContent = h.label
  if (h.value === 13) opt.selected = true
  hourSelect.appendChild(opt)
}

document.getElementById('birth-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target
  const data = {
    name: form.name.value.trim(),
    calendar: form.calendar.value,
    gender: form.gender.value,
    year: Number(form.year.value),
    month: Number(form.month.value),
    day: Number(form.day.value),
    hour: Number(form.hour.value),
    minute: Number(form.minute.value),
    isLeapMonth: form.isLeapMonth.checked,
  }

  const btn = form.querySelector('button[type=submit]')
  btn.disabled = true
  btn.textContent = '분석 중...'

  try {
    const res = await fetch('/api/saju/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || '분석 실패')

    sessionStorage.setItem('cheongi_birth', JSON.stringify(data))
    sessionStorage.setItem('cheongi_analysis', JSON.stringify(json))
    location.href = 'result.html'
  } catch (err) {
    alert(err.message || '사주 분석에 실패했습니다.')
  } finally {
    btn.disabled = false
    btn.textContent = '사주 분석하기'
  }
})
