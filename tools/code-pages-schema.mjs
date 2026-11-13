export const schemaOrigin = 'https://krawlthroughkrakow.com';
export const schemaHolds = new Set(['/hostel-hangover-cure/']);

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const authorTypes = new Map([
  ['/author/dpbowman/', 'Person'],
  ['/author/jessie/', 'Person'],
]);

// Runs in the builder's DOM, after content revisions; it does not mutate markup.
export function codePageSchemaFacts() {
  const root = document.querySelector('#main-content');
  const titles = [...root.querySelectorAll('h1')];
  if (titles.length !== 1 || !titles[0].textContent.trim()) throw new Error('One visible page headline required');
  const author = root.querySelector('.post-meta .author a');
  const image = root.querySelector('.et_post_meta_wrapper > img');
  return {
    headline: titles[0].textContent,
    published: root.querySelector('.post-meta .published')?.textContent ?? '',
    author: author ? {name: author.textContent, url: author.getAttribute('href')} : null,
    image: image ? {src: image.getAttribute('src'), width: image.getAttribute('width'), height: image.getAttribute('height'), alt: image.getAttribute('alt')} : null,
  };
}

export function visiblePublicationDate(value) {
  const match = clean(value).match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/);
  if (!match) return null;
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1]) + 1;
  const date = `${match[3]}-${String(month).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  if (new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new Error('Invalid visible publication date');
  return date;
}

function reviewedRoute(value) {
  if (typeof value !== 'string' || !/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/.test(value) || /^\/(?:staging|store|store2|wp-admin|wp-json)\//.test(value)) {
    throw new Error('Structured data requires a reviewed public content route');
  }
  return value;
}

export function buildCodePageSchema({route, kind, description, facts, routes, inherited = []}) {
  reviewedRoute(route);
  const registry = new Map(routes.map(row => [reviewedRoute(row.route), row]));
  if (!registry.has(route)) throw new Error('Unregistered schema route');
  if (!Array.isArray(inherited)) throw new Error('Inherited schema must remain an array');
  if (schemaHolds.has(route)) return structuredClone(inherited);
  const name = clean(facts.headline);
  if (!name) throw new Error('Empty schema headline');
  const url = schemaOrigin + route;
  const isArticle = kind === 'blog post';
  const isCollection = /^(?:author|category|tag)\//.test(route.slice(1)) || route === '/blog/' || /^\/blog\/page\/\d+\/$/.test(route);
  const type = route === '/about-us/' ? 'AboutPage' : route === '/contact/' ? 'ContactPage' : isCollection ? 'CollectionPage' : 'WebPage';
  const page = {'@type': type, '@id': url + '#webpage', url, name, inLanguage: 'en', isPartOf: {'@id': schemaOrigin + '/#website'}, breadcrumb: {'@id': url + '#breadcrumb'}};
  if (clean(description)) page.description = clean(description);
  if (type === 'AboutPage') page.about = {'@id': schemaOrigin + '/#organization'};

  const crumbs = [{name: 'Home', item: schemaOrigin + '/'}];
  if ((isArticle || isCollection) && route !== '/blog/' && registry.has('/blog/')) crumbs.push({name: 'Blog', item: schemaOrigin + '/blog/'});
  const segments = route.split('/').filter(Boolean);
  for (let count = 1; count < segments.length; count++) {
    const parent = '/' + segments.slice(0, count).join('/') + '/';
    if (!registry.has(parent) || crumbs.some(crumb => crumb.item === schemaOrigin + parent)) continue;
    const parentName = clean(registry.get(parent).title).replace(/\s*\| Krawl Through Krakow$/, '');
    if (parentName) crumbs.push({name: parentName, item: schemaOrigin + parent});
  }
  crumbs.push({name, item: url});
  const breadcrumb = {'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs.map((crumb, index) => ({'@type': 'ListItem', position: index + 1, ...crumb}))};
  const graph = [page, breadcrumb];
  if (isArticle) {
    const article = {'@type': 'BlogPosting', '@id': url + '#article', url, headline: name, inLanguage: 'en', mainEntityOfPage: {'@id': page['@id']}, publisher: {'@id': schemaOrigin + '/#organization'}};
    if (page.description) article.description = page.description;
    const published = visiblePublicationDate(facts.published);
    if (published) article.datePublished = published;
    if (facts.author) {
      const authorUrl = String(facts.author.url ?? '').replace(/^__KTK_HOME_URL__/, schemaOrigin + '/');
      const parsed = new URL(authorUrl, schemaOrigin);
      const authorType = authorTypes.get(parsed.pathname);
      if (parsed.origin === schemaOrigin && !parsed.search && !parsed.hash && authorType && registry.has(parsed.pathname) && clean(facts.author.name)) {
        article.author = {'@type': authorType, '@id': parsed.href + '#person', name: clean(facts.author.name), url: parsed.href};
      }
    }
    // Only the real featured image, never an arbitrary inline icon or fallback logo.
    const image = facts.image;
    if (image && /^__KTK_PAGE_ASSETS__media\/[a-zA-Z0-9._-]+$/.test(image.src ?? '') && Number(image.width) >= 300 && Number(image.height) >= 150) {
      article.image = schemaOrigin + '/wp-content/mu-plugins/ktk-code-pages-assets/' + image.src.replace('__KTK_PAGE_ASSETS__', '');
    }
    page.mainEntity = {'@id': article['@id']};
    graph.push(article);
  }
  const inheritedIds = inherited.flatMap(item => item['@graph'] ?? [item]).map(item => item['@id']);
  if (graph.some(item => inheritedIds.includes(item['@id']))) throw new Error('Generated schema conflicts with inherited entity identity');
  return [...structuredClone(inherited), {'@context': 'https://schema.org', '@graph': graph}];
}
