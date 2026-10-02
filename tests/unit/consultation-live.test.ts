import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createLiveToken } from '../../src/consultation/live.js'
const originalFetch = globalThis.fetch, originalKey = process.env.GEMINI_API_KEY
after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey })
test('Live token locks transcription and tool contract; permanent key stays server-side', async () => {
  process.env.GEMINI_API_KEY = 'isolated-test-secret'
  let request: any
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/auth_tokens')
    request = JSON.parse(String(init?.body))
    assert.equal((init?.headers as any)['x-goog-api-key'], 'isolated-test-secret')
    return new Response(JSON.stringify({ name: 'auth_tokens/isolated' }))
  }
  const result = await createLiveToken()
  assert.equal(request.uses, 1)
  assert.ok(Date.parse(request.expireTime) - Date.now() <= 600000)
  assert.deepEqual(request.liveConnectConstraints.config.inputAudioTranscription, {})
  assert.deepEqual(request.liveConnectConstraints.config.outputAudioTranscription, {})
  assert.equal(request.liveConnectConstraints.config.tools[0].functionDeclarations[0].name, 'consult_saju')
  assert.doesNotMatch(JSON.stringify(result), /isolated-test-secret/)
})
test('upstream error never returns key or provider message', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'isolated-test-secret' } }), { status: 400 })
  await assert.rejects(createLiveToken(), error => error instanceof Error && error.message === 'PROVIDER_UNAVAILABLE')
})
test('Live displays both transcripts, deduplicates tool calls, and stops audio on interruption', async () => {
  let socket: any, stopped = 0, tracksStopped = 0, questions = 0
  const sent: any[] = [], transcripts: any[] = []
  class Socket {
    readyState = 1; bufferedAmount = 0; onmessage: any; onopen: any
    constructor(public url: string) { socket = this }
    send(value: string) { sent.push(JSON.parse(value)) }
    close() { this.readyState = 3 }
  }
  const node = () => ({ connect() {}, disconnect() {} })
  const ctx: any = { WebSocket: Socket, console, crypto: { randomUUID: () => 'request-one' }, navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => tracksStopped++ }] }) } },
    AudioContext: function () { return { currentTime: 0, sampleRate: 16000, destination: {}, resume: async () => {}, close: async () => {},
      createMediaStreamSource: node, createScriptProcessor: node, createGain: () => ({ ...node(), gain: {} }),
      createBuffer: (_: number, n: number, rate: number) => ({ duration: n / rate, getChannelData: () => new Float32Array(n) }),
      createBufferSource: () => ({ ...node(), start() {}, stop() { stopped++ } }),
    } }, setTimeout: () => 1, clearTimeout() {}, atob, btoa, Uint8Array, DataView }
  ctx.window = ctx
  runInNewContext(readFileSync(new URL('../../사주/js/consultation-live.js', import.meta.url), 'utf8'), ctx)
  const client = ctx.UMSHConsultationLive({ connect: async () => ({ token: 'short-lived', model: 'models/test', expiresIn: 600 }), ready() {}, closed() {}, error(error: any) { throw error }, notice() {}, turnComplete() {}, transcript: (...args: any[]) => transcripts.push(args), question: async () => { questions++; return { text: '서버 저장 답변' } } })
  await client.start(); socket.onopen()
  assert.match(socket.url, /BidiGenerateContentConstrained\?access_token=short-lived$/)
  const receive = async (value: any) => socket.onmessage({ data: JSON.stringify(value) })
  await receive({ setupComplete: {} })
  await receive({ serverContent: { inputTranscription: { text: '직장 상담' }, outputTranscription: { text: '기운을 살펴보세' }, modelTurn: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/pcm;rate=24000' } }] } } })
  assert.deepEqual(transcripts, [['user', '직장 상담'], ['assistant', '기운을 살펴보세']])
  await receive({ serverContent: { interrupted: true } }); assert.equal(stopped, 1)
  const call = { toolCall: { functionCalls: [{ id: 'tool-one', name: 'consult_saju', args: { text: '직장 상담' } }] } }
  await receive(call); await receive(call); await new Promise(resolve => setImmediate(resolve))
  assert.equal(questions, 1)
  assert.equal(sent.filter(v => v.toolResponse).length, 2)
  client.stop(); assert.equal(tracksStopped, 1)
  await receive({ serverContent: { outputTranscription: { text: '종료 뒤 비공개' } } })
  assert.equal(transcripts.length, 2)
})
