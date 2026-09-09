<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$schemas = [
    'products' => [
        'columns' => ['id','name','description','price','compare_at_price','category','image_url','gallery','stock_quantity','product_type','status','sku','release_date','deposit_percent','featured'],
        'number' => ['price','compare_at_price','stock_quantity','deposit_percent'],
        'bool' => ['featured'],
        'json' => ['gallery'],
    ],
    'orders' => [
        'columns' => ['id','order_number','customer_name','customer_email','customer_phone','shipping_address','items','subtotal','delivery_option','delivery_weight_band','delivery_doorstep','delivery_cost','total','order_type','payment_status','fulfillment_status','notes','payment_method','paystack_reference','offline_receipt_url'],
        'number' => ['subtotal','delivery_cost','total'],
        'bool' => ['delivery_doorstep'],
        'json' => [],
    ],
    'settings' => [
        'columns' => ['id','store_name','admin_username','admin_password','currency_symbol','paystack_public_key','paystack_secret_key','paystack_enabled','paystack_currency','offline_payment_enabled','offline_bank_name','offline_account_name','offline_account_number','offline_instructions','delivery_config'],
        'number' => [],
        'bool' => ['paystack_enabled','offline_payment_enabled'],
        'json' => ['delivery_config'],
    ],
    'categories' => [
        'columns' => ['id','name','icon','image_url','sort_order','status'],
        'number' => ['sort_order'],
        'bool' => [],
        'json' => [],
    ],
    'coupons' => [
        'columns' => ['id','code','discount_type','discount_value','min_order','max_uses','used_count','expires_at','active'],
        'number' => ['discount_value','min_order','max_uses','used_count'],
        'bool' => ['active'],
        'json' => [],
    ],
    'site_content' => [
        'columns' => ['id','primary_color','accent_color','dark_color','success_color','danger_color','announcement_text','hero_badge_text','hero_heading','hero_subheading','hero_image_url','hero_cta_primary_text','hero_cta_primary_link','hero_cta_secondary_text','hero_cta_secondary_link','trust_badge_1_icon','trust_badge_1_title','trust_badge_1_subtitle','trust_badge_2_icon','trust_badge_2_title','trust_badge_2_subtitle','trust_badge_3_icon','trust_badge_3_title','trust_badge_3_subtitle','featured_section_heading','preorder_section_heading','preorder_section_subtext','categories_section_heading','footer_about_text','contact_email','contact_phone','contact_address','whatsapp_number','social_instagram','social_facebook','social_tiktok','social_twitter','free_shipping_threshold'],
        'number' => ['free_shipping_threshold'],
        'bool' => [],
        'json' => [],
    ],
    'product_media' => [
        'columns' => ['id','product_id','media_type','url','is_chunked','sort_order'],
        'number' => ['sort_order'],
        'bool' => ['is_chunked'],
        'json' => [],
    ],
    'media_chunks' => [
        'columns' => ['id','media_id','chunk_index','chunk_data'],
        'number' => ['chunk_index'],
        'bool' => [],
        'json' => [],
    ],
    'product_variations' => [
        'columns' => ['id','product_id','group_name','group_values','variant_prices','sort_order'],
        'number' => ['sort_order'],
        'bool' => [],
        'json' => ['group_values','variant_prices'],
    ],
    'order_tracking_notes' => [
        'columns' => ['id','order_id','message'],
        'number' => [],
        'bool' => [],
        'json' => [],
    ],
    'size_test_rt' => [
        'columns' => ['id'],
        'number' => [],
        'bool' => [],
        'json' => [],
    ],
];

function fail($message, $status = 400) {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

function db() {
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

function request_data() {
    $raw = file_get_contents('php://input');
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) fail('Invalid JSON body');
    return $data;
}

function normalize_row($row, $schema) {
    foreach ($schema['number'] as $key) {
        if (array_key_exists($key, $row)) $row[$key] = $row[$key] === null ? 0 : (float)$row[$key];
    }
    foreach ($schema['bool'] as $key) {
        if (array_key_exists($key, $row)) $row[$key] = (bool)$row[$key];
    }
    foreach ($schema['json'] as $key) {
        if (array_key_exists($key, $row)) {
            $decoded = json_decode($row[$key] ?: '[]', true);
            $row[$key] = is_array($decoded) ? $decoded : [];
        }
    }
    return $row;
}

function clean_payload($data, $schema) {
    $payload = [];
    foreach ($schema['columns'] as $column) {
        if (!array_key_exists($column, $data)) continue;
        $value = $data[$column];
        if (in_array($column, $schema['json'], true)) {
            $value = json_encode(is_array($value) ? $value : [], JSON_UNESCAPED_SLASHES);
        } elseif (in_array($column, $schema['bool'], true)) {
            $value = !empty($value) ? 1 : 0;
        }
        $payload[$column] = $value;
    }
    return $payload;
}

$table = $_GET['table'] ?? '';
$id = $_GET['id'] ?? null;

if (!$table && !empty($_GET['path'])) {
    $parts = array_values(array_filter(explode('/', trim($_GET['path'], '/'))));
    $table = $parts[0] ?? '';
    $id = $parts[1] ?? null;
}

if (!isset($schemas[$table])) fail('Unknown table', 404);

$schema = $schemas[$table];
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET' && $id) {
        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) fail('Record not found', 404);
        echo json_encode(normalize_row($row, $schema));
        exit;
    }

    if ($method === 'GET') {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
        $offset = ($page - 1) * $limit;

        $total = (int)$pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        $stmt = $pdo->prepare("SELECT * FROM `$table` ORDER BY id LIMIT ? OFFSET ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = array_map(function ($row) use ($schema) {
            return normalize_row($row, $schema);
        }, $stmt->fetchAll());
        echo json_encode(['data' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit]);
        exit;
    }

    if ($method === 'POST') {
        $payload = clean_payload(request_data(), $schema);
        if (empty($payload['id'])) $payload['id'] = uniqid($table . '_', true);

        $columns = array_keys($payload);
        $placeholders = array_fill(0, count($columns), '?');
        $sql = "INSERT INTO `$table` (`" . implode('`,`', $columns) . "`) VALUES (" . implode(',', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($payload));

        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
        $stmt->execute([$payload['id']]);
        echo json_encode(normalize_row($stmt->fetch(), $schema));
        exit;
    }

    if ($method === 'PUT' && $id) {
        $payload = clean_payload(request_data(), $schema);
        $payload['id'] = $id;

        $columns = array_keys($payload);
        $updates = array_map(function ($column) {
            return "`$column` = VALUES(`$column`)";
        }, $columns);
        $sql = "INSERT INTO `$table` (`" . implode('`,`', $columns) . "`) VALUES (" . implode(',', array_fill(0, count($columns), '?')) . ") ON DUPLICATE KEY UPDATE " . implode(',', $updates);
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($payload));

        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(normalize_row($stmt->fetch(), $schema));
        exit;
    }

    if ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        http_response_code(204);
        exit;
    }

    fail('Unsupported request', 405);
} catch (Throwable $e) {
    fail($e->getMessage(), 500);
}
