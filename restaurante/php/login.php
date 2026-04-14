<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Leer JSON
$input = file_get_contents('php://input');
$d = json_decode($input, true);

// Validar JSON
if (!$d) {
    http_response_code(400);
    echo json_encode([
        'error' => 'JSON inválido',
        'debug' => substr($input, 0, 200)
    ]);
    exit;
}

// Validar campos
if (empty($d['username']) || empty($d['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuario y contraseña requeridos']);
    exit;
}

try {
    // Buscar usuario
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE username = ? AND activo = 1");
    $stmt->execute([$d['username']]);
    $user = $stmt->fetch();

    if ($user && password_verify($d['password'], $user['password_hash'])) {

        // Actualizar último acceso
        $pdo->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?")
            ->execute([$user['id']]);

        echo json_encode([
            'success' => true,
            'user' => [
                'username' => $user['username'],
                'nombre_completo' => $user['nombre_completo'],
                'rol' => $user['rol']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Usuario o contraseña incorrectos']);
    }

} catch (PDOException $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor']);
}
exit;
?>