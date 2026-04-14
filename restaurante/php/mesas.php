<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Listar mesas
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM mesas ORDER BY numero");
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

//PUT: Cambiar estado / resetear
if ($method === 'PUT') {
    try {
        $d = json_decode(file_get_contents('php://input'), true);

        // Resetear TODAS las mesas a disponible
        if (isset($_GET['reset'])) {
            $pdo->query(
                "UPDATE mesas SET estado = 'disponible', pedido_actual = NULL"
            );
            echo json_encode(['success' => true, 'mensaje' => 'Todas las mesas liberadas']);
            exit;
        }

        // Cambiar estado de una mesa específica
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID es requerido']);
            exit;
        }

        // Si no envían estado, solo leemos la mesa (opcional)
        if (empty($d['estado'])) {
            $stmt = $pdo->prepare("SELECT * FROM mesas WHERE id = ?");
            $stmt->execute([$id]);
            $mesa = $stmt->fetch();
            
            if ($mesa) {
                echo json_encode($mesa);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Mesa no encontrada']);
            }
            exit;
        }

        $estadosValidos = ['disponible', 'ocupada', 'reservada', 'mantenimiento'];
        if (!in_array($d['estado'], $estadosValidos)) {
            http_response_code(400);
            echo json_encode(['error' => 'Estado inválido']);
            exit;
        }

        $pedidoActual = ($d['estado'] === 'disponible') ? null : ($d['pedido_actual'] ?? null);

        $pdo->prepare(
            "UPDATE mesas SET estado = ?, pedido_actual = ? WHERE id = ?"
        )->execute([$d['estado'], $pedidoActual, $id]);

        echo json_encode(['success' => true]);
        
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