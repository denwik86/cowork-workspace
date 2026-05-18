"""Vertical Studio MCP server — exposes Runway, ElevenLabs, and CapCut-manifest tools.

Run locally over stdio:
    uv run vertical-studio-mcp
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

from . import capcut, credentials as cred, elevenlabs as el, runway

mcp = FastMCP("vertical-studio")


# --------------------------------------------------------------------- Runway

class RunwayGenInput(BaseModel):
    prompt_image_url: str = Field(..., description="HTTPS URL or data URI to the reference image.")
    prompt_text: str = Field(..., description="Shot description, camera move, mood.")
    series: str = Field(..., description="Series tag, e.g. 'S1_LAST_SIGNAL'.")
    episode: str = Field(..., description="Episode id, e.g. 'E03'.")
    shot_label: str = Field(..., description="Short label for the shot, e.g. 'hook_signal_loop'.")
    duration: int = Field(5, ge=5, le=10, description="Seconds; Runway supports 5 or 10.")
    model: str = Field("gen4_turbo", description="gen4_turbo | gen3a_turbo | gen4")
    ratio: str = Field("720:1280", description="Aspect ratio. Default 9:16 vertical.")
    seed: Optional[int] = None


@mcp.tool(description="Generate a single vertical video shot via Runway image-to-video. Blocks until the job finishes, then downloads the mp4 into the studio output tree and returns its local path.")
def runway_generate_shot(args: RunwayGenInput) -> dict:
    result = runway.image_to_video(
        prompt_image=args.prompt_image_url,
        prompt_text=args.prompt_text,
        model=args.model,
        duration=args.duration,
        ratio=args.ratio,
        seed=args.seed,
    )
    if not result.output_urls:
        return {"status": "error", "reason": "no output", "raw": result.raw}
    url = result.output_urls[0]
    dest = cred.output_root() / args.series / args.episode / "clips_raw" / f"{args.shot_label}.mp4"
    runway.download(url, dest)
    return {
        "status": "ok",
        "task_id": result.task_id,
        "local_path": str(dest),
        "remote_url": url,
    }


# ----------------------------------------------------------------- ElevenLabs

class TTSInput(BaseModel):
    text: str = Field(..., description="The exact line to render.")
    voice_id: str = Field(..., description="ElevenLabs voice id (use elevenlabs_list_voices to find one).")
    series: str
    episode: str
    line_label: str = Field(..., description="Short label, e.g. 'astro_VO_01'.")
    stability: float = Field(0.45, ge=0.0, le=1.0)
    similarity_boost: float = Field(0.75, ge=0.0, le=1.0)
    style: float = Field(0.30, ge=0.0, le=1.0)
    model_id: str = "eleven_multilingual_v2"


@mcp.tool(description="List the voices available on the ElevenLabs account, with labels.")
def elevenlabs_list_voices() -> list[dict]:
    return [
        {"voice_id": v.voice_id, "name": v.name, "labels": v.labels, "preview_url": v.preview_url}
        for v in el.list_voices()
    ]


@mcp.tool(description="Synthesize one line with ElevenLabs and save it as an mp3 inside the episode folder.")
def elevenlabs_synthesize(args: TTSInput) -> dict:
    dest = cred.output_root() / args.series / args.episode / "audio_raw" / f"{args.line_label}.mp3"
    el.synthesize(
        text=args.text,
        voice_id=args.voice_id,
        dest=dest,
        model_id=args.model_id,
        stability=args.stability,
        similarity_boost=args.similarity_boost,
        style=args.style,
    )
    return {"status": "ok", "local_path": str(dest)}


# ------------------------------------------------------------- CapCut manifest

class ClipIn(BaseModel):
    order: int
    label: str
    duration_s: float
    source: str = Field(..., description="Local path (preferred) or URL to a clip mp4.")
    description: str = ""


class CaptionIn(BaseModel):
    start_s: float
    end_s: float
    text: str


class ManifestInput(BaseModel):
    series: str
    episode: str
    title: str
    hook_text: str
    clips: list[ClipIn]
    captions: list[CaptionIn] = []
    voiceover_path: Optional[str] = None
    music_path: Optional[str] = None
    thumbnail_paths: list[str] = []
    notes: str = ""


@mcp.tool(description="Build a CapCut-ready folder for an episode: ordered clips, captions.srt, voiceover, music, thumbnails, plan.md, IMPORT.md. Returns the folder path; the operator imports it into CapCut.")
def capcut_build_manifest(args: ManifestInput) -> dict:
    manifest = capcut.EpisodeManifest(
        series=args.series,
        episode=args.episode,
        title=args.title,
        hook_text=args.hook_text,
        clips=[capcut.Clip(**c.model_dump()) for c in args.clips],
        captions=[capcut.Caption(**c.model_dump()) for c in args.captions],
        voiceover_path=args.voiceover_path,
        music_path=args.music_path,
        thumbnail_paths=args.thumbnail_paths,
        notes=args.notes,
    )
    root = capcut.build_manifest(manifest)
    return {"status": "ok", "folder": str(root), "open_with": f"open '{root}'"}


# --------------------------------------------------------------------- Health

@mcp.tool(description="Verify which credentials are configured. Use before running other tools.")
def studio_status() -> dict:
    return {
        "runway_key": bool(cred.get_secret("RUNWAY_API_KEY")),
        "elevenlabs_key": bool(cred.get_secret("ELEVENLABS_API_KEY")),
        "output_root": str(cred.output_root()),
    }


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
