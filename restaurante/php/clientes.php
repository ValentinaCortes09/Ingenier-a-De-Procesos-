<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

//GET: Listar clientes
if ($method === 'GET') {
    try {
        $stmt = $pdo->query(
            "SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre"
        );
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// POST: Crear o actualizar cliente
if ($method === 'POST') {
    try {
        $d = json_decode(file_get_contents('php://input'), true);

        if (empty($d['nombre'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre es requerido']);
            exit;
        }

        $existing = null;
        
        if (!empty($d['numero_documento'])) {
            $stmt = $pdo->prepare("SELECT * FROM clientes WHERE numero_documento = ?");
            $stmt->execute([$d['numero_documento']]);
            $existing = $stmt->fetch();
        }
        
        if (!$existing && !empty($d['telefono'])) {
            $stmt = $pdo->prepare("SELECT * FROM clientes WHERE telefono = ?");
            $stmt->execute([$d['telefono']]);
            $existing = $stmt->fetch();
        }

        if ($existing) {
            // Actualizar cliente existente
            $nuevoTotal = $existing['total_compras'] + ($d['total_compras'] ?? 0);
            $pdo->prepare(
                "UPDATE clientes
                 SET nombre = ?, 
                     tipo_documento = ?, 
                     telefono = ?, 
                     email = ?, 
                     direccion = ?,
                     total_compras = ?, 
                     ultima_visita = NOW()
                 WHERE id = ?"
            )->execute([
                $d['nombre'],
                $d['tipo_documento']   ?? $existing['tipo_documento'],
                $d['telefono']         ?? $existing['telefono'],
                $d['email']            ?? $existing['email'],
                $d['direccion']        ?? $existing['direccion'],
                $nuevoTotal,
                $existing['id']
            ]);

            echo json_encode(['success' => true, 'id' => $existing['id'], 'actualizado' => true]);
        } else {
            // Crear nuevo cliente
            $pdo->prepare(
                "INSERT INTO clientes
                 (nombre, tipo_documento, numero_documento, telefono, email, direccion, total_compras, ultima_visita, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)"
            )->execute([
                $d['nombre'],
                $d['tipo_documento']   ?? 'CC',
                $d['numero_documento'] ?? null,
                $d['telefono']         ?? null,
                $d['email']            ?? null,
                $d['direccion']        ?? null,
                $d['total_compras']    ?? 0
            ]);

            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'nuevo' => true]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Método no permitido
http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>