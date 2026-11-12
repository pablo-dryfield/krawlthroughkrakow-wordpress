#!/usr/bin/env python3
"""Measure the supplied Illustrator typography without modifying app assets."""

from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path

import numpy as np
import pymupdf
from fontTools.cffLib import CFFFontSet
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/homepage-seasonal-hero/source/Full Statue Final.ai"
OUTPUT = ROOT / "docs/homepage-seasonal-hero/ai-typography-measurements.json"
# Original second-artboard drawing ordinals, inclusive. Font sizes for outlines
# are recovered from the font's 700-unit flat capital height, not ink overshoots.
LINES = [
    ("Spanning headline",39,70,39),
    ("The original & best",39,54,39),
    ("Pubcrawl in Krakow",55,70,55),
    ("Regular brand",137,154,137),
    ("Regular PUB",134,136,134),
    ("Regular KRAWL",129,133,129),
    ("Regular EVERY",29,33,29),
    ("Regular NIGHT",34,38,34),
    ("Regular 9 PM",26,28,27),
    ("Regular ADAM",16,19,16),
    ("Regular STATUE",20,25,21),
    ("Seasonal NYE",155,157,155),
    ("Seasonal brand",166,183,166),
    ("Seasonal PUB",163,165,163),
    ("Seasonal KRAWL",158,162,158),
    ("Seasonal INCLUDES",71,78,71),
    ("Seasonal BUFFET",79,84,79),
    ("Seasonal PLUS",85,85,None),
    ("Seasonal 2 HOUR OF FREE",86,96,87),
    ("Seasonal ALCOHOL",97,103,97),
    ("Seasonal AND",104,106,104),
    ("Seasonal FREE ENTRY TO",107,117,107),
    ("Seasonal 3 BARS / CLUBS",118,128,119),
]


def hexcolor(values):
    return "#"+"".join(f"{round(value*255):02x}" for value in values)


def glyph_check(drawings,cff,glyph,index):
    bounds_pen=BoundsPen(None)
    recording=RecordingPen()
    cff.CharStrings[glyph].draw(bounds_pen)
    cff.CharStrings[glyph].draw(recording)
    glyph_points=np.array([point for command,points in recording.value for point in points])
    drawing=drawings[index]
    rectangle=drawing["rect"]
    x0,y0,x1,y1=bounds_pen.bounds
    scale=rectangle.height/(y1-y0)
    mapped=glyph_points.copy().astype(float)
    mapped[:,0]=(mapped[:,0]-x0)*scale+rectangle.x0
    mapped[:,1]=rectangle.y1-(mapped[:,1]-y0)*scale
    original=np.array([(point.x,point.y) for item in drawing["items"] for point in item[1:] if hasattr(point,"x")])
    distance=np.sqrt(((original[:,None,:]-mapped[None,:,:])**2).sum(axis=2))
    return {"glyph":glyph,"drawing_index":index,"normalized_font_size":scale*1000,"maximum_bidirectional_control_point_distance_source_units":float(max(distance.min(axis=0).max(),distance.min(axis=1).max()))}


def main():
    doc=pymupdf.open(SOURCE)
    page=doc[1]
    drawings=page.get_drawings()
    reader=PdfReader(SOURCE)
    descriptor=reader.pages[1]["/Resources"]["/Font"]["/T1_0"]["/FontDescriptor"]
    cff=CFFFontSet()
    cff.decompile(io.BytesIO(descriptor["/FontFile3"].get_data()),None)
    lines=[]
    for label,start,stop,capital in LINES:
        selected=drawings[start:stop+1]
        bounds=pymupdf.Rect(selected[0]["rect"])
        for drawing in selected[1:]:
            bounds |= drawing["rect"]
        lines.append({"label":label,"drawing_indices":[start,stop],"ink_bounds":[round(value,4) for value in bounds],"ink_width":round(bounds.width,4),"ink_height":round(bounds.height,4),"center":[round((bounds.x0+bounds.x1)/2,4),round((bounds.y0+bounds.y1)/2,4)],"font_size_from_flat_cap_height":round(drawings[capital]["rect"].height/.7,4) if capital is not None else None,"colors":sorted({hexcolor(drawing["fill"]) for drawing in selected})})
    live=[]
    for block in page.get_text("dict",flags=0)["blocks"]:
        for line in block.get("lines",[]):
            for span in line["spans"]:
                live.append({key:span[key] for key in ("text","size","origin","bbox","font","color")})
    local={}
    for path in (ROOT/"staging/wp-content/mu-plugins/ktk-homepage-assets").rglob("*.woff*"):
        try:
            font=TTFont(path)
            name=font["name"].getDebugName(1)
            local[name]=local.get(name,0)+1
        except Exception:
            pass
    report={
        "source":str(SOURCE.relative_to(ROOT)),"source_sha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "artboard":2,"size":[1600,750],"panel_boundary_x":drawings[0]["rect"].x0,
        "font":{"postscript_name":str(descriptor["/FontName"]),"family":str(descriptor["/FontFamily"]),"weight":descriptor["/FontWeight"],"cap_height":descriptor["/CapHeight"],"x_height":descriptor["/XHeight"],"italic_angle":descriptor["/ItalicAngle"],"embedded_charset":cff[0].charset},
        "outline_shape_checks":[glyph_check(drawings,cff[0],glyph,index) for glyph,index in [("P",134),("P",163),("A",16),("R",130),("T",39)]],
        "outline_lines":lines,"live_text":live,"local_homepage_font_families":local,
        "palette":{"regular_background":"#000000","pink_background_and_regular_PUB":"#d93574","body_and_caption_white":"#f9f9f9","KRAWL_white":"#ffffff","main_ray":{"fill":"#f7f7f0","opacity":0.149994},"alternate_ray":{"fill":"#eaead0","opacity":0.100006}},
    }
    OUTPUT.write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({"output":str(OUTPUT.relative_to(ROOT)),"font":report["font"],"outline_shape_checks":report["outline_shape_checks"],"outline_lines":lines},indent=2))


if __name__=="__main__":
    main()
