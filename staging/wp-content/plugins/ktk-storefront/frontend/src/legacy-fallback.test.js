import assert from 'node:assert/strict';
import test from 'node:test';

import { isOmniAvailabilityFailure } from './legacy-fallback.js';

test('treats expected upstream outages as availability failures', () => {
  assert.equal(isOmniAvailabilityFailure({ isNetworkError: true }), true);
  assert.equal(isOmniAvailabilityFailure({ status: 502 }), true);
  assert.equal(isOmniAvailabilityFailure({ status: 503 }), true);
  assert.equal(isOmniAvailabilityFailure({ status: 504 }), true);
  assert.equal(isOmniAvailabilityFailure({ isInvalidResponse: true, status: 200 }), true);
});

test('treats only the identified Imunify 403 as an availability failure', () => {
  assert.equal(isOmniAvailabilityFailure({
    status: 403,
    message: 'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted',
  }), true);
  assert.equal(isOmniAvailabilityFailure({ status: 403, message: 'Forbidden' }), false);
});

test('does not redirect aborted or ordinary application failures', () => {
  assert.equal(isOmniAvailabilityFailure({ name: 'AbortError', isNetworkError: true }), false);
  assert.equal(isOmniAvailabilityFailure({ status: 400 }), false);
  assert.equal(isOmniAvailabilityFailure({ status: 500 }), false);
  assert.equal(isOmniAvailabilityFailure(null), false);
});
