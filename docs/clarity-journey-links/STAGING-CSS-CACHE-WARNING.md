# Existing Staging Optimizer Cache Drift

Found during the Clarity release's post-purge audit on 2026-11-11. This does not affect production's stylesheet or the new history controls in OmniLodge. No application CSS, optimizer configuration or generated cache file was changed to conceal it.

The ten-file staging backup and final payload both contain owned CSS SHA-256 `e1265119094141579fa8302b1104b81377a31a0fa97e580f12e6387d65e56e21`. Only storefront JavaScript changed in this release.

Normal staging HTML references:

`https://krawlthroughkrakow.com/staging/wp-content/cache/min/1/staging/wp-content/plugins/ktk-storefront/assets/storefront.css?ver=1791280907`

That optimizer-managed timestamp is not a source hash. More importantly, the rendered file has 565 top-level rules versus the owned source's 568, omitting these earlier cart-style rules:

- `.ktk-cart-update-notice`
- `.ktk-cart-update-notice .ktk-commerce__text-button`
- `fieldset.ktk-cart-editor,fieldset.ktk-cart-contact-fields`

The strict verifier uses PostCSS/value-parser to retain every ordered selector/declaration and normalize only comments/formatting and equivalent resolved resource URLs. It correctly fails this rendered stylesheet even though the owned source hash and new JavaScript match. `staging-clean-cache-assets.json` retains that failure on all three devices after the owner's domain purge. Initial `staging-before-purge-assets.json` also incorrectly expected the optimizer timestamp to equal the source hash; it is preserved, and the later parsed-rule check is the authoritative CSS evidence.

Production's normal HTML serves the correct owned CSS directly; clean and HIT checks pass on desktop, Android and iPad. Normal-URL cart browser checks pass 18/18 in both environments, including update/Undo, conflict review and pending-payment locks, but they are not proof of stylesheet identity.

Recommended separate maintenance: back up the exact staging optimizer cache, invalidate/rebuild WP Rocket's staging storefront CSS minification cache and affected staging page-cache entries, then purge the affected staging HTML/minified-asset Cloudflare prefixes and rerun the strict verifier. Do not hand-edit generated minified CSS, alter production optimizer settings or weaken the comparison to call it fixed.
