# KTK Storefront

An isolated custom storefront served by WordPress at `/store2`.

## Boundaries

- Does not modify `/store` or the Ecwid plugin.
- Reads public catalog data through the WordPress REST proxy.
- Uses OmniLodge as the product and add-on source of truth.
- Checkout and payment processing are intentionally not part of the first catalog slice.

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

The local navbar is a development shell. The deployed `/store2` route continues
to use the real WordPress theme header and footer.
