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

if ($method === 'GET') {
    try {
        $stmt = $pdo->query(
            "SELECT p.*, m.numero AS mesa_numero
             FROM pedidos p
             LEFT JOIN mesas m ON p.mesa_id = m.id
             ORDER BY p.fecha_pedido DESC"
        );
        $pedidos = $stmt->fetchAll();

        $stmtItems = $pdo->prepare("SELECT * FROM detalle_pedidos WHERE pedido_id = ?");
        foreach ($pedidos as &$p) {
            $stmtItems->execute([$p['id']]);
            $p['items'] = $stmtItems->fetchAll();
        }

        echo json_encode($pedidos);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    try {
        $d = json_decode(file_get_contents('php://input'), true);

        if (empty($d['items']) || empty($d['mesa_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Items y mesa son requeridos']);
            exit;
        }

        $pdo->beginTransaction();

        // CREAR O ACTUALIZAR CLIENTE AUTOMÁTICAMENTE
        if (!empty($d['cliente_nombre']) && $d['cliente_nombre'] !== 'Sin nombre') {
            try {
                // Buscar si el cliente existe por nombre
                $stmtCliente = $pdo->prepare(
                    "SELECT id, total_compras FROM clientes WHERE nombre = ? LIMIT 1"
                );
                $stmtCliente->execute([$d['cliente_nombre']]);
                $clienteExistente = $stmtCliente->fetch();

                if ($clienteExistente) {
                    // Actualizar total de compras y última visita
                    $nuevoTotal = $clienteExistente['total_compras'] + floatval($d['total']);
                    $pdo->prepare(
                        "UPDATE clientes 
                         SET total_compras = ?, ultima_visita = NOW() 
                         WHERE id = ?"
                    )->execute([$nuevoTotal, $clienteExistente['id']]);
                } else {
                    // Crear nuevo cliente
                    $pdo->prepare(
                        "INSERT INTO clientes 
                         (nombre, tipo_documento, numero_documento, telefono, email, 
                          direccion, total_compras, ultima_visita, activo)
                         VALUES (?, 'CC', NULL, NULL, NULL, NULL, ?, NOW(), 1)"
                    )->execute([
                        $d['cliente_nombre'],
                        floatval($d['total'])
                    ]);
                }
            } catch (Exception $e) {
                // Si falla la creación del cliente, continuar con el pedido
                error_log("Error creando cliente: " . $e->getMessage());
            }
        }

        // Insertar cabecera del pedido
        $pdo->prepare(
            "INSERT INTO pedidos (cliente_nombre, mesa_id, total, estado)
             VALUES (?, ?, ?, 'pendiente')"
        )->execute([
            $d['cliente_nombre'] ?? 'Sin nombre',
            $d['mesa_id'],
            $d['total']
        ]);
        $pedidoId = (int)$pdo->lastInsertId();

        // Insertar items
        $stmtItem = $pdo->prepare(
            "INSERT INTO detalle_pedidos (pedido_id, producto_id, producto_nombre, cantidad, precio_unitario)
             VALUES (?, ?, ?, ?, ?)"
        );
        foreach ($d['items'] as $item) {
            $stmtItem->execute([
                $pedidoId,
                $item['productoId'],
                $item['nombre'],
                $item['cantidad'],
                $item['precio']
            ]);
        }

        // Marcar mesa como ocupada
        $pdo->prepare(
            "UPDATE mesas SET estado = 'ocupada', pedido_actual = ? WHERE id = ?"
        )->execute([$pedidoId, $d['mesa_id']]);

        $pdo->commit();
        echo json_encode(['success' => true, 'pedido_id' => $pedidoId]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'PUT') {
    try {
        $d = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID es requerido']);
            exit;
        }

        // Actualizar solo campos permitidos
        $updates = [];
        $params = [];

        if (!empty($d['estado'])) {
            $updates[] = "estado = ?";
            $params[] = $d['estado'];
        }
        if (!empty($d['cliente_nombre'])) {
            $updates[] = "cliente_nombre = ?";
            $params[] = $d['cliente_nombre'];
        }
        if (!empty($d['mesa_id'])) {
            $updates[] = "mesa_id = ?";
            $params[] = $d['mesa_id'];
        }
        if (!empty($d['total']) && is_numeric($d['total'])) {
            $updates[] = "total = ?";
            $params[] = $d['total'];
        }

        if (!empty($updates)) {
            $params[] = $id;
            $sql = "UPDATE pedidos SET " . implode(', ', $updates) . " WHERE id = ?";
            $pdo->prepare($sql)->execute($params);
        }

        // Liberar mesa si se completó o canceló
        if (!empty($d['estado']) && in_array($d['estado'], ['completado', 'cancelado'])) {
            $stmtMesa = $pdo->prepare("SELECT mesa_id FROM pedidos WHERE id = ?");
            $stmtMesa->execute([$id]);
            $row = $stmtMesa->fetch();
            if ($row && $row['mesa_id']) {
                $pdo->prepare(
                    "UPDATE mesas SET estado = 'disponible', pedido_actual = NULL WHERE id = ?"
                )->execute([$row['mesa_id']]);
            }
        }

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE') {
    try {
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID es requerido']);
            exit;
        }

        $stmtMesa = $pdo->prepare("SELECT mesa_id FROM pedidos WHERE id = ?");
        $stmtMesa->execute([$id]);
        $row = $stmtMesa->fetch();

        if ($row && $row['mesa_id']) {
            $pdo->prepare(
                "UPDATE mesas SET estado = 'disponible', pedido_actual = NULL WHERE id = ?"
            )->execute([$row['mesa_id']]);
        }

        $pdo->prepare("DELETE FROM detalle_pedidos WHERE pedido_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM pedidos WHERE id = ?")->execute([$id]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>