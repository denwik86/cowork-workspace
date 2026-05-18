"""CapCut manifest builder.

CapCut Desktop has NO public API, so this tool produces a self-contained folder
the user can drag into CapCut to populate a timeline:

    <output>/<series>/<episode>/
        plan.json            — machine-readable edit plan
        plan.md              — human-readable plan (open in CapCut for reference)
        captions.srt         — captions, importable as a CapCut subtitle track
        clips/               — numbered video clips in cut order (01_, 02_, ...)
        audio/               — voiceover.mp3, music.mp3
        thumbnails/          — key stills for cover / hook frame
        IMPORT.md            — step-by-step instructions for the operator

CapCut Desktop import flow this is designed for:
    1. File > Import > select the entire folder
    2. CapCut sorts media by name; numbered clips land in cut order
    3. Drag clips onto the timeline as a sequence
    4. Drag voiceover.mp3 onto an audio track, music.mp3 onto another
    5. Right-click captions.srt > Import as subtitles
"""
from __future__ import annotations

import json
import shutil
from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path

from . import credentials as cred


@dataclass
class Clip:
    """One video shot. `source` is a local path or a URL to download."""
    order: int
    label: str
    duration_s: float
    source: str
    description: str = ""


@dataclass
class Caption:
    start_s: float
    end_s: float
    text: str


@dataclass
class EpisodeManifest:
    series: str          # e.g. "S1_LAST_SIGNAL"
    episode: str         # e.g. "E03"
    title: str
    hook_text: str
    clips: list[Clip] = field(default_factory=list)
    captions: list[Caption] = field(default_factory=list)
    voiceover_path: str | None = None
    music_path: str | None = None
    thumbnail_paths: list[str] = field(default_factory=list)
    notes: str = ""


def _td(seconds: float) -> str:
    td = timedelta(seconds=seconds)
    total_ms = int(td.total_seconds() * 1000)
    hh = total_ms // 3_600_000
    mm = (total_ms % 3_600_000) // 60_000
    ss = (total_ms % 60_000) // 1000
    ms = total_ms % 1000
    return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"


def _write_srt(captions: list[Caption], dest: Path) -> None:
    lines = []
    for i, cap in enumerate(captions, start=1):
        lines.append(str(i))
        lines.append(f"{_td(cap.start_s)} --> {_td(cap.end_s)}")
        lines.append(cap.text.strip())
        lines.append("")
    dest.write_text("\n".join(lines), encoding="utf-8")


def _materialize(source: str, dest: Path) -> Path:
    """Copy a local file or skip if source is a URL the operator must download."""
    p = Path(source).expanduser()
    if p.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dest)
        return dest
    # If it's a URL we leave a stub and let the operator know to download.
    dest.parent.mkdir(parents=True, exist_ok=True)
    stub = dest.with_suffix(dest.suffix + ".URL.txt")
    stub.write_text(source)
    return stub


def build_manifest(m: EpisodeManifest) -> Path:
    root = cred.output_root() / m.series / m.episode
    clips_dir = root / "clips"
    audio_dir = root / "audio"
    thumbs_dir = root / "thumbnails"
    for d in (clips_dir, audio_dir, thumbs_dir):
        d.mkdir(parents=True, exist_ok=True)

    # Copy/stub clips with numbered prefix to enforce cut order.
    for clip in sorted(m.clips, key=lambda c: c.order):
        safe = clip.label.replace(" ", "_").replace("/", "_")
        dest = clips_dir / f"{clip.order:02d}_{safe}{Path(clip.source).suffix or '.mp4'}"
        _materialize(clip.source, dest)

    if m.voiceover_path:
        _materialize(m.voiceover_path, audio_dir / "voiceover.mp3")
    if m.music_path:
        _materialize(m.music_path, audio_dir / "music.mp3")
    for i, t in enumerate(m.thumbnail_paths, start=1):
        _materialize(t, thumbs_dir / f"thumb_{i:02d}{Path(t).suffix or '.jpg'}")

    _write_srt(m.captions, root / "captions.srt")

    plan = {
        "series": m.series,
        "episode": m.episode,
        "title": m.title,
        "hook_text": m.hook_text,
        "clips": [c.__dict__ for c in sorted(m.clips, key=lambda c: c.order)],
        "captions": [c.__dict__ for c in m.captions],
        "voiceover": m.voiceover_path,
        "music": m.music_path,
        "thumbnails": m.thumbnail_paths,
        "notes": m.notes,
    }
    (root / "plan.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")

    plan_md = [
        f"# {m.series} {m.episode} — {m.title}",
        "",
        f"**Hook:** {m.hook_text}",
        "",
        "## Cut order",
    ]
    total = 0.0
    for c in sorted(m.clips, key=lambda c: c.order):
        plan_md.append(f"{c.order:02d}. **{c.label}** — {c.duration_s:.1f}s")
        if c.description:
            plan_md.append(f"   > {c.description}")
        total += c.duration_s
    plan_md.append("")
    plan_md.append(f"**Total runtime:** {total:.1f}s")
    if m.notes:
        plan_md.append("")
        plan_md.append("## Notes")
        plan_md.append(m.notes)
    (root / "plan.md").write_text("\n".join(plan_md), encoding="utf-8")

    import_md = f"""# Import into CapCut

1. Open CapCut Desktop → New Project (9:16, 1080×1920).
2. File → Import → select THIS folder (`{root.name}`).
3. CapCut sorts media by name, so clips appear as `01_…`, `02_…` in order.
4. Drag the clips onto the video track in sequence.
5. Drag `audio/voiceover.mp3` onto Track A2, `audio/music.mp3` onto A3.
6. Captions panel → Import subtitles → `captions.srt`. Style as needed.
7. Use `plan.md` as the reference for hook timing and intent.

If you see `.URL.txt` stubs in `clips/`, those are remote assets that still need
to be downloaded into the same folder before opening the project.
"""
    (root / "IMPORT.md").write_text(import_md, encoding="utf-8")
    return root
