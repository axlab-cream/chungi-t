"""Private signed bridge to the forked AI Talk voice engine; never an anonymous TTS relay."""
from http.server import BaseHTTPRequestHandler
import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
from integrations.aitalk.neural_voice import synthesize

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16000:
                self.send_error(413); return
            raw = self.rfile.read(size)
            secret = os.environ.get('CONSULTATION_VOICE_SECRET')
            signature = self.headers.get('x-consultation-signature', '')
            if not secret or len(signature) != 64 or any(c not in '0123456789abcdef' for c in signature) or not hmac.compare_digest(hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest(), signature):
                self.send_error(401); return
            data = json.loads(raw)
            expires = data.get('expires', 0)
            if not isinstance(expires, int) or not time.time() <= expires <= time.time() + 60:
                self.send_error(401); return
            if not isinstance(data.get('text'), str) or not 0 < len(data['text']) <= 2000:
                self.send_error(422); return
            audio = asyncio.run(synthesize(data['text'], data.get('profile') or {}))
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'private, no-store')
            self.end_headers()
            self.wfile.write(json.dumps({'audio': base64.b64encode(audio).decode(), 'audioMime': 'audio/mpeg'}).encode())
        except Exception:
            self.send_error(503, 'Voice unavailable')
