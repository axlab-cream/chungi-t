import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { ConsultationSettings } from './settings.js'

export function validatedVoicePayload(value: unknown): { audio: string; audioMime: string } {
  const data = value as { audio?: unknown; audioMime?: unknown } | null
  if (!data || typeof data.audio !== 'string' || data.audio.length < 4 || data.audio.length > 4000000 || data.audio.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.audio) || data.audioMime !== 'audio/mpeg') throw new Error('VOICE_UNAVAILABLE')
  return { audio: data.audio, audioMime: data.audioMime }
}

/** Preserve AI Talk's InJoon/edge-tts engine. Never silently change to a device voice. */
export async function synthesizeConsultation(text: string, settings: ConsultationSettings): Promise<{ audio: string; audioMime: string }> {
  if (text.length > 2000) throw new Error('VOICE_TEXT_TOO_LONG')
  const payload = { text, profile: { voiceName: settings.voiceName, voiceGender: 'male', voiceRate: settings.voiceRate } }
  if (process.env.VERCEL) {
    const host = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
    const secret = process.env.CONSULTATION_VOICE_SECRET
    if (!host || !/^[a-zA-Z0-9.-]+$/.test(host) || !secret) throw new Error('VOICE_UNAVAILABLE')
    const body = JSON.stringify({ ...payload, expires: Math.floor(Date.now() / 1000) + 45 })
    const response = await fetch(`https://${host}/api/consultation-voice`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-consultation-signature': createHmac('sha256', secret).update(body).digest('hex') },
      body, signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error('VOICE_UNAVAILABLE')
    return validatedVoicePayload(await response.json())
  }
  return await new Promise((resolve, reject) => {
    const child = spawn(process.env.CONSULTATION_PYTHON || 'python', [fileURLToPath(new URL('../../integrations/aitalk/voice_worker.py', import.meta.url))], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let output = ''
    const timer = setTimeout(() => { child.kill(); reject(new Error('VOICE_UNAVAILABLE')) }, 30000)
    child.stdout.on('data', (data: Buffer) => { output += data.toString(); if (output.length > 4000000) child.kill() })
    child.stderr.resume() // Provider diagnostics must not expose customer text.
    child.on('error', () => { clearTimeout(timer); reject(new Error('VOICE_UNAVAILABLE')) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) { reject(new Error('VOICE_UNAVAILABLE')); return }
      try { resolve(validatedVoicePayload(JSON.parse(output))) } catch { reject(new Error('VOICE_UNAVAILABLE')) }
    })
    child.stdin.on('error', () => undefined)
    child.stdin.end(JSON.stringify(payload))
  })
}
