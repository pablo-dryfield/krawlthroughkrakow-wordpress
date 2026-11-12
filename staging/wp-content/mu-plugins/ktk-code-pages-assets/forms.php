<?php
/** Server-side contact processing for the explicitly enabled content registry. */
if (!defined('ABSPATH')) { exit; }

function ktk_pages_contact_context($key, $index) {
    if (!ktk_pages_environment_enabled() || !preg_match('/^[a-z0-9-]+$/D', $key) || !ctype_digit((string) $index)) { return null; }
    foreach (ktk_pages_registry()['routes'] as $route => $entry) {
        if ($entry['key'] !== $key) { continue; }
        $page = ktk_pages_definition($route);
        $form = $page['forms'][(int) $index] ?? null;
        if (!$form || empty($page['post_id'])) { return null; }
        $post = get_post($page['post_id']);
        if (!$post || 'publish' !== $post->post_status) { return null; }
        preg_match_all('/' . get_shortcode_regex(array('et_pb_contact_form')) . '/s', $post->post_content, $matches, PREG_SET_ORDER);
        if (!isset($matches[(int) $index])) { return null; }
        $attributes = shortcode_parse_atts($matches[(int) $index][3]);
        return array('page' => $page, 'form' => $form, 'attributes' => is_array($attributes) ? $attributes : array(), 'route' => $route, 'index' => (int) $index);
    }
    return null;
}
function ktk_pages_challenge($key, $index, $first = null, $second = null) {
    $first = null === $first ? random_int(1, 15) : (int) $first;
    $second = null === $second ? random_int(1, 15) : (int) $second;
    $expires = time() + 1800;
    $payload = $first . ':' . $second . ':' . $expires . ':' . $key . ':' . $index;
    return array('first' => $first, 'second' => $second, 'expires' => $expires,
        'token' => base64_encode($payload) . '.' . hash_hmac('sha256', $payload, wp_salt('nonce')));
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
        // Keep the initial captured arithmetic label; refresh with a new signed challenge on focus.
        $pattern = '#<span class="et_pb_contact_captcha_question">\s*(\d+)\s*\+\s*(\d+)\s*</span>#';
        preg_match_all($pattern, $html, $questions, PREG_SET_ORDER);
        $question = $questions[$index] ?? null;
        $challenge = ktk_pages_challenge($page['key'], $index, $question[1] ?? null, $question[2] ?? null);
        $html = str_replace(array('__KTK_FORM_NONCE_' . $index . '__', '__KTK_FORM_CHALLENGE_' . $index . '__'),
            array(esc_attr(wp_create_nonce('ktk-pages-contact:' . $page['key'] . ':' . $index)), esc_attr($challenge['token'])), $html);
    }
    return str_replace(array('__KTK_CONTACT_ACTION__', '__KTK_CF7_API__'),
        array(esc_url(admin_url('admin-ajax.php')), esc_url(rest_url('contact-form-7/v1/contact-forms/'))), $html);
}
function ktk_pages_contact_token() {
    $key = sanitize_key(is_scalar($_GET['route_key'] ?? '') ? $_GET['route_key'] : '');
    $index = isset($_GET['form_index']) && is_scalar($_GET['form_index']) ? (string) $_GET['form_index'] : '';
    $context = ktk_pages_contact_context($key, $index);
    if (!$context) { wp_send_json_error(array('message' => 'This form is unavailable.'), 404); }
    nocache_headers();
    wp_send_json_success(array('nonce' => wp_create_nonce('ktk-pages-contact:' . $key . ':' . $index), 'challenge' => ktk_pages_challenge($key, $index)));
}
function ktk_pages_contact_submit() {
    if ('POST' !== ($_SERVER['REQUEST_METHOD'] ?? '')) { wp_send_json_error(array('message' => 'POST required.'), 405); }
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST) : null;
    if ($origin && $origin !== parse_url(home_url('/'), PHP_URL_HOST)) { wp_send_json_error(array('message' => 'Invalid request origin.'), 403); }
    $key = sanitize_key(is_scalar($_POST['route_key'] ?? '') ? $_POST['route_key'] : '');
    $index = isset($_POST['form_index']) && is_scalar($_POST['form_index']) ? (string) $_POST['form_index'] : '';
    $context = ktk_pages_contact_context($key, $index);
    if (!$context || !wp_verify_nonce(is_scalar($_POST['_ktk_nonce'] ?? '') ? $_POST['_ktk_nonce'] : '', 'ktk-pages-contact:' . $key . ':' . $index)) {
        wp_send_json_error(array('message' => 'The form expired. Please try again.'), 403);
    }
    if (!empty($_POST['_ktk_website'])) { wp_send_json_error(array('message' => 'Unable to send this message.'), 422); }
    if ($context['form']['captcha'] && !ktk_pages_valid_challenge(is_scalar($_POST['_ktk_challenge'] ?? '') ? $_POST['_ktk_challenge'] : '', is_scalar($_POST['captcha'] ?? '') ? $_POST['captcha'] : '', $key, $index)) {
        wp_send_json_error(array('message' => 'Please check the arithmetic answer.', 'field' => 'captcha'), 422);
    }
    $values = array(); $reply = '';
    foreach ($context['form']['fields'] as $field) {
        $raw = $_POST[$field['name']] ?? '';
        if (!is_scalar($raw) || strlen((string) $raw) > 10000) { wp_send_json_error(array('message' => 'Invalid field value.'), 422); }
        $value = sanitize_textarea_field(wp_unslash((string) $raw));
        if ($field['required'] && '' === trim($value)) { wp_send_json_error(array('message' => 'Please complete all required fields.', 'field' => $field['name']), 422); }
        if ('email' === $field['type'] && '' !== $value) {
            if (!is_email($value)) { wp_send_json_error(array('message' => 'Please enter a valid email address.', 'field' => $field['name']), 422); }
            $reply = $value;
        }
        $values[$field['id']] = array('label' => $field['label'], 'value' => $value);
    }
    $rate_key = 'ktk_contact_' . substr(hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '') . ':' . $key, wp_salt('nonce')), 0, 32);
    $attempts = (int) get_transient($rate_key);
    if ($attempts >= 8) { wp_send_json_error(array('message' => 'Too many messages. Please try again later.'), 429); }
    set_transient($rate_key, $attempts + 1, 15 * MINUTE_IN_SECONDS);
    $attributes = $context['attributes'];
    $recipient_setting = !empty($attributes['email']) ? $attributes['email'] : get_option('admin_email');
    $recipients = array_filter(array_map('trim', preg_split('/[,;]+/', $recipient_setting)), 'is_email');
    if (!$recipients) { wp_send_json_error(array('message' => 'This form is temporarily unavailable.'), 503); }
    $pattern = $attributes['custom_message'] ?? $attributes['message_pattern'] ?? '';
    if ($pattern) {
        $body = $pattern;
        foreach ($values as $id => $field) { $body = str_ireplace('%%' . $id . '%%', $field['value'], $body); }
        $body = wp_strip_all_tags(str_replace(array('<br>', '<br/>', '<br />'), "\n", $body));
    } else {
        $body = implode("\n\n", array_map(static function ($field) { return $field['label'] . ': ' . $field['value']; }, $values));
    }
    $body .= "\n\nPage: " . home_url($context['route']);
    $headers = $reply ? array('Reply-To: ' . $reply) : array();
    $subject = '[Krawl Through Krakow] ' . wp_strip_all_tags($context['page']['title']);
    if (!wp_mail(array_values($recipients), $subject, $body, $headers)) { wp_send_json_error(array('message' => 'Message could not be sent. Please try again.'), 503); }
    wp_send_json_success(array('message' => !empty($attributes['success_message']) ? wp_strip_all_tags($attributes['success_message']) : 'Thank you. Your message has been sent.'));
}
add_action('wp_ajax_nopriv_ktk_pages_form_token', 'ktk_pages_contact_token');
add_action('wp_ajax_ktk_pages_form_token', 'ktk_pages_contact_token');
add_action('wp_ajax_nopriv_ktk_pages_contact', 'ktk_pages_contact_submit');
add_action('wp_ajax_ktk_pages_contact', 'ktk_pages_contact_submit');
