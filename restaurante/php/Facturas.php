<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Listar facturas
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM facturas ORDER BY fecha_emision DESC");
        $facturas = $stmt->fetchAll();

        $stmtDet = $pdo->prepare("SELECT * FROM detalle_facturas WHERE factura_id = ?");
        foreach ($facturas as &$f) {
            $stmtDet->execute([$f['id']]);
            $f['items'] = $stmtDet->fetchAll();
        }

        echo json_encode($facturas);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// POST: Crear factura
if ($method === 'POST') {
    try {
        $input = file_get_contents('php://input');
        $d = json_decode($input, true);

        if (empty($d['cliente_nombre']) || empty($d['items'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Cliente e ítems son requeridos']);
            exit;
        }

        $pdo->beginTransaction();

        // Generar número de factura secuencial
        $stmt = $pdo->query("SELECT COUNT(*) as c FROM facturas");
        $count = $stmt->fetch()['c'];
        $numero = 'FAC-' . str_pad($count + 1, 6, '0', STR_PAD_LEFT);

        $pdo->prepare(
            "INSERT INTO facturas
             (numero_factura, tipo_documento, numero_documento, cliente_nombre,
              email, telefono, direccion, subtotal, iva, total, cufe, resolucion_dian, estado, fecha_emision)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', NOW())"
        )->execute([
            $numero,
            $d['tipo_documento']   ?? 'CC',
            $d['numero_documento'] ?? '',
            $d['cliente_nombre'],
            $d['email']            ?? '',
            $d['telefono']         ?? '',
            $d['direccion']        ?? '',
            $d['subtotal'],
            $d['iva'],
            $d['total'],
            $d['cufe'],
            $d['resolucion']       ?? '18740012345678'
        ]);
        $facturaId = (int)$pdo->lastInsertId();

        $stmtDet = $pdo->prepare(
            "INSERT INTO detalle_facturas (factura_id, descripcion, cantidad, valor_unitario)
             VALUES (?, ?, ?, ?)"
        );
        foreach ($d['items'] as $item) {
            $stmtDet->execute([
                $facturaId,
                $item['descripcion'],
                $item['cantidad'],
                $item['valorUnitario']
            ]);
        }

        // Crear o actualizar cliente automáticamente
        if (!empty($d['cliente_nombre'])) {
            try {
                $stmtCliente = $pdo->prepare(
                    "SELECT id, total_compras FROM clientes WHERE numero_documento = ? OR (nombre = ? AND telefono = ?)"
                );
                $stmtCliente->execute([
                    $d['numero_documento'] ?? '',
                    $d['cliente_nombre'],
                    $d['telefono'] ?? ''
                ]);
                $clienteExistente = $stmtCliente->fetch();

                if ($clienteExistente) {
                    $nuevoTotal = $clienteExistente['total_compras'] + floatval($d['total']);
                    $pdo->prepare(
                        "UPDATE clientes 
                         SET total_compras = ?, ultima_visita = NOW() 
                         WHERE id = ?"
                    )->execute([$nuevoTotal, $clienteExistente['id']]);
                } else {
                    $pdo->prepare(
                        "INSERT INTO clientes 
                         (nombre, tipo_documento, numero_documento, telefono, email, direccion, total_compras, ultima_visita, activo)
                         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)"
                    )->execute([
                        $d['cliente_nombre'],
                        $d['tipo_documento'] ?? 'CC',
                        $d['numero_documento'] ?? '',
                        $d['telefono'] ?? '',
                        $d['email'] ?? '',
                        $d['direccion'] ?? '',
                        floatval($d['total'])
                    ]);
                }
            } catch (Exception $e) {
                error_log("Error cliente factura: " . $e->getMessage());
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'id' => $facturaId, 'numero' => $numero]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// DELETE: Anular factura
if ($method === 'DELETE') {
    try {
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido']);
            exit;
        }

        $pdo->prepare("UPDATE facturas SET estado = 'anulada' WHERE id = ?")
            ->execute([$id]);

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