import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class ArticleTriageTests(unittest.TestCase):
    def test_every_registered_article_has_one_explicit_provisional_decision(self):
        manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text())
        expected = {row['route'] for row in manifest['routes'] if row['kind'] == 'blog post'}
        report = (ROOT / 'docs/seo/article-triage-2026-11-13/README.md').read_text()
        rows = re.findall(r'^\|`(/[^`]+/)`\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|$', report, re.M)
        self.assertEqual(len(expected), 56)
        self.assertEqual(len(rows), 56)
        self.assertEqual({row[0] for row in rows}, expected)
        for route, clicks, impressions, decision, reason in rows:
            with self.subTest(route=route):
                self.assertIn(decision, {'Refresh', 'Compare', 'Historical', 'Safety review'})
                self.assertTrue(reason.strip())
                self.assertRegex(clicks, r'^(?:\d[\d,]*|Not observed)$')
                self.assertRegex(impressions, r'^(?:\d[\d,]*|Not observed)$')

    def test_original_health_hold_and_evidence_limits_remain_explicit(self):
        report = (ROOT / 'docs/seo/article-triage-2026-11-13/README.md').read_text()
        self.assertRegex(report, r'/hostel-hangover-cure/`\|0\|32\|Safety review\|Existing explicit hold')
        self.assertIn('not a completed current-venue, medical, legal or full-copy fact check', report)
        self.assertIn('NOT zero traffic', report)
        self.assertIn('not complete', report)


if __name__ == '__main__':
    unittest.main()
