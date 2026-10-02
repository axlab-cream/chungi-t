"""Local adapter around the unchanged AI Talk neural voice implementation."""
import asyncio
import base64
import json
import sys
from neural_voice import synthesize

try:
    request = json.loads(sys.stdin.buffer.read(16384).decode('utf-8'))
    audio = asyncio.run(synthesize(request['text'], request['profile']))
    sys.stdout.write(json.dumps({'audio': base64.b64encode(audio).decode(), 'audioMime': 'audio/mpeg'}))
except Exception:
    sys.stderr.write('NEURAL_VOICE_UNAVAILABLE')
    sys.exit(1)
