#!/usr/bin/env python3
"""Converte o bootstrap comprimido da Mobile V7 em HTML normal antes do deploy."""

from __future__ import annotations

import base64
import gzip
import re
from pathlib import Path


V7_PATH = Path("mobile-v7.html")


def main() -> None:
    source = V7_PATH.read_text(encoding="utf-8")

    # Se o arquivo já estiver em HTML normal, não há nada para fazer.
    if "DecompressionStream" not in source:
        print("Mobile V7 já está descompactada.")
        return

    match = re.search(r'atob\(["\']([A-Za-z0-9+/=]+)["\']\)', source)
    if not match:
        raise RuntimeError("Payload comprimido da Mobile V7 não foi encontrado.")

    compressed = base64.b64decode(match.group(1))
    html = gzip.decompress(compressed).decode("utf-8")

    if not html.lstrip().lower().startswith("<!doctype html"):
        raise RuntimeError("O payload descompactado não é um documento HTML válido.")

    V7_PATH.write_text(html, encoding="utf-8", newline="\n")
    print(f"Mobile V7 descompactada: {len(html):,} caracteres.")


if __name__ == "__main__":
    main()
