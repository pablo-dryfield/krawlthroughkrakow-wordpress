"""Offline generated-content contracts for the bounded NYE corrections."""
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content'


class Content(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = []
        self.links = []
        self.text = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])

    def handle_data(self, data):
        self.text.append(data)


class NyeContentTests(unittest.TestCase):
    def test_eight_contents_targets_resolve_once_and_booking_is_portable(self):
        page = Content((ASSETS / 'post-new-years-eve-in-krakow.html').read_text(encoding='utf-8'))
        for identity in ['holiday-getaway', 'christmas-traditions', 'new-years-celebrations',
                         'nye-pub-crawl', 'plan-your-getaway', 'festive-itinerary',
                         'closing-thoughts', 'book-nye']:
            self.assertEqual(page.ids.count(identity), 1)
            self.assertEqual(page.links.count('#' + identity), 1)
        self.assertFalse(any('docs.google.com/document/' in link or 'krawlthoughkrakow' in link
                             for link in page.links))
        self.assertIn('__KTK_HOME_URL__store2/nye-pub-crawl-32/#book', page.links)

    def test_unconfirmed_promises_not_replaced_with_new_operational_guesses(self):
        article = ''.join(Content((ASSETS / 'post-new-years-eve-in-krakow.html').read_text(encoding='utf-8')).text)
        self.assertNotIn('An enormous stage hosts', article)
        self.assertNotIn('including whisky, rum, gin, vodka, beer, and champagne', article)
        self.assertNotIn('usually between 100 and 200zl', article)
        self.assertIn('A city-centre stage, public countdown or fireworks display is not confirmed', article)
        guide = ''.join(Content((ASSETS / 'post-krakow-new-years-eve.html').read_text(encoding='utf-8')).text)
        self.assertNotIn('\u00a315', guide)
        self.assertIn('Check current lift-pass prices', guide)


if __name__ == '__main__':
    unittest.main()
