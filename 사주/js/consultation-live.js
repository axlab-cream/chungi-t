/* Google Live transport. Only short-lived, server-restricted tokens enter here. */
(function () {
  'use strict';
  window.UMSHConsultationLive = function (hooks) {
    let socket, ctx, stream, source, processor, sink, timer, startupTimer, ended = false, available = false, nextAudio = 0;
    let idleTimer, responseTimer, answering = false, lastSpeech = 0, audioOpen = false;
    const IDLE_MS = 10000;
    function idleStop() { stop('10초 동안 대화가 없어 음성 연결을 종료했어요. 채팅으로 이어가 주세요.', 'idle'); }
    function armIdle() {
      clearTimeout(idleTimer);
      if (!ended && !answering && !playing.size) idleTimer = setTimeout(idleStop, IDLE_MS);
    }
    function responding() {
      if (answering) return;
      answering = true; clearTimeout(idleTimer);
      responseTimer = setTimeout(() => { stop('음성 응답이 지연되어 연결을 종료했어요. 채팅으로 이어가 주세요.', 'idle'); }, 120000);
    }
    const playing = new Set(), calls = new Map(), cancelled = new Set();
    function send(value) { if (!ended && socket?.readyState === 1) socket.send(JSON.stringify(value)); }
    function interrupt() { for (const node of playing) { try { node.stop(); } catch (_) {} } playing.clear(); nextAudio = 0; }
    function stop(message, reason) {
      if (ended) return;
      ended = true; available = false; clearTimeout(timer); clearTimeout(startupTimer); clearTimeout(idleTimer); clearTimeout(responseTimer); interrupt();
      if (processor) processor.onaudioprocess = null;
      for (const node of [processor, source, sink]) { try { node?.disconnect(); } catch (_) {} }
      stream?.getTracks().forEach(track => track.stop()); ctx?.close().catch(() => {}); socket?.close();
      hooks.closed(message || '음성 상담을 마쳤어요. 텍스트로 계속 이야기할 수 있어요.', reason);
    }
    function play(data, mime) {
      if (ended || !ctx || !/^audio\/pcm/.test(mime || '')) return;
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const view = new DataView(bytes.buffer), n = Math.floor(bytes.length / 2);
      if (!n) return;
      const rate = Number((mime.match(/rate=(\d+)/) || [])[1] || 24000);
      if (rate < 8000 || rate > 48000) return;
      const buffer = ctx.createBuffer(1, n, rate), pcm = buffer.getChannelData(0);
      for (let i = 0; i < n; i++) pcm[i] = view.getInt16(i * 2, true) / 32768;
      const node = ctx.createBufferSource(); node.buffer = buffer; node.connect(ctx.destination);
      nextAudio = Math.max(ctx.currentTime, nextAudio); node.start(nextAudio); nextAudio += buffer.duration;
      playing.add(node); node.onended = () => { playing.delete(node); if (!playing.size) armIdle(); };
    }
    async function tool(call) {
      if (ended || cancelled.has(call.id)) return;
      if (call.name !== 'consult_saju' || typeof call.args?.text !== 'string' || !call.args.text.trim() || call.args.text.length > 4000) {
        send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { error: 'INVALID_QUESTION' } }] } }); return;
      }
      responding();
      // Duplicate tool delivery shares one durable request ID and one promise.
      if (!calls.has(call.id)) calls.set(call.id, hooks.question(call.args.text, crypto.randomUUID()));
      try {
        const result = await calls.get(call.id);
        if (!cancelled.has(call.id)) send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { text: result.text } }] } });
      } catch (_) {
        send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { error: '상담을 완료하지 못했습니다. 채팅창을 확인해 주세요.' } }] } });
      }
    }
    async function start() {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
        if (ended) return;
        hooks.notice('음성 상담 연결을 확인하고 있어요.');
        const session = await hooks.connect();
        if (ended) return;
        socket = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=' + encodeURIComponent(session.token));
        startupTimer = setTimeout(() => stop('음성 연결 시간이 초과됐어요. 다시 연결하거나 텍스트로 상담해 주세요.'), 20000);
        socket.onopen = () => send({ setup: { model: session.model } });
        socket.onerror = () => stop('음성 연결에 실패했어요. 텍스트로 계속 상담할 수 있어요.');
        socket.onclose = () => stop('음성 연결이 종료됐어요. 다시 연결하거나 텍스트로 계속 상담해 주세요.');
        socket.onmessage = async event => {
          try {
            const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
            if (ended) return;
            if (message.setupComplete && !available) {
              clearTimeout(startupTimer); available = true;
              timer = setTimeout(() => stop('음성 연결 10분이 지나 종료됐어요. 다시 연결하면 이어갈 수 있어요.'), Math.min(600, session.expiresIn || 600) * 1000);
              hooks.notice('선생님과 연결됐어요. 마이크 사용을 허용하면 말씀하실 수 있어요.');
              armIdle();
              // Do not request a billed greeting until microphone permission succeeds.
              try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
              catch (error) { stop(error.name === 'NotAllowedError' ? '마이크 권한이 꺼져 있어요. 브라우저에서 허용하거나 텍스트로 상담해 주세요.' : '마이크를 연결하지 못했어요. 기기를 확인해 주세요.'); return; }
              if (ended) { stream.getTracks().forEach(track => track.stop()); return; }
              clearTimeout(startupTimer); hooks.ready();
              responding(); send({ realtimeInput: { text: '안녕하세요' } });
              source = ctx.createMediaStreamSource(stream); processor = ctx.createScriptProcessor(2048, 1, 1); sink = ctx.createGain(); sink.gain.value = 0;
              source.connect(processor); processor.connect(sink); sink.connect(ctx.destination);
              processor.onaudioprocess = event => {
                if (!available || ended) return;
                if (socket.bufferedAmount > 1024 * 1024) { stop('음성 전송이 지연돼 연결을 종료했어요. 다시 연결해 주세요.'); return; }
                const samples = event.inputBuffer.getChannelData(0);
                let energy = 0; for (const value of samples) energy += value * value;
                const speaking = Math.sqrt(energy / samples.length) >= 0.012;
                if (speaking) { lastSpeech = Date.now(); armIdle(); }
                // Keep a short end-of-speech tail; never stream ongoing silence.
                if (!speaking && (!audioOpen || Date.now() - lastSpeech >= 600)) {
                  if (audioOpen) { audioOpen = false; send({ realtimeInput: { audioStreamEnd: true } }); }
                  return;
                }
                audioOpen = true;
                const ratio = ctx.sampleRate / 16000, bytes = new Uint8Array(Math.floor(samples.length / ratio) * 2), view = new DataView(bytes.buffer);
                for (let i = 0; i < bytes.length / 2; i++) { const v = Math.max(-1, Math.min(1, samples[Math.min(samples.length - 1, Math.floor(i * ratio))])); view.setInt16(i * 2, v < 0 ? v * 32768 : v * 32767, true); }
                let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
                send({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: btoa(binary) } } });
              };

            }
            const content = message.serverContent;
            if (content) {
              if (content.interrupted) { answering = false; clearTimeout(responseTimer); interrupt(); armIdle(); }
              if (content.modelTurn || content.outputTranscription) responding();
              if (content.inputTranscription?.text) hooks.transcript('user', content.inputTranscription.text);
              if (content.outputTranscription?.text) hooks.transcript('assistant', content.outputTranscription.text);
              for (const part of content.modelTurn?.parts || []) if (part.inlineData) play(part.inlineData.data, part.inlineData.mimeType);
              if (content.turnComplete) { answering = false; clearTimeout(responseTimer); hooks.turnComplete(); armIdle(); }
            }
            for (const id of message.toolCallCancellation?.ids || []) cancelled.add(id);
            for (const call of message.toolCall?.functionCalls || []) void tool(call);
            if (message.goAway) hooks.notice('음성 연결이 곧 끝나요. 종료 후 다시 연결하면 대화를 이어갈 수 있어요.');
          } catch (_) { stop('음성 응답을 확인하지 못했어요. 텍스트로 계속 상담해 주세요.'); }
        };
      } catch (error) { stop(error.name === 'NotAllowedError' ? '마이크 권한이 꺼져 있어요. 브라우저에서 허용하거나 텍스트로 상담해 주세요.' : '음성 연결을 완료하지 못했어요. 텍스트로 상담해 주세요.'); if (error.name !== 'NotAllowedError') hooks.error(error); }
    }
    return { start, stop, interrupt };
  };
})();
