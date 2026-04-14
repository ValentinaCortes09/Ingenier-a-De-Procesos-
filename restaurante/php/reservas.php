<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Listar reservas
if ($method === 'GET') {
    try {
        $stmt = $pdo->query(
            "SELECT *, COALESCE(total, precio_hora * duracion) as total_calc 
             FROM reservas_juegos 
             ORDER BY fecha DESC, hora DESC"
        );
        $results = $stmt->fetchAll();
        
        foreach ($results as &$r) {
            $r['total'] = $r['total_calc'] ?? ($r['precio_hora'] * $r['duracion']);
            unset($r['total_calc']);
        }
        
        echo json_encode($results);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener reservas: ' . $e->getMessage()]);
    }
    exit;
}

//POST: Crear reserva
if ($method === 'POST') {
    try {
        $d = json_decode(file_get_contents('php://input'), true);

        if (empty($d['juego']) || empty($d['fecha']) || empty($d['hora'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Juego, fecha y hora son requeridos']);
            exit;
        }

        $precio_hora = floatval($d['precio_hora'] ?? 0);
        $duracion = intval($d['duracion'] ?? 1);
        $total = $precio_hora * $duracion;

        $stmt = $pdo->prepare(
            "INSERT INTO reservas_juegos
             (cliente_nombre, telefono, juego, fecha, hora, duracion, personas, precio_hora, total, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')"
        );
        
        $success = $stmt->execute([
            $d['cliente_nombre'] ?? 'Sin nombre',
            $d['telefono']       ?? '',
            $d['juego'],
            $d['fecha'],
            $d['hora'],
            $duracion,
            $d['personas']       ?? 2,
            $precio_hora,
            $total
        ]);

        if ($success) {
            echo json_encode([
                'success' => true, 
                'id' => (int)$pdo->lastInsertId(),
                'total' => $total
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo crear la reserva']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear reserva: ' . $e->getMessage()]);
    }
    exit;
}

// PUT: Cambiar estado de reserva 
if ($method === 'PUT') {
    try {
        $d  = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID es requerido']);
            exit;
        }

        // Validar estados permitidos
        $estadosValidos = ['pendiente', 'confirmada', 'en-progreso', 'completada', 'cancelada'];
        $estado = $d['estado'] ?? 'pendiente';
        
        if (!in_array($estado, $estadosValidos)) {
            http_response_code(400);
            echo json_encode(['error' => 'Estado inválido']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE reservas_juegos SET estado = ? WHERE id = ?");
        $success = $stmt->execute([$estado, $id]);

        echo json_encode(['success' => $success]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar reserva: ' . $e->getMessage()]);
    }
    exit;
}

// DELETE: Eliminar reserva
if ($method === 'DELETE') {
    try {
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM reservas_juegos WHERE id = ?");
        $success = $stmt->execute([$id]);
        
        echo json_encode(['success' => $success]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar reserva: ' . $e->getMessage()]);
    }
    exit;
}

// Método no permitido
http_response_code(405);
echo json_encode(['error' => 'Método HTTP no permitido']);
exit;