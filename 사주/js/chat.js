const chatLog = document.getElementById('chat-log')
const chatForm = document.getElementById('chat-form')
const chatMessage = document.getElementById('chat-message')
const btnSend = document.getElementById('btn-send')

function loadSession() {
  const birthRaw = sessionStorage.getItem('cheongi_birth')
  const analysisRaw = sessionStorage.getItem('cheongi_analysis')
  if (!birthRaw || !analysisRaw) {
    location.href = '/'
    return null
  }
  return {
    birth: JSON.parse(birthRaw),
    analysis: JSON.parse(analysisRaw),
    history: JSON.parse(sessionStorage.getItem('cheongi_chat_history') || '[]'),
    initialConcern: sessionStorage.getItem('cheongi_initial_concern') || '',
  }
}

function saveHistory(history) {
  sessionStorage.setItem('cheongi_chat_history', JSON.stringify(history))
}

function appendBubble(role, text) {
  const div = document.createElement('div')
  div.className = `bubble ${role}`
  div.textContent = text
  chatLog.appendChild(div)
  chatLog.scrollTop = chatLog.scrollHeight
}

const session = loadSession()
if (session) {
  const p = session.analysis.pillars
  if (p) {
    document.getElementById('chat-saju-label').textContent =
      `사주 ${p.year?.hanja || ''} ${p.month?.hanja || ''} ${p.day?.hanja || ''} ${p.hour?.hanja || ''}`
  }

  if (session.history.length === 0) {
    appendBubble('assistant',
      '반갑습니다. 천기 선생입니다. 방금 보신 사주를 바탕으로 마음속 이야기를 편하게 나눠 보시겠어요?')
    if (session.initialConcern) {
      appendBubble('assistant', `입력하신 "${session.initialConcern}"에 대해서도 함께 살펴보겠습니다.`)
    }
  } else {
    for (const turn of session.history) appendBubble(turn.role, turn.content)
  }
}

document.getElementById('btn-back').addEventListener('click', () => {
  history.back()
})

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!session) return

  const message = chatMessage.value.trim()
  if (!message) return

  appendBubble('user', message)
  chatMessage.value = ''
  btnSend.disabled = true
  btnSend.textContent = '...'

  session.history.push({ role: 'user', content: message })
  saveHistory(session.history)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birth: session.birth,
        message,
        history: session.history.slice(0, -1),
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || '상담 실패')

    appendBubble('assistant', json.reply)
    session.history.push({ role: 'assistant', content: json.reply })
    saveHistory(session.history)
  } catch (err) {
    appendBubble('system', err.message || '상담 중 오류가 발생했습니다.')
  } finally {
    btnSend.disabled = false
    btnSend.textContent = '전송'
    chatMessage.focus()
  }
})
