# Roadmap Assets

The offline roadmap uses the existing KTK `logo.webp` without modifying it.
The builder embeds it in the generated HTML, not in deployed website assets.

The individual SVG files under `lucide/` are unmodified icons from the official
`lucide-static` npm package, version 1.72.0. Its full `LICENSE` is retained and is
also embedded as a comment in the generated standalone HTML.

- Source: `https://registry.npmjs.org/lucide-static/-/lucide-static-1.72.0.tgz`
- Verified npm integrity: `sha512-QhdZ60O7Zcs/e8gw40uMfEn055xZTHBZoNi0xb+/1R2dTd0v4FXS46VL6rKSwC+V92tLBiqsAbCcijy7Wy4j4w==`
- [Lucide static assets](https://lucide.dev/guide/static).

No CDN, tracking library or runtime package installation is required to open the
roadmap. The vendored icons are documentation-tool assets, not storefront code.
