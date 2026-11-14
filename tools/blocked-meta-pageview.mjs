const call = "    fbq('track', 'PageView', []);";

export function metaInitializationSource(documentUrl) {
  const url = new URL(documentUrl);
  if (url.origin !== 'https://krawlthroughkrakow.com' || !/^\/(?:staging\/)?store2\//.test(url.pathname)) return null;
  const prefix = url.pathname.startsWith('/staging/') ? '/staging' : '';
  const options = {held: false, ajaxUrl: url.origin + prefix + '/wp-admin/admin-ajax.php', releaseAction: 'fbpix_release_signals', pixelId: '1018986598176189', attribution: {}, capig: '1'};
  return 'FacebookSignal.init(' + JSON.stringify(options).replaceAll('/', '\\/') + ');FacebookSignal.initPixel("1018986598176189",{},{"agent":"wordpress_0-7.1.4-5.2.2","includeCapiIntegration":true});';
}

// Classify only the two observed Meta dependency payloads, never a bundle error.
export function isBlockedMetaPageView(error, documentUrl, html) {
  if (typeof html !== 'string') return false;
  const initialization = metaInitializationSource(documentUrl);
  if (!initialization) return false;
  const source = error.message === 'fbq is not defined' ? '\n' + call + '\n  ' : error.message === 'FacebookSignal is not defined' ? initialization : null;
  if (!source) return false;
  const frames = String(error.stack).split('\n');
  if (frames.length !== 2 || frames[0] !== 'ReferenceError: ' + error.message) return false;
  const encodedFrame = '    at data:text/javascript;base64,' + Buffer.from(source).toString('base64') + (source === initialization ? ':1:1' : ':2:5');
  if (frames[1] === encodedFrame) return html.split('>' + source + '</script>').length === 2;
  if (error.message !== 'fbq is not defined') return false;
  const prefix = '    at ' + documentUrl + ':';
  if (!frames[1].startsWith(prefix)) return false;
  const position = frames[1].slice(prefix.length).match(/^(\d+):5$/);
  if (!position) return false;
  const lines = html.split('\n'), index = Number(position[1]) - 1;
  return lines[index] === call && lines[index - 1]?.endsWith('<script type="text/javascript">') &&
    lines[index + 1]?.startsWith('  </script>') && lines.filter(line => line === call).length === 1;
}
