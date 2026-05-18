"""ElevenLabs client — text-to-speech and voice listing.

API docs: https://elevenlabs.io/docs/api-reference
Endpoints used:
  POST /v1/text-to-speech/{voice_id}     — synthesize speech (returns mp3 bytes)
  GET  /v1/voices                        — list voices in the account
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx

from . import credentials as cred

BASE = "https://api.elevenlabs.io/v1"


class ElevenLabsError(RuntimeError):
    pass


def _headers(json: bool = False) -> dict:
    key = cred.get_secret("ELEVENLABS_API_KEY")
    if not key:
        raise ElevenLabsError("ELEVENLABS_API_KEY not configured. Run: vertical-studio-keys set ELEVENLABS_API_KEY")
    h = {"xi-api-key": key}
    if json:
        h["Content-Type"] = "application/json"
    return h


@dataclass
class Voice:
    voice_id: str
    name: str
    labels: dict
    preview_url: Optional[str]


def list_voices() -> list[Voice]:
    with httpx.Client(timeout=30) as c:
        r = c.get(f"{BASE}/voices", headers=_headers())
        if r.status_code >= 400:
            raise ElevenLabsError(f"voices {r.status_code}: {r.text}")
        out = []
        for v in r.json().get("voices", []):
            out.append(Voice(
                voice_id=v["voice_id"],
                name=v.get("name", ""),
                labels=v.get("labels", {}) or {},
                preview_url=v.get("preview_url"),
            ))
        return out


def synthesize(
    *,
    text: str,
    voice_id: str,
    dest: Path,
    model_id: str = "eleven_multilingual_v2",
    stability: float = 0.45,
    similarity_boost: float = 0.75,
    style: float = 0.30,
    use_speaker_boost: bool = True,
) -> Path:
    """Render `text` with `voice_id` to an mp3 at `dest`."""
    body = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": style,
            "use_speaker_boost": use_speaker_boost,
        },
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=180) as c:
        r = c.post(
            f"{BASE}/text-to-speech/{voice_id}",
            headers=_headers(json=True),
            json=body,
        )
        if r.status_code >= 400:
            raise ElevenLabsError(f"tts {r.status_code}: {r.text}")
        dest.write_bytes(r.content)
    return dest
