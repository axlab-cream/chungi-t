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
      '잘 오셨습니다. 방금 펼친 사주의 결을 이어서 보겠습니다. 묻고 싶은 걸 한 문장으로 던져보세요. 천기 선생님이 하나씩 풀어드리겠습니다.')
    if (session.initialConcern) {
      appendBubble('assistant', `"${session.initialConcern}" 때문에 여기까지 왔군요. 그 고민도 사주의 흐름 안에서 같이 보겠습니다.`)
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
