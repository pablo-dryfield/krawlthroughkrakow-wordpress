import test from 'node:test';
import assert from 'node:assert/strict';
import {isBlockedMetaPageView, metaInitializationSource} from '../blocked-meta-pageview.mjs';

const url = 'https://krawlthroughkrakow.com/staging/store2/pub-crawl-28/?qa=1';
const html = '<html>\n<script type="text/javascript">\n    fbq(\'track\', \'PageView\', []);\n  </script><style>\n</html>';
const error = {message: 'fbq is not defined', stack: 'ReferenceError: fbq is not defined\n    at ' + url + ':3:5'};

test('classifies only the exact observed inline Meta page-view call', () => {
  assert.equal(isBlockedMetaPageView(error, url, html), true);
});
test('bundle errors, other document URLs and extra frames still fail', () => {
  for (const stack of [error.stack.replace(url, 'https://krawlthroughkrakow.com/assets/storefront.js'), error.stack + '\n    at another:1:1', error.stack.replace(':3:5', ':3:6')]) assert.equal(isBlockedMetaPageView({...error, stack}, url, html), false);
});
test('other messages, locations and altered source still fail', () => {
  assert.equal(isBlockedMetaPageView({...error, message: 'other error'}, url, html), false);
  assert.equal(isBlockedMetaPageView({...error, stack: error.stack.replace(':3:5', ':2:5')}, url, html), false);
  for (const changed of [html.replace("'PageView'", "'Purchase'"), html.replace('<script type="text/javascript">', '<div>'), html.replace('  </script>', '  </div>'), html + '\n' + "    fbq('track', 'PageView', []);"]) assert.equal(isBlockedMetaPageView(error, url, changed), false);
});
test('optimizer data URLs must match exact inline source, location and dependency', () => {
  for (const [message, source, position] of [['fbq is not defined', "\n    fbq('track', 'PageView', []);\n  ", ':2:5'], ['FacebookSignal is not defined', metaInitializationSource(url), ':1:1']]) {
    const e = {message, stack: 'ReferenceError: ' + message + '\n    at data:text/javascript;base64,' + Buffer.from(source).toString('base64') + position};
    const document = '<script type="rocketlazyloadscript">' + source + '</script>';
    assert.equal(isBlockedMetaPageView(e, url, document), true);
    for (const changed of [document.replace('PageView', 'Purchase').replace('"held":false', '"held":true'), document + document, '<div>' + source + '</div>']) assert.equal(isBlockedMetaPageView(e, url, changed), false);
    assert.equal(isBlockedMetaPageView({...e, stack: e.stack.replace(position, ':4:9')}, url, document), false);
  }
  assert.equal(metaInitializationSource('https://unrelated.example/store2/'), null);
  assert.equal(isBlockedMetaPageView(error, 'https://unrelated.example/store2/', html), false);
});
