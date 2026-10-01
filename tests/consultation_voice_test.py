import asyncio
import hashlib
import hmac
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location('voice_handler', ROOT / 'api/consultation-voice.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class VoiceAuthenticationTest(unittest.TestCase):
    def request(self, data, signed=True):
        body = json.dumps(data).encode()
        handler = object.__new__(module.handler)
        handler.headers = {'Content-Length': str(len(body)), 'x-consultation-signature': hmac.new(b'test-secret', body, hashlib.sha256).hexdigest() if signed else 'invalid'}
        handler.rfile, handler.wfile = io.BytesIO(body), io.BytesIO()
        handler.send_error = lambda code, *args: setattr(handler, 'code', code)
        handler.send_response = lambda code: setattr(handler, 'code', code)
        handler.send_header = lambda *args: None
        handler.end_headers = lambda: None
        with patch.dict(os.environ, {'CONSULTATION_VOICE_SECRET': 'test-secret'}):
            handler.do_POST()
        return handler

    def test_unsigned_and_expired_requests_never_synthesize(self):
        with patch.object(module, 'synthesize') as speech:
            self.assertEqual(self.request({'text': '테스트', 'expires': int(time.time()) + 40}, False).code, 401)
            self.assertEqual(self.request({'text': '테스트', 'expires': 1}).code, 401)
            speech.assert_not_called()

    def test_valid_signature_uses_original_voice_contract(self):
        async def speech(text, profile):
            self.assertEqual(profile['voiceName'], 'ko-KR-InJoonNeural')
            return b'isolated-test-audio'
        with patch.object(module, 'synthesize', speech):
            result = self.request({'text': '테스트', 'expires': int(time.time()) + 40, 'profile': {'voiceName': 'ko-KR-InJoonNeural', 'voiceRate': .95}})
        self.assertEqual(result.code, 200)
        self.assertEqual(json.loads(result.wfile.getvalue())['audioMime'], 'audio/mpeg')

if __name__ == '__main__':
    unittest.main()
