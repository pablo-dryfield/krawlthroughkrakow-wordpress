#!/usr/bin/env python3
"""Trace KTK's existing statue cutout into a limited-palette, path-only SVG."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageFilter, ImageOps
import vtracer


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "Backup/backup_2026-05-15-1131_krawlthroughkrakowcom_39d8d99900a4-uploads3.zip"
ENTRY = "uploads/2023/09/statue_new.png"
SOURCE_SHA256 = "b1a9a15437557c35ca8ba329eb9893d06ce4df6b564139b9fd3234473f0a67d0"
OUTPUT = ROOT / "staging/wp-content/mu-plugins/ktk-homepage-assets/hero-statue.svg"
PALETTE = ("#17191b", "#383d41", "#646d73", "#939da2", "#bec7ca", "#edf0ef")
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)


def source_bytes(source: Path | None) -> bytes:
    if source:
        data = source.read_bytes()
    else:
        with zipfile.ZipFile(ARCHIVE) as archive:
            data = archive.read(ENTRY)
    if hashlib.sha256(data).hexdigest() != SOURCE_SHA256:
        raise ValueError("The statue source does not match the preserved KTK original.")
    return data


def posterize(data: bytes, blur: float) -> Image.Image:
    source = Image.open(io.BytesIO(data)).convert("RGBA")
    alpha = source.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    luminance = ImageOps.grayscale(source)
    luminance = ImageOps.autocontrast(luminance, cutoff=(1, 1), mask=alpha)
    luminance = luminance.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(blur))
    colors = [tuple(bytes.fromhex(color[1:])) for color in PALETTE]
    # No dithering: contiguous tone regions produce readable, compact poster shapes.
    bands = [luminance.point([colors[min(5, value * 6 // 256)][channel] for value in range(256)]) for channel in range(3)]
    return Image.merge("RGBA", (*bands, alpha))


def trace(image: Image.Image, speckle: int) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    svg = vtracer.convert_raw_image_to_svg(
        buffer.getvalue(), img_format="png", colormode="color", hierarchical="stacked",
        mode="spline", filter_speckle=speckle, color_precision=8, layer_difference=16,
        corner_threshold=60, length_threshold=5, max_iterations=10,
        splice_threshold=45, path_precision=1,
    )
    root = ET.fromstring(svg)
    root.attrib.clear()
    root.set("viewBox", f"0 0 {image.width} {image.height}")
    root.set("role", "img")
    root.set("aria-label", "Adam Mickiewicz monument in Krakow")
    title = ET.Element(f"{{{NS}}}title")
    title.text = "Adam Mickiewicz monument in Krakow"
    description = ET.Element(f"{{{NS}}}desc")
    description.text = "A six-tone vector illustration traced from Krawl Through Krakow's existing statue cutout."
    root.insert(0, title)
    root.insert(1, description)
    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag not in {"svg", "title", "desc", "path"}:
            raise ValueError(f"Unexpected SVG element: {tag}")
        if tag == "path":
            fill = element.get("fill", "").lower()
            rgb = bytes.fromhex(fill[1:])
            # VTracer may average tiny adjacent clusters; keep the authored six-tone palette.
            fill = min(PALETTE, key=lambda color: sum((a - b) ** 2 for a, b in zip(rgb, bytes.fromhex(color[1:]))))
            element.set("fill", fill)
    output = ET.tostring(root, encoding="utf-8", short_empty_elements=True)
    if b"data:" in output or b"href=" in output or b"<image" in output:
        raise ValueError("The statue SVG must not embed or reference bitmap assets.")
    return output + b"\n"


def optimize(output: bytes) -> bytes:
    executable = shutil.which("npx.cmd") or shutil.which("npx")
    if not executable:
        raise RuntimeError("Node.js/npx is required for the pinned SVGO optimization step.")
    with tempfile.TemporaryDirectory(prefix="ktk-statue-") as directory:
        source = Path(directory) / "source.svg"
        destination = Path(directory) / "optimized.svg"
        source.write_bytes(output)
        subprocess.run([
            executable, "--yes", "svgo@4.1.0", "--input", str(source),
            "--output", str(destination), "--precision", "1", "--multipass",
        ], check=True, capture_output=True, text=True)
        root = ET.fromstring(destination.read_bytes())
    root.set("role", "img")
    return ET.tostring(root, encoding="utf-8", short_empty_elements=True) + b"\n"


def validate(output: bytes) -> None:
    root = ET.fromstring(output)
    if root.get("viewBox") != "0 0 566 1247":
        raise ValueError("Unexpected statue viewBox.")
    fills = set()
    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag not in {"svg", "title", "desc", "path"}:
            raise ValueError(f"Unexpected optimized SVG element: {tag}")
        if any(name.lower().startswith("on") or name.rsplit("}", 1)[-1] in {"href", "src"} for name in element.attrib):
            raise ValueError("SVG must contain no event handlers or external resources.")
        if tag == "path":
            fills.add(element.get("fill"))
    if not 5 <= len(fills) <= 7 or not fills.issubset(set(PALETTE)):
        raise ValueError("Unexpected optimized SVG palette.")
    if b"data:" in output or len(output) > 100_000:
        raise ValueError("The SVG must be path-only and under 100 KB.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Optional unchanged statue_new.png; otherwise read the preserved media ZIP")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--blur", type=float, default=1.1)
    parser.add_argument("--speckle", type=int, default=18)
    args = parser.parse_args()
    image = posterize(source_bytes(args.source), args.blur)
    output = optimize(trace(image, args.speckle))
    validate(output)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(output)
    print(json.dumps({
        "output": str(args.output), "bytes": len(output),
        "paths": output.count(b"<path"), "palette": PALETTE,
        "viewBox": f"0 0 {image.width} {image.height}",
        "sha256": hashlib.sha256(output).hexdigest(), "bitmapReferences": False,
    }, indent=2))


if __name__ == "__main__":
    main()
