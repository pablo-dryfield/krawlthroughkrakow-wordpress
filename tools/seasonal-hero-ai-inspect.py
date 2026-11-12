#!/usr/bin/env python3
"""Read-only census and render of the supplied original Illustrator artwork."""

import hashlib
import json
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/homepage-seasonal-hero/source/Full Statue Final.ai"
REVIEW = ROOT / "staging/tmp-screenshots/ai-statue-source"


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(SOURCE)
    report = {"sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "pages": []}
    for index, page in enumerate(doc):
        page.get_pixmap(matrix=pymupdf.Matrix(1.25, 1.25), alpha=False).save(REVIEW / f"artboard-{index+1}.png")
        drawings = page.get_drawings()
        images = page.get_image_info(hashes=True)
        report["pages"].append({
            "page": index + 1,
            "bounds": list(page.rect),
            "drawings": len(drawings),
            "paths": sum(len(d["items"]) for d in drawings),
            "images": [{k:(list(v) if isinstance(v,bytes) else v) for k,v in im.items()} for im in images],
        })
        (REVIEW / f"drawings-{index+1}.json").write_text(json.dumps(drawings,default=lambda value:list(value),indent=2),encoding="utf-8")
    (REVIEW / "census.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
