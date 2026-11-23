<?php
/** Staging-only code-owned forms. Never reads Divi or Contact Form 7 mail configuration. */
if (!defined('ABSPATH')) { exit; }

function ktk_pages_enquiry_manifest() {
    static $manifest = null;
    if (null === $manifest) {
        $bytes = file_get_contents(__DIR__ . '/enquiry-forms.json');
        $data = json_decode($bytes, true);
        $manifest = is_array($data) && ($data['site'] ?? '') === 'ktk' && ($data['environment'] ?? '') === 'staging' && count($data['forms'] ?? array()) === 7 ? $data : false;
    }
    return $manifest;
}
function ktk_pages_contact_context($key, $index) {
    if (!ktk_pages_is_staging() || !ktk_pages_environment_enabled() || (string) $index !== '0') { return null; }
    $manifest = ktk_pages_enquiry_manifest();
    foreach (($manifest['forms'] ?? array()) as $definition) {
        if ($definition['id'] !== $key) { continue; }
        $page = ktk_pages_definition($definition['route']);
        if (!$page || $page['key'] !== $key || $page['route'] !== $definition['route']) { return null; }
        return array('page' => $page, 'definition' => $definition, 'form' => array('fields' => $definition['fields'], 'captcha' => $definition['arithmetic']), 'route' => $definition['route'], 'index' => 0);
    }
    return null;
}
function ktk_pages_challenge($key, $index, $first = null, $second = null) {
    $first = null === $first ? random_int(1, 15) : (int) $first;
    $second = null === $second ? random_int(1, 15) : (int) $second;
    $expires = time() + 1800;
    $payload = $first . ':' . $second . ':' . $expires . ':' . $key . ':' . $index;
    return array('first' => $first, 'second' => $second, 'expires' => $expires, 'token' => base64_encode($payload) . '.' . hash_hmac('sha256', $payload, wp_salt('nonce')));
}
function ktk_pages_valid_challenge($token, $answer, $key, $index) {
    $parts = explode('.', (string) $token, 2);
    if (count($parts) !== 2) { return false; }
    $payload = base64_decode($parts[0], true);
    if (!$payload || !hash_equals(hash_hmac('sha256', $payload, wp_salt('nonce')), $parts[1])) { return false; }
    $fields = explode(':', $payload);
    if (count($fields) !== 5 || $fields[3] !== $key || $fields[4] !== (string) $index || !ctype_digit($fields[2]) || (int) $fields[2] < time() || (int) $fields[2] > time() + 3600) { return false; }
    return ctype_digit(trim((string) $answer)) && (int) $answer === (int) $fields[0] + (int) $fields[1];
}
function ktk_pages_prepare_forms($html, $page) {
    foreach (($page['forms'] ?? array()) as $index => $form) {
        preg_match_all('#<span class="et_pb_contact_captcha_question">\s*(\d+)\s*\+\s*(\d+)\s*</span>#', $html, $questions, PREG_SET_ORDER);
        $question = $questions[$index] ?? null;
        $challenge = ktk_pages_challenge($page['key'], $index, $question[1] ?? null, $question[2] ?? null);
        $html = str_replace(array('__KTK_FORM_NONCE_' . $index . '__', '__KTK_FORM_CHALLENGE_' . $index . '__', '__KTK_FORM_REQUEST_ID_' . $index . '__'), array(esc_attr(wp_create_nonce('ktk-pages-contact:' . $page['key'] . ':' . $index)), esc_attr($challenge['token']), esc_attr(wp_generate_uuid4())), $html);
    }
    return str_replace('__KTK_CONTACT_ACTION__', esc_url(admin_url('admin-ajax.php')), $html);
}
function ktk_pages_contact_token() {
    $key = sanitize_key(is_scalar($_GET['route_key'] ?? '') ? $_GET['route_key'] : '');
    $index = is_scalar($_GET['form_index'] ?? '') ? (string) $_GET['form_index'] : '';
    if (!ktk_pages_contact_context($key, $index)) { wp_send_json_error(array('message' => 'This form is unavailable.'), 404); }
    nocache_headers();
    wp_send_json_success(array('nonce' => wp_create_nonce('ktk-pages-contact:' . $key . ':' . $index), 'challenge' => ktk_pages_challenge($key, $index), 'requestId' => wp_generate_uuid4()));
}
function ktk_pages_enquiry_invalid_field($field, $message = 'Please check this field.') {
    wp_send_json_error(array('message' => $message, 'field' => $field['name']), 422);
}
function ktk_pages_enquiry_values($context) {
    $values = array();
    foreach ($context['form']['fields'] as $field) {
        $post_name = str_ends_with($field['name'], '[]') ? substr($field['name'], 0, -2) : $field['name'];
        $raw = $_POST[$post_name] ?? ($field['type'] === 'multiselect' ? array() : '');
        if ($field['type'] === 'multiselect') {
            if (is_string($raw)) { $raw = json_decode(wp_unslash($raw), true); }
            if (!is_array($raw) || !array_is_list($raw) || count($raw) > count($field['options']) || ($field['required'] && !$raw)) { ktk_pages_enquiry_invalid_field($field); }
            $list = array();
            foreach ($raw as $value) {
                if (!is_string($value) || !in_array(wp_unslash($value), $field['options'], true)) { ktk_pages_enquiry_invalid_field($field); }
                $list[] = wp_unslash($value);
            }
            $values[$field['id']] = $list;
            continue;
        }
        if (!is_scalar($raw) || strlen((string) $raw) > $field['maxBytes'] || str_contains((string) $raw, "\0")) { ktk_pages_enquiry_invalid_field($field); }
        $value = sanitize_textarea_field(wp_unslash((string) $raw));
        if (isset($field['maxLength'])) {
            if (preg_match_all('/./us', $value, $characters) === false) { ktk_pages_enquiry_invalid_field($field); }
            $units = array_sum(array_map(static function ($character) { return strlen($character) > 3 ? 2 : 1; }, $characters[0]));
            if ($units > $field['maxLength']) { ktk_pages_enquiry_invalid_field($field, 'This field is too long.'); }
        }
        if ($field['required'] && '' === trim($value)) { ktk_pages_enquiry_invalid_field($field, 'Please complete this required field.'); }
        if ($field['type'] !== 'textarea' && preg_match('/[\r\n]/', $value)) { ktk_pages_enquiry_invalid_field($field); }
        if ($value !== '' && $field['type'] === 'email' && (!is_email($value) || strlen($value) > 254)) { ktk_pages_enquiry_invalid_field($field, 'Please enter a valid email address.'); }
        if ($value !== '' && $field['type'] === 'number' && (!preg_match('/^-?\d+(?:\.0+)?$/D', $value) || (float) $value < ($field['min'] ?? -9007199254740991) || abs((float) $value) > 9007199254740991)) { ktk_pages_enquiry_invalid_field($field, 'Please enter a valid whole number.'); }
        if ($value !== '' && $field['type'] === 'date') {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            if (!$date || $date->format('Y-m-d') !== $value) { ktk_pages_enquiry_invalid_field($field, 'Please enter a valid date.'); }
        }
        $values[$field['id']] = $value;
    }
    return $values;
}
function ktk_pages_enquiry_transport($payload) {
    $not_ready = array('ok' => false, 'http' => 503, 'message' => 'This form is temporarily unavailable. Please contact the team by email.', 'delivery_state' => 'not_attempted');
    if (!defined('KTK_ENQUIRY_API_URL') || !defined('KTK_ENQUIRY_SIGNING_SECRET') || !is_string(KTK_ENQUIRY_SIGNING_SECRET) || strlen(KTK_ENQUIRY_SIGNING_SECRET) < 32) { return $not_ready; }
    $url = parse_url(KTK_ENQUIRY_API_URL);
    $loopback = defined('KTK_ENQUIRY_LOCAL_TEST_MODE') && true === KTK_ENQUIRY_LOCAL_TEST_MODE && in_array(PHP_SAPI, array('cli','cli-server'), true) && in_array($url['host'] ?? '', array('127.0.0.1','localhost','::1'), true);
    if (!$url || ($url['path'] ?? '') !== '/api/website-enquiries/staging' || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment']) || (!$loopback && (($url['scheme'] ?? '') !== 'https' || isset($url['port']) && $url['port'] !== 443)) || ($loopback && !in_array($url['scheme'] ?? '', array('http','https'), true))) { return $not_ready; }
    $body = wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($body) || strlen($body) > 131072) { return array('ok' => false, 'http' => 422, 'message' => 'Your message is too long. Please shorten it and try again.', 'delivery_state' => 'not_attempted'); }
    $timestamp = (string) time();
    $response = wp_remote_post(KTK_ENQUIRY_API_URL, array('timeout' => 15, 'redirection' => 0, 'blocking' => true, 'sslverify' => true, 'reject_unsafe_urls' => !$loopback, 'limit_response_size' => 16384, 'headers' => array('Content-Type' => 'application/json', 'X-KTK-Enquiry-Timestamp' => $timestamp, 'X-KTK-Enquiry-Signature' => hash_hmac('sha256', $timestamp . "\n" . $body, KTK_ENQUIRY_SIGNING_SECRET)), 'body' => $body));
    $unconfirmed = array('ok' => false, 'http' => 503, 'message' => 'Delivery could not be confirmed. Please do not submit again; contact the team with this reference: ' . $payload['requestId'], 'delivery_state' => 'unconfirmed', 'request_id' => $payload['requestId']);
    if (is_wp_error($response)) { return $unconfirmed; }
    $status = wp_remote_retrieve_response_code($response);
    if (!str_contains(strtolower((string) wp_remote_retrieve_header($response, 'content-type')), 'application/json')) { return $unconfirmed; }
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($data)) { return $unconfirmed; }
    if ($status === 200 && ($data['status'] ?? '') === 'sent' && ($data['requestId'] ?? '') === $payload['requestId']) { return array('ok' => true, 'request_id' => $payload['requestId']); }
    if ($status === 422 && ($data['code'] ?? '') === 'invalid_field') { return array('ok' => false, 'http' => 422, 'message' => 'Please check the highlighted field.', 'field_id' => $data['field'] ?? '', 'delivery_state' => 'not_attempted'); }
    return $unconfirmed;
}
function ktk_pages_contact_submit() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { wp_send_json_error(array('message' => 'POST required.'), 405); }
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST) : null;
    if ($origin && $origin !== parse_url(home_url('/'), PHP_URL_HOST)) { wp_send_json_error(array('message' => 'Invalid request origin.'), 403); }
    $key = sanitize_key(is_scalar($_POST['route_key'] ?? '') ? $_POST['route_key'] : '');
    $index = is_scalar($_POST['form_index'] ?? '') ? (string) $_POST['form_index'] : '';
    $context = ktk_pages_contact_context($key, $index);
    if (!$context || !wp_verify_nonce(is_scalar($_POST['_ktk_nonce'] ?? '') ? $_POST['_ktk_nonce'] : '', 'ktk-pages-contact:' . $key . ':' . $index)) { wp_send_json_error(array('message' => 'The form expired. Please reload the page.'), 403); }
    if (!empty($_POST['_ktk_website'])) { wp_send_json_error(array('message' => 'Unable to send this message.'), 422); }
    if ($context['form']['captcha'] && !ktk_pages_valid_challenge(is_scalar($_POST['_ktk_challenge'] ?? '') ? $_POST['_ktk_challenge'] : '', is_scalar($_POST['captcha'] ?? '') ? $_POST['captcha'] : '', $key, $index)) { wp_send_json_error(array('message' => 'Please check the arithmetic answer.', 'field' => 'captcha'), 422); }
    $request_id = $_POST['_ktk_request_id'] ?? '';
    if (!is_string($request_id) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD', $request_id)) { wp_send_json_error(array('message' => 'Please reload the form before sending.'), 403); }
    $values = ktk_pages_enquiry_values($context);
    $rate_key = 'ktk_contact_' . substr(hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '') . ':' . $key, wp_salt('nonce')), 0, 32);
    $attempts = (int) get_transient($rate_key);
    if ($attempts >= 8) { wp_send_json_error(array('message' => 'Too many messages. Please contact the team by email.'), 429); }
    set_transient($rate_key, $attempts + 1, 15 * MINUTE_IN_SECONDS);
    $result = ktk_pages_enquiry_transport(array('requestId' => $request_id, 'formId' => $key, 'schemaSha256' => hash_file('sha256', __DIR__ . '/enquiry-forms.json'), 'fields' => $values));
    if (!$result['ok']) {
        foreach ($context['form']['fields'] as $field) { if (($result['field_id'] ?? null) === $field['id']) { $result['field'] = $field['name']; } }
        $http = $result['http']; unset($result['ok'], $result['http'], $result['field_id']);
        wp_send_json_error($result, $http);
    }
    wp_send_json_success(array('message' => $context['definition']['successMessage'], 'request_id' => $request_id));
}
add_action('wp_ajax_nopriv_ktk_pages_form_token', 'ktk_pages_contact_token');
add_action('wp_ajax_ktk_pages_form_token', 'ktk_pages_contact_token');
add_action('wp_ajax_nopriv_ktk_pages_contact', 'ktk_pages_contact_submit');
add_action('wp_ajax_ktk_pages_contact', 'ktk_pages_contact_submit');
