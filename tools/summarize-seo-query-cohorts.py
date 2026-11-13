"""Summarize retained query rows without inventing complete nonbrand totals."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path


def classify(query):
    normalized = ''.join(c for c in unicodedata.normalize('NFKD', query.casefold())
                         if not unicodedata.combining(c))
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    if re.search(r'\bkrawl through krakow\b|\bkrawlthroughkrakow(?:\.com)?\b', normalized):
        return 'explicit_brand'
    if re.search(r'\bcrawl through krakow\b|\bkrakow krawl\b|\bkrawl krakow\b|\bthe krawl\b', normalized):
        return 'brand_variant_review'
    return 'other_returned_queries'


def summarize(data):
    rows = data.get('rows')
    ended = data.get('end') is True or 'End of returned rows.' in data.get('coverage', '')
    if not isinstance(rows, list) or not rows or not ended:
        raise ValueError('A completed retained query export is required')
    groups = {key: {'rows': 0, 'clicks': 0, 'impressions': 0}
              for key in ['explicit_brand', 'brand_variant_review', 'other_returned_queries']}
    seen = set()
    for row in rows:
        if not isinstance(row, list) or len(row) != 5 or not isinstance(row[0], str) or row[0] in seen:
            raise ValueError('Expected unique five-column query rows')
        seen.add(row[0])
        values = []
        for value in row[1:3]:
            if not isinstance(value, str) or not re.fullmatch(r'\d+|\d{1,3}(?:,\d{3})+', value):
                raise ValueError('Expected exact nonnegative displayed integer count')
            values.append(int(value.replace(',', '')))
        bucket = groups[classify(row[0])]
        bucket['rows'] += 1
        bucket['clicks'] += values[0]
        bucket['impressions'] += values[1]
    return {'range': data.get('range', data.get('dates')), 'returnedRows': len(rows),
            'groups': groups, 'limitations': 'Returned detail only, not all Google queries or whole-property brand/nonbrand totals. Variant bucket requires intent review. CTR/position are displayed rounded values and are not combined.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='+', type=Path)
    args = parser.parse_args()
    result = []
    for file in args.files:
        raw = file.read_bytes()
        result.append({'file': file.name, 'sha256': hashlib.sha256(raw).hexdigest(),
                       **summarize(json.loads(raw.decode('utf-8')))})
    print(json.dumps(result, indent=2))
