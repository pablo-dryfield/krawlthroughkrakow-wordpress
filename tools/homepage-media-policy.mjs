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
