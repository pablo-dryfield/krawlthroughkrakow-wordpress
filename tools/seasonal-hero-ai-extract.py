#!/usr/bin/env python3
"""Export original Illustrator statue paths without tracing the stone artwork.

The Illustrator file's PDF-compatible second artboard contains separate vector
statue and flag groups. Only its embedded aviator glasses need raster tracing.
The supplied original is read-only and is pinned by SHA-256.
"""

from __future__ import annotations

import copy
import hashlib
import io
import json
import shutil
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET

import pymupdf
from PIL import Image
import vtracer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/homepage-seasonal-hero/source/Full Statue Final.ai"
SOURCE_SHA256 = "cccfe297b02511e2493748d3f5a792ca410b5eb709c6cc5cbf398c0920721e99"
REVIEW = ROOT / "staging/tmp-screenshots/ai-statue-source"
ASSETS = ROOT / "staging/wp-content/mu-plugins/ktk-homepage-assets"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
GROUPS = {
    "regular": {"start":186,"stop":2564,"crop":(301,137,791,750)},
    "seasonal": {"start":2564,"stop":3409,"crop":(1094,133,1390,750)},
}


def number(value):
    return f"{value:.5f}".rstrip("0").rstrip(".") or "0"


def point(value, origin):
    return f"{number(value.x-origin[0])} {number(value.y-origin[1])}"


def path_data(drawing, origin):
    commands = []
    current = None
    for item in drawing["items"]:
        kind = item[0]
        if kind == "re":
            rectangle = item[1]
            points = (rectangle.tl,rectangle.tr,rectangle.br,rectangle.bl)
            if item[2] == -1:
                points = tuple(reversed(points))
            commands.append("M"+"L".join(point(p,origin) for p in points)+"Z")
            current = None
            continue
        assert kind in {"l","c"}, kind
        start = item[1]
        if current is None or abs(current.x-start.x)>0.00001 or abs(current.y-start.y)>0.00001:
            if current is not None:
                commands.append("Z")
            commands.append("M"+point(start,origin))
        if kind == "l":
            commands.append("L"+point(item[2],origin))
            current = item[2]
        else:
            commands.append("C"+" ".join(point(p,origin) for p in item[2:]))
            current = item[4]
    if current is not None:
        commands.append("Z")
    return "".join(commands)


def drawing_element(drawing, origin):
    assert drawing["type"] == "f" and drawing["fill_opacity"] == 1.0
    color = "#"+"".join(f"{round(channel*255):02x}" for channel in drawing["fill"])
    attributes = {"d":path_data(drawing,origin),"fill":color}
    if drawing.get("even_odd"):
        attributes["fill-rule"] = "evenodd"
    return ET.Element(f"{{{NS}}}path",attributes)


def glasses(doc):
    pixmap = pymupdf.Pixmap(doc,103)
    alpha = pymupdf.Pixmap(doc,120)
    encoded = pymupdf.Pixmap(pixmap,alpha).tobytes("png")
    image = Image.open(io.BytesIO(encoded)).convert("RGBA")
    image.save(REVIEW/"original-glasses.png")
    # Preserve both aviator lenses, bridge, and arms with source-derived colors.
    # The original glasses are not vectors; this small component is identified
    # separately in provenance rather than claiming it is an original path.
    quantized = image.convert("RGB").quantize(colors=32,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert("RGBA")
    quantized.putalpha(image.getchannel("A").point(lambda value:255 if value>=80 else 0))
    data = io.BytesIO()
    quantized.save(data,format="PNG")
    traced = vtracer.convert_raw_image_to_svg(data.getvalue(),img_format="png",colormode="color",hierarchical="stacked",mode="spline",filter_speckle=3,color_precision=8,layer_difference=8,corner_threshold=60,length_threshold=3.5,max_iterations=10,splice_threshold=45,path_precision=2)
    trace = ET.fromstring(traced)
    (REVIEW/"glasses-traced.svg").write_text(traced,encoding="utf-8")
    return list(trace),image.size


def validate(destination):
    document = ET.parse(destination)
    allowed = {"svg","g","path","desc","defs","clipPath"}
    for element in document.getroot().iter():
        assert element.tag.rsplit("}",1)[-1] in allowed,element.tag
        assert not any(key.endswith("href") or key.startswith("on") for key in element.attrib)
    payload = destination.read_bytes()
    assert b"data:image" not in payload and b"<image" not in payload
    return {"bytes":len(payload),"paths":len(document.findall(f".//{{{NS}}}path")),"sha256":hashlib.sha256(payload).hexdigest()}


def main():
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_SHA256
    REVIEW.mkdir(parents=True,exist_ok=True)
    doc = pymupdf.open(SOURCE)
    page = doc[1]
    drawings = page.get_drawings()
    assert len(drawings)==3671
    native = ET.fromstring(page.get_svg_image())
    parents = {child:parent for parent in native.iter() for child in parent}
    native_defs = native.find(f"{{{NS}}}defs")
    definition_nodes = set(native_defs.iter())
    native_paths = [element for element in native.iter(f"{{{NS}}}path") if element not in definition_nodes]
    assert len(native_paths)==len(drawings)
    lens_paths,lens_size = glasses(doc)
    reports = []
    for name,config in GROUPS.items():
        left,top,right,bottom = config["crop"]
        root = ET.Element(f"{{{NS}}}svg",{"viewBox":f"0 0 {right-left} {bottom-top}","role":"img","aria-label":"Adam Mickiewicz monument" if name=="regular" else "Adam Mickiewicz statue wearing red aviator glasses"})
        description = ET.SubElement(root,f"{{{NS}}}desc")
        description.text = "Original vector statue artwork exported from the supplied Krawl Through Krakow Illustrator file, artboard 2."
        if name=="seasonal":
            description.text += " The original flag is omitted, revealing the intact original torso. The small embedded glasses were converted to vector paths."
        else:
            description.text += " Both original offset silhouettes retain their original clipping and 60 percent opacity."
            definitions = ET.SubElement(root,f"{{{NS}}}defs")
            shadow_layer = ET.SubElement(root,f"{{{NS}}}g",{"transform":f"translate({-left} {-top})"})
            for index in (184,185):
                clipped = parents[native_paths[index]]
                original_group = parents[clipped]
                assert original_group.get("opacity")==".600006"
                clip_id = clipped.get("clip-path")[5:-1]
                definitions.append(copy.deepcopy(next(element for element in native_defs if element.get("id")==clip_id)))
                shadow_layer.append(copy.deepcopy(original_group))
        for drawing in drawings[config["start"]:config["stop"]]:
            root.append(drawing_element(drawing,(left,top)))
        if name=="seasonal":
            bbox = (1244.0069580078125,147.29275512695312,1278.7198486328125,167.6702880859375)
            group = ET.SubElement(root,f"{{{NS}}}g",{"transform":f"translate({number(bbox[0]-left)} {number(bbox[1]-top)}) scale({number((bbox[2]-bbox[0])/lens_size[0])} {number((bbox[3]-bbox[1])/lens_size[1])})"})
            group.extend(copy.deepcopy(lens_paths))
        raw = REVIEW/f"hero-statue-{name}-original-paths.svg"
        ET.ElementTree(root).write(raw,encoding="unicode",xml_declaration=False)
        destination = ASSETS/f"hero-statue-{name}.svg"
        npx = shutil.which("npx.cmd") or shutil.which("npx")
        subprocess.run([npx,"--yes","svgo@4.1.0","--input",str(raw),"--output",str(destination),"--precision","3","--multipass"],check=True)
        report = {"name":name,"file":str(destination.relative_to(ROOT)),"viewBox":root.get("viewBox"),"source_page":2,"source_drawing_indices":[184 if name=="regular" else config["start"],config["stop"]-1],"original_vector_objects":config["stop"]-config["start"]+(2 if name=="regular" else 0),"source_crop":config["crop"],"glasses_traced":name=="seasonal",**validate(destination)}
        reports.append(report)
    output = {"source":str(SOURCE),"source_sha256":SOURCE_SHA256,"assets":reports}
    (REVIEW/"extraction-manifest.json").write_text(json.dumps(output,indent=2),encoding="utf-8")
    print(json.dumps(output,indent=2))


if __name__ == "__main__":
    main()
