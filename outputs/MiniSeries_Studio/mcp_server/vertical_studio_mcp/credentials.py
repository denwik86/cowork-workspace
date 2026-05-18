"""Credential resolution: macOS Keychain first, then .env, then env vars."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

try:
    import keyring  # type: ignore
except Exception:  # pragma: no cover
    keyring = None  # type: ignore

from dotenv import load_dotenv

SERVICE = "vertical-studio-mcp"

# Load .env once if present.
_env_path = Path(__file__).resolve().parents[1] / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


def get_secret(name: str) -> Optional[str]:
    """Resolve a credential by name. Order: Keychain → env."""
    if keyring is not None:
        try:
            v = keyring.get_password(SERVICE, name)
            if v:
                return v
        except Exception:
            # Keychain unavailable in this context (e.g. headless test) — fall through.
            pass
    return os.getenv(name)


def set_secret(name: str, value: str) -> None:
    if keyring is None:
        raise RuntimeError("keyring not installed — cannot store secret")
    keyring.set_password(SERVICE, name, value)


def delete_secret(name: str) -> None:
    if keyring is None:
        return
    try:
        keyring.delete_password(SERVICE, name)
    except Exception:
        pass


def output_root() -> Path:
    """Where the MCP writes finished assets and CapCut manifests."""
    custom = os.getenv("VSTUDIO_OUTPUT_DIR")
    if custom:
        root = Path(custom).expanduser()
    else:
        root = Path.home() / "MiniSeriesStudio" / "output"
    root.mkdir(parents=True, exist_ok=True)
    return root
