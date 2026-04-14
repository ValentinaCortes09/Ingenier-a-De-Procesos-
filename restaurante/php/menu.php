<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $stmt = $pdo->query("SELECT * FROM productos WHERE estado = 'disponible' ORDER BY categoria, nombre");
    $productos = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'productos' => $productos]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>