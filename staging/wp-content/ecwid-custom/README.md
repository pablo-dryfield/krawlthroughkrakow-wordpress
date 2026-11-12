# Ecwid custom app script (KTK)

This folder contains the JavaScript file to be loaded by your existing Ecwid custom app.

## File

- `ktk-ecwid-storefront.js`

## Deploy

1. Upload this folder to your server so this URL is public:
   - `https://krawlthroughkrakow.com/wp-content/ecwid-custom/ktk-ecwid-storefront.js`
2. Open your Ecwid custom app details and request/update the app script URL to that HTTPS link.
3. Open storefront page and verify browser console shows:
   - `[KTK Ecwid] Custom script initialized`

## Notes

- Keep changes in this file only (safe for plugin updates).
- Do not edit `wp-content/plugins/ecwid-shopping-cart/*` directly.
- Modify `SETTINGS` in `ktk-ecwid-storefront.js` to tune product card display behavior.
