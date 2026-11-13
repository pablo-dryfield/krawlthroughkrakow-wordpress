export function applyHomepageMediaPolicy() {
  const revisions = [];
  for (const image of document.querySelectorAll('img')) {
    if (image.id === 'logo') continue;
    revisions.push({src: image.getAttribute('src'), previousLoading: image.getAttribute('loading'), previousPriority: image.getAttribute('fetchpriority'), loading: 'lazy'});
    image.setAttribute('loading', 'lazy');
    image.removeAttribute('fetchpriority');
  }
  return revisions;
}

export function homepageAuditWriteKind(method, url) {
  if (['GET', 'HEAD'].includes(method)) return null;
  return /\/(?:wp-json\/ktk-storefront|api\/storefront)(?:\/|$)/.test(new URL(url).pathname) ? 'commerce' : 'other';
}

export function applyHomepageIconSizing() {
  const names = ['i6agsskidpgwcluwywc6', 'jgqte2id3waqv2vs8edd', 'ciaiu30657qcru0sdnnb', 'ppygtlcm5nb6j4lsr251', 'ccz58hmwdrzaaktxvokp', 'ygkzrcl8zu8ybudwpmys'];
  const originalSizes = '(min-width: 0px) and (max-width: 480px) 480px, (min-width: 481px) and (max-width: 980px) 980px, (min-width: 981px) and (max-width: 1280px) 1280px, (min-width: 1281px) 2000px, 100vw';
  const sizes = '(max-width: 980px) 40vw, 12vw';
  const images = [...document.querySelectorAll('img')];
  // Validate the complete captured set before changing any attribute.
  const pending = names.map(name => {
    const matches = images.filter(image => (image.getAttribute('src') || '').includes(name));
    if (matches.length !== 1) throw new Error('Homepage icon identity is missing or ambiguous: ' + name);
    const image = matches[0];
    const base = 'https://krawlthroughkrakow.com/wp-content/uploads/2025/04/' + name + '_compressed_compressed';
    const srcset = [base + '.webp 2000w', ...[1280, 980, 480].map(width => base + '-' + width + 'x' + width + '.webp ' + width + 'w')].join(', ');
    const previous = image.getAttribute('sizes');
    if (image.getAttribute('src') !== base + '.webp' || image.getAttribute('srcset') !== srcset
      || image.getAttribute('width') !== '2000' || image.getAttribute('height') !== '2000'
      || image.getAttribute('loading') !== 'lazy' || image.closest('.et_pb_gallery')
      || ![originalSizes, sizes].includes(previous)) throw new Error('Homepage icon source/sizing contract changed: ' + name);
    return {image, src: base + '.webp', previous};
  });
  for (const {image} of pending) image.setAttribute('sizes', sizes);
  return pending.map(({src, previous}) => ({src, previous, sizes}));
}
