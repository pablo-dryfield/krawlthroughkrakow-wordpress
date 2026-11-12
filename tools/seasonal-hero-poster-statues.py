#!/usr/bin/env python3
"""Recreate the two actual poster statues as standalone vector paths."""

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

import cv2
import numpy as np
from PIL import Image, ImageDraw
import vtracer


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "Backup/backup_2026-05-15-1131_krawlthroughkrakowcom_39d8d99900a4-uploads.zip"
REVIEW = ROOT / "staging/tmp-screenshots/poster-statue-traces"
ASSETS = ROOT / "staging/wp-content/mu-plugins/ktk-homepage-assets"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
SOURCES = {
    "regular": {"entry": "uploads/2024/12/NYE-final-1_.png", "crop": (224, 102, 578, 563)},
    "seasonal": {"entry": "uploads/2024/12/NYE-final-1_.png", "crop": (818, 98, 1044, 563)},
}

# Coordinates refer to the unscaled original poster. These loose bounds exclude
# nearby typography and the flag; the color-derived contour supplies the edge.
BOUNDS = {
    "regular": [(398,101),(433,102),(453,129),(465,233),(505,270),(506,345),
                (522,353),(549,382),(578,458),(578,563),(224,563),(224,522),
                (253,519),(254,482),(281,478),(257,475),(254,455),(306,450),
                (307,429),(328,426),(328,407),(342,405),(347,367),(359,350),
                (356,312),(348,284),(345,240),(368,229),(378,214),(380,175),
                (377,155),(387,132),(398,122)],
    "seasonal": [(902,126),(906,110),(920,100),(939,99),(953,108),(959,130),
                 (968,147),(982,148),(992,174),(999,213),(995,286),(998,331),
                 (996,344),(983,346),(973,369),(993,374),(1001,391),(1014,393),
                 (1014,405),(1044,410),(1043,429),(1020,445),(1021,467),
                 (1023,474),(1019,490),(1021,563),(844,563),(842,493),
                 (841,485),(849,474),(848,460),(826,458),(823,451),(818,444),
                 (846,414),(855,404),(878,376),(882,356),(881,336),(882,310),
                 (887,288),(886,270),(879,255),(874,245),(866,225),(866,208),
                 (873,178),(880,157),(893,148),(904,140)],
}


def extraction(name: str) -> tuple[Image.Image, np.ndarray, np.ndarray]:
    original, _ = source(name)
    crop_box = SOURCES[name]["crop"]
    crop = original.crop(crop_box)
    rgb = np.asarray(crop).copy()
    polygon = Image.new("L", crop.size)
    ImageDraw.Draw(polygon).polygon([(x-crop_box[0], y-crop_box[1]) for x, y in BOUNDS[name]], fill=255)
    values = rgb.astype(np.int16)
    neutral = (values[:,:,0] - values[:,:,1] < 16)
    if name == "regular":
        neutral &= (values.max(axis=2) > 33)
    # Red spectacle lenses belong to the art, unlike the pink poster behind it.
    if name == "seasonal":
        glasses = Image.new("L", crop.size)
        draw = ImageDraw.Draw(glasses)
        draw.ellipse((116,13,131,28), fill=255)
        draw.ellipse((133,13,145,28), fill=255)
        neutral |= np.asarray(glasses) > 0
    mask = ((np.asarray(polygon)>0) & neutral).astype(np.uint8)*255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((2,2),np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    largest = max(contours, key=cv2.contourArea)
    mask[:] = 0
    cv2.drawContours(mask, [largest], -1, 255, thickness=cv2.FILLED)
    # Remove the pole only where it overlaps the actual statue. Hidden stone
    # pixels do not exist in the flattened source and are explicitly repaired.
    repair = np.zeros(mask.shape, np.uint8)
    if name == "seasonal":
        cv2.line(repair, (1078-crop_box[0],37-crop_box[1]), (895-crop_box[0],253-crop_box[1]), 255, 7)
        repair = cv2.bitwise_and(repair, mask)
        rgb = cv2.inpaint(rgb, repair, 3, cv2.INPAINT_TELEA)
    rgba = np.dstack((rgb,mask))
    result = Image.fromarray(rgba)
    result.save(REVIEW/f"{name}-extracted.png")
    Image.fromarray(mask).save(REVIEW/f"{name}-mask.png")
    Image.fromarray(repair).save(REVIEW/f"{name}-repair-mask.png")
    background = Image.new("RGBA", result.size, "#e83d7e" if name=="regular" else "#151b1d")
    background.alpha_composite(result)
    background.resize((result.width*2,result.height*2)).convert("RGB").save(REVIEW/f"{name}-extracted-review.png")
    return result, mask, repair


def vectorize(name: str, extracted: Image.Image) -> dict:
    # A source-derived palette keeps the poster's green-gray stone and the red
    # glasses. No contrast stretch, forced grayscale, or substitute angle.
    rgb = extracted.convert("RGB")
    indexed = rgb.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    quantized = indexed.convert("RGBA")
    quantized.putalpha(extracted.getchannel("A"))
    quantized.save(REVIEW/f"{name}-quantized.png")
    encoded = io.BytesIO()
    quantized.save(encoded,format="PNG")
    svg = vtracer.convert_raw_image_to_svg(
        encoded.getvalue(), img_format="png", colormode="color", hierarchical="stacked",
        mode="spline", filter_speckle=2, color_precision=8, layer_difference=4,
        corner_threshold=60, length_threshold=3.5, max_iterations=10,
        splice_threshold=45, path_precision=2,
    )
    raw = REVIEW/f"{name}-raw.svg"
    raw.write_text(svg,encoding="utf-8")
    destination = ASSETS/f"hero-statue-{name}.svg"
    npx = shutil.which("npx.cmd") or shutil.which("npx")
    subprocess.run([npx,"--yes","svgo@4.1.0","--input",str(raw),"--output",str(destination),"--precision","2","--multipass"], check=True)
    document = ET.parse(destination)
    root = document.getroot()
    root.set("viewBox",f"0 0 {extracted.width} {extracted.height}")
    root.set("role","img")
    root.set("aria-label","Adam Mickiewicz monument from the Krawl Through Krakow poster" if name=="regular" else "Adam Mickiewicz statue wearing red glasses from the Krawl Through Krakow New Year poster")
    for attribute in ("width","height"):
        root.attrib.pop(attribute,None)
    description = ET.Element(f"{{{NS}}}desc")
    description.text = "Genuine vector paths traced from the original 2024 KTK poster artwork." + (" The flag and pole are separated; the narrow occluded stone strip is reconstructed." if name=="seasonal" else " The colored offset shadow is separate from this artwork.")
    root.insert(0,description)
    document.write(destination,encoding="unicode",xml_declaration=False)
    paths = root.findall(f".//{{{NS}}}path")
    forbidden = [element.tag for element in root.iter() if element.tag.rsplit("}",1)[-1] not in {"svg","path","desc"}]
    assert not forbidden, forbidden
    assert all(not any(key.endswith("href") or key.startswith("on") for key in element.attrib) for element in root.iter())
    payload = destination.read_bytes()
    assert b"data:image" not in payload and b"<image" not in payload
    return {"file":str(destination.relative_to(ROOT)),"viewBox":root.get("viewBox"),"bytes":len(payload),"paths":len(paths),"colors":len({p.get("fill") for p in paths}),"sha256":hashlib.sha256(payload).hexdigest()}


def source(name: str) -> tuple[Image.Image, bytes]:
    with zipfile.ZipFile(ARCHIVE) as archive:
        data = archive.read(SOURCES[name]["entry"])
    return Image.open(io.BytesIO(data)).convert("RGB"), data


def inspect_sources() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    for name, config in SOURCES.items():
        original, data = source(name)
        original.crop(config["crop"]).save(REVIEW / f"{name}-source.png")
        crop = original.crop(config["crop"]).resize(((config["crop"][2] - config["crop"][0]) * 2, (config["crop"][3] - config["crop"][1]) * 2))
        draw = ImageDraw.Draw(crop)
        scale = 2
        step = 20
        for x in range(config["crop"][0], config["crop"][2], step):
            local = (x - config["crop"][0]) * scale
            draw.line((local, 0, local, crop.height), fill=(0, 180, 220), width=1)
            draw.text((local + 2, 2), str(x), fill="white", stroke_width=1, stroke_fill="black")
        for y in range(config["crop"][1], config["crop"][3], step):
            local = (y - config["crop"][1]) * scale
            draw.line((0, local, crop.width, local), fill=(0, 180, 220), width=1)
            draw.text((2, local + 2), str(y), fill="white", stroke_width=1, stroke_fill="black")
        crop.save(REVIEW / f"{name}-grid.png")
        print(json.dumps({"source": name, "size": original.size, "crop": config["crop"], "sha256": hashlib.sha256(data).hexdigest()}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--extract-only", action="store_true")
    args = parser.parse_args()
    inspect_sources()
    if args.inspect:
        return
    results = []
    for name in SOURCES:
        extracted, mask, repair = extraction(name)
        if not args.extract_only:
            result = vectorize(name,extracted)
            result["foreground_pixels"] = int(np.count_nonzero(mask))
            result["reconstructed_pixels"] = int(np.count_nonzero(repair))
            results.append(result)
    if results:
        (REVIEW/"manifest.json").write_text(json.dumps(results,indent=2),encoding="utf-8")
        print(json.dumps(results,indent=2))


if __name__ == "__main__":
    main()
