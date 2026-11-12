export const DEFAULT_LEGACY_STORE_URL = 'https://krawlthroughkrakow.com/store/';

export const DEFAULT_LEGACY_PRODUCT_URLS = {
  'airport-transfer-42': 'https://krawlthroughkrakow.com/store/Airport-Transfer-Normal-p740813107',
  'beauty-the-beast-stag-45': 'https://krawlthroughkrakow.com/store/Beauty-&-the-Beast-Stag-p816624537',
  'boat-party-41': 'https://krawlthroughkrakow.com/store/Boat-Party-Private-Boat-p637239272',
  'bottomless-brunch-29': 'https://krawlthroughkrakow.com/store/2-Hour-Bottomless-Brunch-with-3-Course-Meal-And-Drinks-p808765006',
  'brewery-tour-40': 'https://krawlthroughkrakow.com/store/Brewery-Tour-p637056338',
  'bubble-football-43': 'https://krawlthroughkrakow.com/store/Bubble-Football-p637225330',
  'cycle-tour-50': 'https://krawlthroughkrakow.com/store/Cycle-Tour-p850960793',
  'dwarf-arrest-38': 'https://krawlthroughkrakow.com/store/Dwarf-Arrest-p808765256',
  'food-tour-krakow-48': 'https://krawlthroughkrakow.com/store/Krakow-Food-Tour-p637227366',
  'go-karting-30': 'https://krawlthroughkrakow.com/store/Krakow-Go-Karting-p637221989',
  'kidnapping-stag-prank-39': 'https://krawlthroughkrakow.com/store/Kidnapping-Stag-Prank-p740772463',
  'life-drawing-session-37': 'https://krawlthroughkrakow.com/store/Life-Drawing-Session-p637227458',
  'morning-wake-up-47': 'https://krawlthroughkrakow.com/store/Morning-Wake-Up-p828444580',
  'nye-pub-crawl-32': 'https://krawlthroughkrakow.com/store/New-Years-Eve-Krakow-Pub-Crawl-p800134329',
  'paintball-35': 'https://krawlthroughkrakow.com/store/Krakow-Paintball-p637240753',
  'party-bus-46': 'https://krawlthroughkrakow.com/store/Party-Bus-p821424470',
  'polish-vodka-tasting-44': 'https://krawlthroughkrakow.com/store/Polish-Vodka-Tasting-p637205219',
  'private-pub-crawl-31': 'https://krawlthroughkrakow.com/store/Private-Pub-Crawl-p835613122',
  'pub-crawl-28': 'https://krawlthroughkrakow.com/store/Krakow-Pub-Crawl-with-Krawl-Through-Krakow-p637047413',
  'shooting-range-34': 'https://krawlthroughkrakow.com/store/Krakow-Shooting-Range-Package-p637227393',
  'strip-club-36': 'https://krawlthroughkrakow.com/store/Strip-Club-p637239277',
};

const AVAILABILITY_STATUSES = new Set([502, 503, 504]);
const IMUNIFY_BOT_PROTECTION_MESSAGE = /access denied by imunify360 bot-protection/i;

export function isOmniAvailabilityFailure(error) {
  if (!error || error.name === 'AbortError') return false;
  return error.isNetworkError === true
    || error.isInvalidResponse === true
    || AVAILABILITY_STATUSES.has(Number(error.status))
    || (
      Number(error.status) === 403
      && IMUNIFY_BOT_PROTECTION_MESSAGE.test(String(error.message || ''))
    );
}

export function legacyDestination(storeUrl, productUrls, productSlugs = []) {
  const slugs = [...new Set(
    productSlugs.map((slug) => String(slug || '').trim()).filter(Boolean),
  )];
  if (slugs.length === 1 && productUrls?.[slugs[0]]) return productUrls[slugs[0]];
  return storeUrl || DEFAULT_LEGACY_STORE_URL;
}

export function legacyUrlWithAttribution(target, attribution, keys, baseUrl) {
  const url = new URL(target, baseUrl);
  keys.forEach((key) => {
    if (attribution?.[key] && !url.searchParams.has(key)) {
      url.searchParams.set(key, attribution[key]);
    }
  });
  return url.toString();
}
