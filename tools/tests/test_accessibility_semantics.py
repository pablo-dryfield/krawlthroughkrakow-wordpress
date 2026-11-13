"""Offline generated-markup contracts; browser behavior is tested separately."""
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets'


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class AccessibilitySemanticsTests(unittest.TestCase):
    def test_every_reviewed_main_is_a_landmark_without_retagging(self):
        pages = list((ASSETS / 'content').glob('*.html'))
        self.assertEqual(len(pages), 116)
        for path in pages:
            with self.subTest(page=path.name):
                main = [(tag, attrs) for tag, attrs in Tags(path.read_text(encoding='utf-8')).tags
                        if attrs.get('id') == 'main-content']
                self.assertEqual(len(main), 1)
                self.assertEqual(main[0][0], 'div')
                if path.stem != 'post-hostel-hangover-cure':
                    self.assertEqual(main[0][1].get('role'), 'main')

    def test_archive_headings_are_not_additional_page_banners(self):
        pages = list((ASSETS / 'content').glob('archive-*.html'))
        self.assertEqual(len(pages), 39)
        for path in pages:
            headers = [attrs for tag, attrs in Tags(path.read_text(encoding='utf-8')).tags
                       if tag == 'header' and attrs.get('class') == 'ktk-archive-heading']
            self.assertEqual(len(headers), 1)
            self.assertEqual(headers[0].get('role'), 'presentation')

    def test_captcha_uses_the_existing_updatable_question(self):
        tags = Tags((ASSETS / 'content/contact.html').read_text(encoding='utf-8')).tags
        labels = {attrs.get('id') for _, attrs in tags
                  if 'et_pb_contact_captcha_question' in attrs.get('class', '').split()}
        fields = [attrs for tag, attrs in tags if tag == 'input'
                  and 'et_pb_contact_captcha' in attrs.get('class', '').split()]
        self.assertTrue(fields)
        for field in fields:
            self.assertIn(field['aria-labelledby'], labels)
            self.assertEqual(field['name'], 'captcha')


if __name__ == '__main__':
    unittest.main()
