import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const release=JSON.parse(await readFile('docs/shared-integrations/production-initial-publish.json','utf8'));
const directory='staging/wp-content/mu-plugins/';
let checks=0;
for(const [name,expected] of Object.entries(release.expected)) {
    assert.equal(createHash('sha256').update(await readFile(directory+name)).digest('hex'),expected,`Restore exact released bytes: ${name}`);
    checks++;
}
const state=JSON.parse(execFileSync('php',['-r',`define('ABSPATH','.'); function add_action(){} function add_filter(){} require 'staging/wp-content/mu-plugins/ktk-site-integrations.php'; echo json_encode(array('version'=>KTK_SITE_INTEGRATIONS_VERSION,'default'=>function_exists('ktk_site_google_consent_default'),'external'=>function_exists('ktk_site_rocket_external_exclusions')));`],{encoding:'utf8'}));
assert.equal(state.version,'2026.11.06.1');checks++;
assert.equal(state.default,false);checks++;
assert.equal(state.external,false);checks++;
console.log(`Consent experiment rollback (not consent correctness): ${checks}/${checks} passed`);
