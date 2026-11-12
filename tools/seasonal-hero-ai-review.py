#!/usr/bin/env python3
"""Render source-versus-export statue comparisons and objective pixel metrics."""

import importlib.util
import io
import json
from pathlib import Path
from xml.etree import ElementTree as ET

import cv2
import numpy as np
import pymupdf
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("extract",Path(__file__).with_name("seasonal-hero-ai-extract.py"))
EXTRACT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXTRACT)


def image_of(pixmap):
    return Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGBA")


def original_background(page):
    root=ET.fromstring(page.get_svg_image())
    definitions=root.find(f"{{{EXTRACT.NS}}}defs")
    definition_nodes=set(definitions.iter())
    paths=[element for element in root.iter(f"{{{EXTRACT.NS}}}path") if element not in definition_nodes]
    background_paths=set(paths[:16])
    for parent in root.iter():
        if parent in definition_nodes:
            continue
        for child in list(parent):
            kind=child.tag.rsplit("}",1)[-1]
            if (kind=="path" and child not in background_paths) or kind in {"image","use","text"}:
                parent.remove(child)
    return pymupdf.open(stream=ET.tostring(root),filetype="svg")


def main():
    original = pymupdf.open(EXTRACT.SOURCE)
    page = original[1]
    background_page=original_background(page)
    reports = []
    for name,config in EXTRACT.GROUPS.items():
        svg = EXTRACT.ASSETS/f"hero-statue-{name}.svg"
        exported = pymupdf.open(svg)
        render = exported[0].get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=True)
        vector = image_of(render)
        vector.save(EXTRACT.REVIEW/f"{name}-vector-transparent.png")
        reference = image_of(page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(config["crop"]),alpha=False))
        reference.save(EXTRACT.REVIEW/f"{name}-source-crop.png")
        assert vector.size==reference.size,(vector.size,reference.size)
        source_pixels = np.asarray(reference)[:,:,:3].astype(float)
        vector_pixels = np.asarray(vector)[:,:,:3].astype(float)
        alpha = np.asarray(vector)[:,:,3]
        interior = cv2.erode((alpha==255).astype(np.uint8),np.ones((3,3),np.uint8))>0
        if name=="seasonal":
            # Original flag is intentionally removed from the exported statue.
            # Separate metrics identify all pixels and the visible stone alone.
            pole = np.zeros(interior.shape,np.uint8)
            left,top,_,_=config["crop"]
            cv2.line(pole,(round((1439-left)*2),round((50-top)*2)),(round((1196-left)*2),round((337-top)*2)),255,19)
            visible = interior & (pole==0)
        else:
            visible = interior
        errors = np.abs(source_pixels-vector_pixels)
        report = {"name":name,"render_size":vector.size,"interior_pixel_count":int(np.count_nonzero(interior)),"interior_mean_absolute_rgb_error":float(errors[interior].mean()),"visible_stone_mean_absolute_rgb_error":float(errors[visible].mean()),"visible_stone_fraction_rgb_error_under_3":float(np.mean(np.max(errors[visible],axis=1)<=3))}
        background=image_of(background_page[0].get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(config["crop"]),alpha=False))
        background.alpha_composite(vector)
        background.save(EXTRACT.REVIEW/f"{name}-original-background-composite.png")
        full_error=np.abs(source_pixels-np.asarray(background)[:,:,:3].astype(float))
        full_foreground=alpha>0
        visible_foreground=full_foreground if name=="regular" else full_foreground & (pole==0)
        report.update({"full_foreground_pixels_including_edges_and_shadows":int(np.count_nonzero(full_foreground)),"full_foreground_mean_absolute_rgb_error":float(full_error[full_foreground].mean()),"visible_foreground_mean_absolute_rgb_error":float(full_error[visible_foreground].mean()),"visible_foreground_fraction_rgb_error_under_3":float(np.mean(np.max(full_error[visible_foreground],axis=1)<=3))})
        reports.append(report)
        # Same 400px image width for both source and SVG, without cropping.
        target_width=400
        height=round(vector.height*target_width/vector.width)
        sheet = Image.new("RGB",(1240,height+80),"#24282a")
        draw = ImageDraw.Draw(sheet)
        draw.text((14,12),"Original Illustrator crop",fill="white")
        draw.text((428,12),"Original vector export / dark",fill="white")
        draw.text((842,12),"Original vector export / pink",fill="white")
        for i,(content,background) in enumerate([(reference,"black"),(vector,"#080d10"),(vector,"#e83d7e")]):
            tile = Image.new("RGBA",content.size,background)
            tile.alpha_composite(content)
            sheet.paste(tile.resize((400,height),Image.Resampling.LANCZOS).convert("RGB"),(i*414,50))
        sheet.save(EXTRACT.REVIEW/f"{name}-source-vs-vector.png")
    (EXTRACT.REVIEW/"pixel-comparison.json").write_text(json.dumps(reports,indent=2),encoding="utf-8")
    print(json.dumps(reports,indent=2))


if __name__=="__main__":
    main()
