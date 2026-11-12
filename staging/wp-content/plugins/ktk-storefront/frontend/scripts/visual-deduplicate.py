import json
import os
import sys

from PIL import Image


archive_root = os.path.abspath(sys.argv[1])
manifest_path = os.path.join(archive_root, "manifest.json")

with open(manifest_path, encoding="utf-8") as manifest_file:
    manifest = json.load(manifest_file)


def difference_hash(path):
    with Image.open(path) as image:
        width, height = image.size
        grayscale = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
        pixels = list(grayscale.getdata())
        value = 0
        for row in range(8):
            for column in range(8):
                left = pixels[(row * 9) + column]
                right = pixels[(row * 9) + column + 1]
                if left > right:
                    value |= 1 << ((row * 8) + column)
        return value, width, height


def hash_distance(left, right):
    return (left ^ right).bit_count()


selected = {}
for slug in dict.fromkeys(image["productSlug"] for image in manifest):
    groups = []
    records = [image for image in manifest if image["productSlug"] == slug]

    for record in records:
        relative_path = record.get("duplicateOf") or record["localFile"]
        image_path = os.path.join(archive_root, *relative_path.split("/"))

        try:
            image_hash, width, height = difference_hash(image_path)
        except (OSError, ValueError):
            groups.append([{
                "record": record,
                "hash": None,
                "width": 0,
                "height": 0,
            }])
            continue

        candidate = {
            "record": record,
            "hash": image_hash,
            "width": width,
            "height": height,
        }
        matched_group = None

        for group in groups:
            reference = group[0]
            if reference["hash"] is None:
                continue
            reference_ratio = reference["width"] / reference["height"]
            candidate_ratio = width / height
            if (
                abs(reference_ratio - candidate_ratio) < 0.03
                and hash_distance(image_hash, reference["hash"]) <= 8
            ):
                matched_group = group
                break

        if matched_group is None:
            groups.append([candidate])
        else:
            matched_group.append(candidate)

    selected[slug] = [
        max(group, key=lambda item: item["width"] * item["height"])["record"]["localFile"]
        for group in groups
    ]

print(json.dumps(selected))
