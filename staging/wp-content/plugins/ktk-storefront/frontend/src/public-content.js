export function publicStorefrontHref(baseUrl, path = '') {
  const base = String(baseUrl).replace(/\/+$/, '');
  return `${base}/${path ? `${encodeURIComponent(path)}/` : ''}`;
}

export function followPublicLink(event, navigate, path) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(path);
}

export function completePublicContentHandoff(doc) {
  const fallback = doc.getElementById('ktk-storefront-public-content');
  const root = doc.getElementById('ktk-storefront-root');
  if (!fallback || !root) return;
  root.hidden = false;
  fallback.remove();
}
