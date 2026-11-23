"""Offline form payload/endpoint contracts; never submits messages."""
import json
import re
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets'


class Forms(HTMLParser):
    def __init__(self):
        super().__init__()
        self.forms = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form':
            self.current = {'attributes': attrs, 'controls': []}
            self.forms.append(self.current)
        elif self.current is not None and tag in ('input', 'select', 'textarea', 'button'):
            self.current['controls'].append({'tag': tag, **attrs})

    def handle_endtag(self, tag):
        if tag == 'form':
            self.current = None


class ContactFormContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.forms = {}
        for file in (ASSETS / 'content').glob('*.html'):
            parser = Forms()
            parser.feed(file.read_text(encoding='utf-8'))
            if parser.forms:
                cls.forms[file.stem] = parser.forms
        cls.runtime = (ASSETS / 'runtime.js').read_text(encoding='utf-8')

    def test_exact_existing_inventory(self):
        self.assertEqual(set(self.forms), {'contact', 'pub-crawl-jobs', 'krakow-hen-do',
                                         'krakow-stag-do', 'student-trips-poland',
                                         'stagshens', 'post-welcome-to-alcohol'})
        self.assertTrue(all(len(forms) == 1 for forms in self.forms.values()))

    def test_native_endpoint_and_required_hidden_routing_survive(self):
        count = 0
        for key, forms in self.forms.items():
            for form in forms:
                a = form['attributes']
                if a.get('data-ktk-form') != 'contact':
                    continue
                count += 1
                fields = {c.get('name'): c for c in form['controls'] if c.get('name')}
                self.assertEqual(a['action'], '__KTK_CONTACT_ACTION__')
                self.assertEqual(a['method'], 'post')
                self.assertEqual(a['data-route-key'], key)
                self.assertEqual(fields['action']['value'], 'ktk_pages_contact')
                self.assertEqual(fields['action']['type'], 'hidden')
                self.assertEqual(fields['route_key']['value'], key)
                for name in ('form_index', '_ktk_nonce', '_ktk_challenge', '_ktk_request_id'):
                    self.assertEqual(fields[name]['type'], 'hidden')
                self.assertEqual(a['data-ktk-owned-enquiry'], 'true')
        self.assertEqual(count, 7)

    def test_native_public_fields_match_existing_server_definitions(self):
        script = "define('ABSPATH', __DIR__); $out=[]; foreach(glob($argv[1].'/pages/*.php') as $f){$d=require $f; if(!empty($d['forms']))$out[$d['key']]=$d['forms'];} echo json_encode($out);"
        definitions = json.loads(subprocess.check_output(['php', '-r', script, str(ASSETS)], cwd=ROOT))
        routing = {'action', 'route_key', 'form_index', '_ktk_nonce', '_ktk_challenge', '_ktk_request_id'}
        for key, specs in definitions.items():
            for spec in specs:
                form = self.forms[key][spec['index']]
                actual = {c['name'] for c in form['controls'] if c.get('name') and c.get('type') not in ('submit', 'button')} - routing
                expected = {f['name'] for f in spec['fields']}
                if spec['captcha']:
                    expected.add('captcha')
                self.assertEqual(actual, expected, key)

    def test_all_forms_use_code_owned_contract_without_cf7_backend(self):
        manifest = json.loads((ASSETS / 'enquiry-forms.json').read_text(encoding='utf-8'))
        self.assertEqual(set(self.forms), {f['id'] for f in manifest['forms']})
        self.assertEqual((ASSETS / 'enquiry-forms.json').read_bytes(),
                         (ROOT / 'tools/content/enquiry-forms.json').read_bytes())
        for key, forms in self.forms.items():
            for form in forms:
                fields = {c.get('name'): c for c in form['controls'] if c.get('name')}
                self.assertEqual(form['attributes']['data-ktk-form'], 'contact', key)
                self.assertNotIn('data-feedback-endpoint', form['attributes'])
                self.assertFalse(any(name.startswith('_wpcf7') for name in fields), key)
                spec = next(f for f in manifest['forms'] if f['id'] == key)
                self.assertTrue({f['name'] for f in spec['fields']} <= set(fields), key)

    def test_runtime_reads_attribute_not_shadowed_property(self):
        self.assertIn("fetch(form.getAttribute('action')", self.runtime)
        self.assertNotRegex(self.runtime, r'\bform\.action\b')
        subprocess.run(['node', '--check', str(ASSETS / 'runtime.js')], check=True, capture_output=True)

    def test_errors_use_text_unique_ids_and_preserve_other_descriptions(self):
        self.assertIn('hint.textContent=error.message', self.runtime)
        self.assertNotRegex(self.runtime, r'innerHTML\s*=\s*error\.message')
        self.assertIn('ktk-field-error-${formIndex}-${index}', self.runtime)
        self.assertIn("id&&id!==hint.id", self.runtime)
        self.assertIn("ids.add(hint.id)", self.runtime)
        self.assertIn("invalid?.focus()", self.runtime)

    def test_unknown_delivery_blocks_repeat_without_rotating_identity(self):
        self.assertIn("if(form.dataset.deliveryUnconfirmed==='true'){display(unconfirmed(),false);return;}", self.runtime)
        self.assertIn("form.elements._ktk_request_id.value=result.data.requestId", self.runtime)
        self.assertIn("form.dataset.deliveryUnconfirmed='true'", self.runtime)
        self.assertNotIn('form.dataset.feedbackEndpoint', self.runtime)

    def test_native_checkbox_stays_focusable_without_changing_label_artwork(self):
        css = (ASSETS / 'runtime.css').read_text(encoding='utf-8')
        selector = '.ktk-code-page form[data-ktk-form="contact"] .et_pb_contact_field_checkbox > input[type="checkbox"]'
        self.assertEqual(css.count(selector + ' {'), 1)
        block = css.split(selector + ' {', 1)[1].split('}', 1)[0]
        for rule in ('display: block', 'position: absolute', 'opacity: 0', 'width: 24px', 'height: 24px'):
            self.assertIn(rule, block)
        self.assertIn(selector + ':focus-visible + label', css)

    def test_entered_values_have_scoped_contrast_without_recoloring_placeholders(self):
        css = (ASSETS / 'runtime.css').read_text(encoding='utf-8')
        selector = '.ktk-code-page form[data-ktk-form="contact"] :is(input:not([type="hidden"]):not([type="checkbox"]), textarea):not(:placeholder-shown)'
        self.assertEqual(css.count(selector + ' {'), 1)
        self.assertIn('color: #262626;', css.split(selector + ' {', 1)[1].split('}', 1)[0])


if __name__ == '__main__':
    unittest.main()
