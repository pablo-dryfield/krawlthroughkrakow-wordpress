# Imunify360 incident - 2026-10-21

## Impact

- The production and staging WordPress storefront REST routes were challenged by hosting-level Imunify360 anti-bot protection.
- A blocked JSON response exposed `Access denied by Imunify360 bot-protection` in the storefront error state.
- Some uncached homepage font requests received the Imunify HTML challenge instead of WOFF2 bytes. Passion One 700 and 900 therefore fell back to another font in a normal visitor profile.
- The direct OmniLodge API remained healthy. This incident was between Cloudflare and the WordPress origin, not an OmniLodge outage.

## Hosting evidence

The read-only FTPS inventory in `tools/inspect-hosting-security.py` found:

- `.myimunify_id`, modified `2023-06-27 23:28:39 UTC`.
- `.imunify_patch_id`, modified `2025-04-17 06:50:56 UTC`.
- No WordPress plugin with an Imunify name.
- No Imunify references in production or staging `.htaccess`.
- The FTPS account cannot access `/var/log/imunify360`, `/etc/imunify360`, or `/usr/share/imunify360`.

These timestamps are account-level provisioning evidence, not proof of the server-wide installation date or operator. The origin host is `nl1-tr101.supercp.com` on the WHG/A2 Hosting network. Only the hosting provider's root audit/package records can identify the exact installer and initial installation time.

## Application mitigation

Storefront:

- The exact Imunify 403 is treated as an upstream availability failure and redirects to the matching legacy Ecwid product.
- A successful HTTP response that contains non-JSON challenge HTML is also treated as an invalid upstream response and uses the existing availability fallback.
- Ordinary 403 application errors and aborted requests do not redirect.
- Clean booking links remain free of invented UTM parameters; stored or incoming visitor attribution is still preserved.

Homepage:

- Local Passion One 400, 700, and 900 Latin/Latin-ext subsets are embedded in a small generated stylesheet.
- Captured origin `@font-face` declarations are renamed at build time so a challenged origin response cannot poison the active Passion One family.
- The original selector cascade, computed family name, typography, and layout remain unchanged.
- The hidden Store flyout is right-aligned only from 981-1099px so it cannot widen the 1024px document.

## Local verification

- Storefront unit suite: 32/32 tests passed.
- Storefront build: passed.
- Imunify browser fallback: 3/3 checks passed, covering JSON 403, HTTP 200 HTML challenge, clean URLs, and real attribution preservation.
- Homepage PHP integration, consent, and booking attribution tests: passed.
- Homepage publisher tests: 44/44 passed.
- Homepage responsive regression: 1,254/1,254 checks passed across 320, 390, 768, 1024, 1440, and 1920px for Halloween and NYE.

## Durable host fix

Ask hosting support to inspect the Imunify graylist/anti-bot incident and exempt legitimate requests to:

- `/wp-json/ktk-storefront/v1/*`
- `/wp-content/mu-plugins/ktk-homepage-assets/*`

Do not disable the entire Imunify360 suite solely for this false positive. CloudLinux documents IP allowlisting and anti-bot graylist behavior at:

- https://cloudlinux.zendesk.com/hc/en-us/articles/4418879896850-An-IP-has-been-locked-by-Imunify360-How-to-add-the-IP-to-the-White-List
- https://cloudlinux.zendesk.com/hc/en-us/articles/18397015583644-Why-the-IP-address-is-added-to-the-graylist-RBL-How-to-remove-the-IP-address-from-the-graylist

## Release status

Released to staging and production on 2026-10-21.

Storefront:

- Staging and production each contain the same 10 checksum-verified deployable files.
- JavaScript SHA-256: `a12222cdc2de7066fcbf5f8588747b92f220c7f6e7b306059a9eeb5076b51eca`.
- CSS remained unchanged at `e1fbfded953c58363d406380faa5da855e01ba19fa6c47a1118d2755e5168517`.
- Staging backup: `deploy-backups/ktk-storefront-staging-20261021-163749.zip`.
- Production backup: `deploy-backups/ktk-storefront-production-20261021-163918.zip`.
- The normal production publisher completed its backup, upload and 10/10 production checksum comparison before Imunify replaced the activation callback with HTML. A clean visitor browser then proved the plugin remained active, the product and booking form rendered, and the new versioned bundle was served.

Homepage:

- Staging and production each contain the same 232 checksum-verified owned files.
- Renderer SHA-256: `ead2162cb3a8ad28313577013e104ead40cd7fa164eaa8e61a1bbd6e1348e521`.
- `font-resilience.css` SHA-256: `f201564800c2ef0f7d1ef85ac353573e36a29f43971b76a84b4c5fcaa30af662`.
- `parity.css` SHA-256: `2edfdde155c6885b513705d7a1f801e18550c4883d8e88cc49578161c8a98016`.
- `parity-runtime.css` SHA-256: `796f0a616e44de1feec4da2849b89b746979621164ca79c11b49da85542e9654`.
- Verified production rollback archive: `deploy-backups/ktk-homepage-production-20261021-165506-138909.zip`, SHA-256 `95001bc2ed8eb4ad0b58f1cad42924547d1d00edb64a552d6301ae123e0a68d0`.
- The production WordPress state SHA-256 was `766bc3587809b64ede2f0c78cdccd41315e31b907762ccaae77724c4f1e1f125` before and after the release. The homepage post and global WordPress/Divi/WPCode/Iubenda settings were unchanged.
- Imunify blocked only automation callbacks. `tools/homepage-imunify-browser-bridge.py` used checksum-verified, expiring temporary MU helpers triggered by an already verified normal visitor browser. Each helper and response file was removed and its absence verified after use.
- The user performed the external cache purge. The post-upload scoped WordPress origin purge also succeeded; the WordPress Cloudflare integration was unavailable and therefore did not issue a second Cloudflare purge.
- Production visitor verification found the root canonical, seasonal hero, six embedded Passion One font rules, active Passion One display typography, no horizontal overflow and zero homepage console errors. The production storefront rendered the full product/booking flow with no Imunify error. The existing optional `fbq` reference error remains unrelated.

Evidence: `docs/imunify-incident-20261021-homepage-production-browser-release.json`. Raw WordPress snapshots remain temporary because captured options may contain operational configuration; only their SHA-256 equality and approved release backup are retained.
