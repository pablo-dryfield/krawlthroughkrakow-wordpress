"""Offline shared-style generation, color and preserved-source contracts."""
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def luminance(color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(v * weight for v, weight in zip(linear, (.2126, .7152, .0722)))


class ContentAccessibilityTests(unittest.TestCase):
    def test_shared_style_blocks_are_exact_and_unique(self):
        source = (ROOT / 'tools/content-accessibility.css').read_text().strip()
        guide = (ROOT / 'tools/halloween-neutral-guide.css').read_text().strip()
        following = subprocess.check_output(
            ['node', '--input-type=module', '-e',
             "import {h01CompetitionFormStyles} from './tools/h01-business-legal-editorial.mjs'; process.stdout.write(h01CompetitionFormStyles);"],
            cwd=ROOT,
        ).decode('utf-8')
        expected_styles = {
            'ktk-homepage-assets/parity-runtime.css': source,
            'ktk-code-pages-assets/runtime.css': source + '\n' + guide,
        }
        for name, expected in expected_styles.items():
            css = (ROOT / 'staging/wp-content/mu-plugins' / name).read_text()
            self.assertEqual(css.count('/* BEGIN shared content accessibility */'), 1)
            block = css.split('/* BEGIN shared content accessibility */')[1]
            self.assertEqual(block.split('/* END shared content accessibility */')[0].strip(), expected, name)
            tail = block.split('/* END shared content accessibility */')[1]
            expected_tail = '\n' + following if name == 'ktk-code-pages-assets/runtime.css' else '\n'
            self.assertEqual(tail, expected_tail, name)
            if name == 'ktk-code-pages-assets/runtime.css':
                # Only the reviewed competition postlude is allowed. Broader,
                # duplicated, changed or additional trailing rules still fail.
                for changed in (
                        tail + '\na {color:red}', tail + following,
                        tail.replace('width: 100%', 'width: 120%'),
                        tail.replace('[data-ktk-page="post-welcome-to-alcohol"]', ''),
                        tail.replace('/* END H01 competition field fit */', 'missing')):
                    with self.subTest(tail=changed[-90:]):
                        with self.assertRaises(AssertionError):
                            self.assertEqual(changed, expected_tail)

    def test_reviewed_small_text_colors_exceed_required_contrast(self):
        for foreground, background in (('#c8006c', '#ffffff'), ('#ffffff', '#c8306b'),
                                       ('#000000', '#d93574'), ('#aaaaaa', '#000000')):
            values = sorted((luminance(foreground), luminance(background)))
            self.assertGreaterEqual((values[1] + .05) / (values[0] + .05), 4.5)

    def test_no_artwork_or_consent_rewrites_in_shared_styles(self):
        css = (ROOT / 'tools/content-accessibility.css').read_text()
        # The verified short-screen duplicate strip is the only hidden element.
        reviewed_strip = '''@media (max-height: 450px) {
  body.ktk-homepage-standalone #main-content .et_pb_text_1.et_pb_sticky_module {
    display: none;
  }
}'''

        def assert_preserved(styles):
            self.assertEqual(styles.count(reviewed_strip), 1)
            self.assertNotRegex(styles.replace(reviewed_strip, '', 1),
                                r'url\(|iubenda|clarity|display:\s*none|visibility:\s*hidden')

        assert_preserved(css)
        for changed in (
                css.replace('(max-height: 450px)', '(max-height: 451px)'),
                css.replace('.et_pb_text_1.et_pb_sticky_module {', '#ktk-cta {'),
                css + '\n' + reviewed_strip,
                css + '\n#ktk-cta { display: none; }',
                css + '\n.unreviewed { visibility: hidden; }',
                css + '\n.iubenda-cs-overlay { opacity: 0; }',
                css + '\n.artwork { background: url(changed.svg); }'):
            with self.subTest(styles=changed[-90:]):
                with self.assertRaises(AssertionError):
                    assert_preserved(changed)
        self.assertIn('text-decoration: underline', css)
        self.assertIn('flex: 0 0 24px', css)
        self.assertIn('min-height: 32px', css)
        self.assertIn('font-size: 18px', css)
        self.assertNotRegex(css, r'font-size:[^;}]*\b(?:vw|vh)\b')

    def test_all_generated_shells_retain_one_named_floating_landmark(self):
        assets = ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets'
        for definition in (assets / 'pages').glob('*.php'):
            shell = re.search(r'"shell_file":"([^"]+)"', definition.read_text())
            self.assertIsNotNone(shell)
            html = (assets / shell[1]).read_text()
            self.assertEqual(html.count('data-ktk-floating-booking='), 1, definition.name)
            self.assertIn('aria-label="Book an experience"', html)
            self.assertEqual(html.count('id="ktk-cta"'), 1, definition.name)


if __name__ == '__main__':
    unittest.main()
