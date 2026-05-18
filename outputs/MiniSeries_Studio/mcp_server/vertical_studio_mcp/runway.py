"""Runway Developer Platform client.

API docs: https://docs.dev.runwayml.com/
Endpoints used:
  POST /v1/image_to_video    — start a video job from an image + prompt
  POST /v1/text_to_image     — generate a reference still
  GET  /v1/tasks/{id}        — poll job status; on SUCCEEDED, .output is a list of URLs
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

import httpx

from . import credentials as cred

BASE = "https://api.dev.runwayml.com/v1"
API_VERSION = "2024-11-06"
POLL_INTERVAL = 5  # seconds


class RunwayError(RuntimeError):
    pass


def _headers() -> dict:
    key = cred.get_secret("RUNWAY_API_KEY")
    if not key:
        raise RunwayError("RUNWAY_API_KEY not configured. Run: vertical-studio-keys set RUNWAY_API_KEY")
    return {
        "Authorization": f"Bearer {key}",
        "X-Runway-Version": API_VERSION,
        "Content-Type": "application/json",
    }


@dataclass
class VideoResult:
    task_id: str
    status: str
    output_urls: list[str]
    raw: dict


def image_to_video(
    *,
    prompt_image: str,
    prompt_text: str,
    model: Literal["gen4_turbo", "gen3a_turbo", "gen4"] = "gen4_turbo",
    duration: int = 5,
    ratio: str = "720:1280",  # 9:16 vertical default
    seed: Optional[int] = None,
    timeout_s: int = 600,
) -> VideoResult:
    """Submit an image-to-video job and block until it finishes (or timeout)."""
    body = {
        "model": model,
        "promptImage": prompt_image,
        "promptText": prompt_text,
        "duration": duration,
        "ratio": ratio,
    }
    if seed is not None:
        body["seed"] = seed

    with httpx.Client(timeout=60) as c:
        r = c.post(f"{BASE}/image_to_video", headers=_headers(), json=body)
        if r.status_code >= 400:
            raise RunwayError(f"Runway submit {r.status_code}: {r.text}")
        task_id = r.json()["id"]

        deadline = time.time() + timeout_s
        while time.time() < deadline:
            time.sleep(POLL_INTERVAL)
            t = c.get(f"{BASE}/tasks/{task_id}", headers=_headers())
            if t.status_code >= 400:
                raise RunwayError(f"Runway poll {t.status_code}: {t.text}")
            data = t.json()
            status = data.get("status")
            if status == "SUCCEEDED":
                return VideoResult(task_id=task_id, status=status,
                                   output_urls=data.get("output", []), raw=data)
            if status in ("FAILED", "CANCELLED"):
                raise RunwayError(f"Runway task {task_id} ended: {status} — {data}")
    raise RunwayError(f"Runway task {task_id} timed out after {timeout_s}s")


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=120) as c, c.stream("GET", url) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
    return dest
