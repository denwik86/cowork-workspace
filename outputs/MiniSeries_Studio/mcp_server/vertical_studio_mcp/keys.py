"""CLI to seed Keychain with API credentials.

Usage:
    vertical-studio-keys set         # interactively prompt for all keys
    vertical-studio-keys set RUNWAY_API_KEY
    vertical-studio-keys show
    vertical-studio-keys delete RUNWAY_API_KEY
"""
from __future__ import annotations

import argparse
import getpass
import sys

from . import credentials as cred

KNOWN = ["RUNWAY_API_KEY", "ELEVENLABS_API_KEY"]


def _set(name: str | None) -> None:
    names = [name] if name else KNOWN
    for n in names:
        existing = cred.get_secret(n)
        prompt = f"{n}" + (" (leave blank to keep current)" if existing else "") + ": "
        v = getpass.getpass(prompt)
        if not v and existing:
            print(f"  {n} unchanged")
            continue
        if not v:
            print(f"  {n} skipped (empty)")
            continue
        cred.set_secret(n, v)
        print(f"  {n} saved to Keychain")


def _show() -> None:
    for n in KNOWN:
        v = cred.get_secret(n)
        print(f"{n}: {'set' if v else '(missing)'}")


def _delete(name: str) -> None:
    cred.delete_secret(name)
    print(f"{name} removed")


def main() -> int:
    p = argparse.ArgumentParser(prog="vertical-studio-keys")
    sub = p.add_subparsers(dest="cmd")
    p_set = sub.add_parser("set")
    p_set.add_argument("name", nargs="?", choices=KNOWN)
    sub.add_parser("show")
    p_del = sub.add_parser("delete")
    p_del.add_argument("name", choices=KNOWN)
    args = p.parse_args()

    if args.cmd == "set":
        _set(args.name)
    elif args.cmd == "show":
        _show()
    elif args.cmd == "delete":
        _delete(args.name)
    else:
        p.print_help()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
