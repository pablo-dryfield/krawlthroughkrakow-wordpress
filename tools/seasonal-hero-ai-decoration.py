#!/usr/bin/env python3
"""Extract original radial fan geometry into review data, never app assets."""

import hashlib
import json
import importlib.util
from pathlib import Path

import pymupdf
import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.roundingPen import RoundingPen
from fontTools.svgLib.path import parse_path


ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/homepage-seasonal-hero/source/Full Statue Final.ai"
OUTPUT=ROOT/"docs/homepage-seasonal-hero"


def flag_outline(drawings):
    spec=importlib.util.spec_from_file_location("extract",Path(__file__).with_name("seasonal-hero-ai-extract.py"))
    extraction=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(extraction)
    for precision in (3,2,1):
        paths=[]
        for drawing in drawings[3409:]:
            path=pathops.Path()
            pen=RoundingPen(path.getPen(),roundFunc=lambda value:round(value,precision))
            parse_path(extraction.path_data(drawing,(1094,133)),pen)
            if path.area>0.0001:
                paths.append(path)
        united=pathops.Path()
        try:
            pathops.union(paths,united.getPen())
            break
        except pathops.PathOpsError:
            if precision==1:
                print('No reliable single flag outline: original flag uses fragmented traced shapes.')
                return
    contours=sorted(united.contours,key=lambda contour:contour.area,reverse=True)
    print('Flag contours',[(round(contour.area,3),contour.clockwise,[round(v,3) for v in contour.bounds]) for contour in contours[:12]])
    # Keep the physical gap between cloth and pole; discard only subpixel
    # seams between the original adjacent color fragments.
    outer=pathops.Path()
    for contour in contours:
        if not contour.clockwise or contour.area>1:
            outer.addPath(contour)
    pen=SVGPathPen(None)
    outer.draw(pen)
    report={"source_drawing_indices":[3409,len(drawings)-1],"origin_in_original_page":[1094,133],"bounds":list(outer.bounds),"contours":len(list(outer.contours)),"coordinate_precision_decimals":precision,"physical_holes_preserved_minimum_area":1,"d":pen.getCommands(),"method":"Boolean union of original flag/pole fill geometry. The original 2024 decoration is removed by uniform fill, not by embedding or displaying its lettering. All retained boundary curves come from original artwork; the physical cloth/pole gap is retained and subpixel seams between color fragments are closed. Coordinates are rounded slightly for robust boolean operations. This data is analysis-only and has not changed application assets."}
    (OUTPUT/"ai-flag-outline.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    markup=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="85 -95 430 320"><path fill="#1d1d1f" d="{report["d"]}"/></svg>\n'
    (OUTPUT/"ai-flag-outline.svg.txt").write_text(markup,encoding="utf-8")
    preview=pymupdf.open(stream=markup.encode(),filetype="svg")
    preview[0].get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=True).save(ROOT/"staging/tmp-screenshots/ai-statue-source/flag-outline.png")


def main():
    page=pymupdf.open(SOURCE)[1]
    drawings=page.get_drawings()
    rays=[]
    delta=[]
    for index in range(2,9):
        left=drawings[index]
        right=drawings[index+7]
        points=[left["items"][0][1],left["items"][0][2],left["items"][1][2]]
        right_points=[right["items"][0][1],right["items"][0][2],right["items"][1][2]]
        delta.extend([b.x-a.x for a,b in zip(points,right_points)])
        path="M"+"L".join(f"{p.x:.3f} {p.y:.3f}" for p in points)+"Z"
        rays.append({"original_drawing_index":index,"d":path,"fill":"#eaead0" if index==7 else "#f7f7f0","opacity":0.100006 if index==7 else 0.149994})
    split=drawings[0]["rect"].x0
    translation=sum(delta)/len(delta)
    report={"source":str(SOURCE.relative_to(ROOT)),"source_sha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),"artboard":2,"original_page_viewBox":[0,0,1600,750],"panel_split_x":split,"regular_viewBox":[0,0,split,750],"seasonal_viewBox":[0,0,1600-split,750],"geometry_translation_between_original_groups_x":translation,"maximum_translation_residual":max(abs(d-translation) for d in delta),"seasonal_local_translate_x":translation-split,"rays":rays,"background_included":False,"notes":"Seven original triangles per half. Both groups have the same geometry, translated horizontally; seasonal local offset is 2.2023 units. Transparent SVG backgrounds are supplied by CSS. Per-panel outer clipping may trim subpixel source bleed across the split."}
    (OUTPUT/"ai-radial-fans.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    for name,width,offset in [("regular",split,0),("seasonal",1600-split,translation-split)]:
        lines=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.5f} 750" preserveAspectRatio="none" aria-hidden="true">',f'<g transform="translate({offset:.5f} 0)">']
        lines.extend(f'<path d="{ray["d"]}" fill="{ray["fill"]}" opacity="{ray["opacity"]}"/>' for ray in rays)
        lines.extend(['</g>','</svg>'])
        (OUTPUT/f"ai-rays-{name}.svg.txt").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))
    flag_outline(drawings)


if __name__=="__main__":
    main()
