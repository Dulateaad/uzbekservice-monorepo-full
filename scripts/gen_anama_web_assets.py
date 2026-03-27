#!/usr/bin/env python3
"""Solid-color PNGs for Anama web (favicon + PWA icons). No extra deps."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

# Brand teal from web_anama/index.html gradient
R, G, B = 0x2E, 0x7D, 0x6B


def _chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def write_solid_png(path: Path, width: int, height: int) -> None:
    raw_rows = []
    for _ in range(height):
        raw_rows.append(b"\x00" + bytes([R, G, B]) * width)
    raw = b"".join(raw_rows)
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", compressed)
        + _chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "web_anama"
    write_solid_png(root / "favicon.png", 48, 48)
    icons = root / "icons"
    for name, size in (
        ("Icon-192.png", 192),
        ("Icon-512.png", 512),
        ("Icon-maskable-192.png", 192),
        ("Icon-maskable-512.png", 512),
    ):
        write_solid_png(icons / name, size, size)
    print("OK:", root)


if __name__ == "__main__":
    main()
