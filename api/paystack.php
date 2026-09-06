<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail_paystack($message, $status = 400, $details = null) {
    http_response_code($status);
    $payload = ['status' => false, 'message' => $message];
    if ($details !== null) $payload['details'] = $details;
    echo json_encode($payload);
    exit;
}

function paystack_db() {
    static $pdo = null;
    if ($pdo) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function store_settings() {
    $stmt = paystack_db()->prepare("SELECT * FROM `settings` WHERE id = ?");
    $stmt->execute(['store_settings']);
    $settings = $stmt->fetch();
    if (!$settings) fail_paystack('Store settings were not found', 500);
    return $settings;
}

function request_json() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) fail_paystack('Invalid JSON body');
    return $data;
}

function paystack_request($method, $path, $payload = null) {
    $settings = store_settings();
    $secret = trim($settings['paystack_secret_key'] ?? '');
    if ($secret === '') fail_paystack('Paystack secret key is not configured', 500);

    if (!function_exists('curl_init')) {
        fail_paystack('PHP cURL extension is not enabled on this server', 500);
    }

    $ch = curl_init('https://api.paystack.co' . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $secret,
        'Content-Type: application/json',
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $body = curl_exec($ch);
    $err = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) fail_paystack('Could not reach Paystack', 502, $err);
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) fail_paystack('Invalid Paystack response', 502, $body);
    if ($status < 200 || $status >= 300 || empty($decoded['status'])) {
        fail_paystack($decoded['message'] ?? 'Paystack request failed', $status ?: 502, $decoded);
    }
    return $decoded;
}

$action = $_GET['action'] ?? '';

try {
    if ($action === 'initialize-opay-direct-debit') {
        $settings = store_settings();
        $data = request_json();
        $email = trim($data['email'] ?? '');
        $amount = (int)($data['amount'] ?? 0);
        $reference = trim($data['reference'] ?? '');
        $callbackUrl = trim($data['callback_url'] ?? '');

        if ($email === '' || $amount <= 0 || $reference === '') {
            fail_paystack('Email, amount, and reference are required');
        }

        $payload = [
            'email' => $email,
            'amount' => (string)$amount,
            'currency' => $settings['paystack_currency'] ?: 'NGN',
            'reference' => $reference,
            'channels' => ['bank'],
            'metadata' => json_encode([
                'payment_method' => 'opay_direct_debit',
                'order_number' => $reference,
                'customer_name' => $data['customer_name'] ?? '',
                'custom_filters' => ['recurring' => true],
            ]),
        ];
        if ($callbackUrl !== '') $payload['callback_url'] = $callbackUrl;

        $response = paystack_request('POST', '/transaction/initialize', $payload);
        echo json_encode([
            'status' => true,
            'authorization_url' => $response['data']['authorization_url'] ?? '',
            'access_code' => $response['data']['access_code'] ?? '',
            'reference' => $response['data']['reference'] ?? $reference,
        ]);
        exit;
    }

    if ($action === 'verify-transaction') {
        $reference = trim($_GET['reference'] ?? '');
        if ($reference === '') fail_paystack('Reference is required');

        $response = paystack_request('GET', '/transaction/verify/' . rawurlencode($reference));
        echo json_encode([
            'status' => true,
            'paid' => (($response['data']['status'] ?? '') === 'success'),
            'reference' => $response['data']['reference'] ?? $reference,
            'transaction_status' => $response['data']['status'] ?? '',
        ]);
        exit;
    }

    fail_paystack('Unknown Paystack action', 404);
} catch (Throwable $e) {
    fail_paystack($e->getMessage(), 500);
}

