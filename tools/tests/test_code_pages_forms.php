<?php
define('ABSPATH', dirname(__DIR__, 2));
define('MINUTE_IN_SECONDS', 60);
class FormResult extends RuntimeException { public $payload; public function __construct($success, $data, $status) { $this->payload = compact('success', 'data', 'status'); } }
$staging = true; $mail = array(); $rates = array(); $attributes = array('email' => 'owner@example.test');
function ktk_pages_is_staging() { global $staging; return $staging; }
function ktk_pages_environment_enabled() { global $staging; return $staging; }
function ktk_pages_registry() { return array('routes' => array('/contact/' => array('key' => 'contact'))); }
function ktk_pages_definition($route) { return array('post_id' => 42, 'title' => 'Contact', 'forms' => array(array('captcha' => true, 'fields' => array(
    array('name' => 'name', 'id' => 'name', 'label' => 'Name', 'type' => 'input', 'required' => true),
    array('name' => 'email', 'id' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true),
)))); }
function get_post($id) { return (object) array('post_status' => 'publish', 'post_content' => '[et_pb_contact_form email="owner@example.test"]'); }
function get_shortcode_regex($tags) { return '(\[?)(et_pb_contact_form)([^\]]*)\]'; }
function shortcode_parse_atts($value) { global $attributes; return $attributes; }
function wp_salt($purpose) { return 'unit-test-not-a-server-secret'; }
function home_url($path) { return 'https://krawlthroughkrakow.com/staging' . $path; }
function wp_verify_nonce($nonce, $action) { return $nonce === 'valid'; }
function sanitize_key($value) { return preg_replace('/[^a-z0-9_-]/', '', strtolower($value)); }
function sanitize_textarea_field($value) { return strip_tags($value); }
function wp_unslash($value) { return $value; }
function wp_strip_all_tags($value) { return strip_tags($value); }
function is_email($value) { return (bool) filter_var($value, FILTER_VALIDATE_EMAIL); }
function get_option($key) { return 'admin@example.test'; }
function get_transient($key) { global $rates; return $rates[$key] ?? 0; }
function set_transient($key, $value, $duration) { global $rates; $rates[$key] = $value; }
function add_action(...$args) {}
function wp_send_json_error($data, $status) { throw new FormResult(false, $data, $status); }
function wp_send_json_success($data) { throw new FormResult(true, $data, 200); }
function wp_mail(...$args) { global $mail; $mail[] = $args; return true; }
// The byte-preserved handler remains independently exercised for production rollback.
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-code-pages-assets/forms-legacy.php';
$checks = 0;
function check($condition, $message) { global $checks; ++$checks; if (!$condition) throw new RuntimeException($message); }
$challenge = ktk_pages_challenge('contact', 0, 4, 7);
check(ktk_pages_valid_challenge($challenge['token'], '11', 'contact', '0'), 'Valid signed arithmetic');
check(!ktk_pages_valid_challenge($challenge['token'], '10', 'contact', '0'), 'Wrong answer rejected');
check(!ktk_pages_valid_challenge($challenge['token'] . 'x', '11', 'contact', '0'), 'Tampering rejected');
check(!ktk_pages_valid_challenge($challenge['token'], '11', 'other', '0'), 'Cross-page token rejected');
check(!ktk_pages_valid_challenge($challenge['token'], '11', 'contact', '1'), 'Cross-form token rejected');
$expired = '4:7:' . (time() - 1) . ':contact:0';
check(!ktk_pages_valid_challenge(base64_encode($expired) . '.' . hash_hmac('sha256', $expired, wp_salt('nonce')), '11', 'contact', '0'), 'Expired challenge rejected');
check(null === ktk_pages_contact_context('../contact', '0'), 'Invalid key rejected');
check(null === ktk_pages_contact_context('contact', '-1'), 'Invalid index rejected');
$staging = false; check(null === ktk_pages_contact_context('contact', '0'), 'Production form handler isolated'); $staging = true;
$_SERVER = array('REQUEST_METHOD' => 'POST', 'HTTP_ORIGIN' => 'https://krawlthroughkrakow.com', 'REMOTE_ADDR' => '192.0.2.10');
$valid = array('route_key' => 'contact', 'form_index' => '0', '_ktk_nonce' => 'valid', '_ktk_challenge' => $challenge['token'], 'captcha' => '11', 'name' => 'Unit test', 'email' => 'guest@example.test');
function submit($overrides = array()) { global $valid; $_POST = array_replace($valid, $overrides); try { ktk_pages_contact_submit(); } catch (FormResult $result) { return $result->payload; } throw new RuntimeException('Handler did not terminate'); }
foreach (array(array('_ktk_nonce' => 'bad'), array('_ktk_website' => 'spam'), array('captcha' => '12'), array('email' => 'bad'), array('name' => ''), array('name' => array('invalid')), array('route_key' => array('contact')), array('name' => str_repeat('a', 10001))) as $invalid) {
    $result = submit($invalid); check(!$result['success'], 'Invalid form rejected'); check(count($mail) === 0, 'No mail for invalid input');
}
$_SERVER['HTTP_ORIGIN'] = 'https://external.example'; check(submit()['status'] === 403, 'Cross-origin request rejected');
$_SERVER['HTTP_ORIGIN'] = 'https://krawlthroughkrakow.com';
$result = submit(array('recipient' => 'attacker@example.test'));
check($result['success'] && count($mail) === 1, 'Valid form uses mail adapter');
check($mail[0][0] === array('owner@example.test'), 'Browser cannot choose recipient');
check($mail[0][3] === array('Reply-To: guest@example.test'), 'Validated reply-to');
$attributes = array('email' => ''); submit(); check($mail[1][0] === array('admin@example.test'), 'Empty original recipient uses WordPress default');
for ($i = 0; $i < 6; ++$i) submit();
check(submit()['status'] === 429 && count($mail) === 8, 'Rate limit bounds successful deliveries');
$rates = array();
$attributes = array('email' => 'owner@example.test', 'custom_message' => 'Name: %%name%%||et_pb_line_break_holder||Email: %%email%%<br />End');
$offset = count($mail);
check(submit(array('name' => 'Literal ||et_pb_line_break_holder|| kept'))['success'], 'Template formatting accepts the existing valid form');
check($mail[$offset][2] === "Name: Literal ||et_pb_line_break_holder|| kept\nEmail: guest@example.test\nEnd\n\nPage: https://krawlthroughkrakow.com/staging/contact/", 'Only saved-template separators become newlines; customer text stays literal');
check($mail[$offset][0] === array('owner@example.test') && $mail[$offset][1] === '[Krawl Through Krakow] Contact' && $mail[$offset][3] === array('Reply-To: guest@example.test'), 'Formatting preserves recipient subject and validated reply-to');
$attributes = array('email' => 'owner@example.test', 'message_pattern' => '%%NAME%%||et_pb_line_break_holder||||et_pb_line_break_holder||%%email%%');
check(submit()['success'], 'Legacy message_pattern remains supported');
check($mail[$offset + 1][2] === "Unit test\n\nguest@example.test\n\nPage: https://krawlthroughkrakow.com/staging/contact/", 'Legacy template retains blank lines and case-insensitive fields');

echo "Code page forms: {$checks}/{$checks} passed (mail stubbed; no real email sent)\n";
