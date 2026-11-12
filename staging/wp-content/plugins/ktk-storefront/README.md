# KTK Storefront

An isolated custom storefront served by WordPress at `/store2`.

## Boundaries

- Does not modify `/store` or the Ecwid plugin.
- Reads public catalog data through the WordPress REST proxy.
- Uses OmniLodge as the product and add-on source of truth.
- Existing cart, checkout and Stripe processing use the OmniLodge backend; public-content changes do not replace those flows.

## Staging Public HTML

The November 12 SEO batch enables initial public catalog/product HTML only when
the storefront request has the exact staging home/site URLs. Production keeps
its prior renderer until a separately approved release. Cart, checkout,
confirmation and recovery endpoints do not get this public HTML.

PHP reuses the existing public product/catalog cache and data source. It escapes
read-only product text, inclusions, images, meeting information and cancellation
terms. Booking remains in the interactive configurator. The public copy remains
visible while React loads, then is removed when the actual app is ready; no
extra product-view event or raw tracking/payment bootstrap is emitted by PHP.

`includes/product-content-fallbacks.json` is the shared source for the existing
Bubble Football fallback, imported by React and read by PHP. Do not maintain a
second copy or invent missing operational facts. Native product links work as
ordinary links and enhance into SPA navigation for unmodified primary clicks.

The deployable payload now contains 12 explicit files, including the public
content class and shared fallback JSON. Never upload `frontend`/dependencies.
The staging SEO publisher is `tools/publish-storefront-staging.ps1`; its default
is local dry run. Publishing requires fresh passing payload-bound browser
evidence, source-baseline matching, a verified backup and protected-state checks.
It cannot target production. GitHub only checks source and never deploys.

## API configuration

The default API base is:

```text
https://omni-lodge.com/api/storefront
```

Override it in `wp-config.php` when needed:

```php
define( 'KTK_STOREFRONT_API_BASE', 'https://example.com/api/storefront' );
```

## Frontend build

```powershell
cd frontend
npm install
npm run build
```

Activate the plugin in WordPress, then visit **Settings > Permalinks** once if `/store2` does not resolve immediately.

## Local UI development

Run the React storefront with Vite hot reload:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Changes to `src/main.jsx` and
`src/storefront.css` appear immediately without rebuilding or uploading to
WordPress.

The local server proxies `/ktk-api` to the production OmniLodge storefront API,
so the preview uses the real product catalog without browser CORS issues. Copy
`.env.example` to `.env.local` only when a different API origin or path is
needed.

The local navbar is a development shell. Deployed pages retain the existing
WordPress integration hooks and code-owned storefront shell. `/store` remains
the unchanged legacy fallback.
