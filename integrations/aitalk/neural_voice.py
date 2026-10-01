"""Online neural speech; no paid TTS key, no OS speech fallback.

Uses the community edge-tts client. Availability/limits are controlled by the
upstream service; this is not an Azure SLA or a guarantee of unlimited use.
"""
import asyncio
import edge_tts

VOICES = {'ko-KR-SunHiNeural', 'ko-KR-InJoonNeural', 'ko-KR-HyunsuMultilingualNeural'}


def voice_settings(profile):
    voice = profile.get('voiceName')
    if voice not in VOICES:
        voice = 'ko-KR-InJoonNeural' if profile.get('voiceGender') == 'male' else 'ko-KR-SunHiNeural'
    try:
        speed = min(1.3, max(.7, float(profile.get('voiceRate', 1))))
    except (ValueError, TypeError):
        speed = 1
    return voice, f'{round((speed-1)*100):+d}%'


async def synthesize(text, profile):
    voice, rate = voice_settings(profile)
    async def collect():
        result = bytearray()
        async for chunk in edge_tts.Communicate(text[:2000], voice, rate=rate, pitch='+0Hz').stream():
            if chunk['type'] == 'audio':
                result.extend(chunk['data'])
        if not result:
            raise RuntimeError('No neural speech returned')
        return bytes(result)
    return await asyncio.wait_for(collect(), timeout=25)
