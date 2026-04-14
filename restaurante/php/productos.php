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

// GET: Listar productos
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM productos ORDER BY categoria, nombre");
        $productos = $stmt->fetchAll();
        echo json_encode($productos);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// POST: Crear producto
if ($method === 'POST') {
    try {
        $input = file_get_contents('php://input');
        $d = json_decode($input, true);
        
        if (!$d) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON inválido']);
            exit;
        }
        
        // Validar campos requeridos
        if (empty($d['nombre'])) {
            http_response_code(400);
            echo json_encode(['error' => 'El nombre del producto es requerido']);
            exit;
        }
        
        if (empty($d['categoria'])) {
            http_response_code(400);
            echo json_encode(['error' => 'La categoría es requerida']);
            exit;
        }
        
        if (!isset($d['precio']) || !is_numeric($d['precio'])) {
            http_response_code(400);
            echo json_encode(['error' => 'El precio debe ser un número válido']);
            exit;
        }

        // Manejar imagen base64 → guardar como archivo
        $imagenUrl = $d['imagen_url'] ?? '';
        
        if (!empty($imagenUrl) && strpos($imagenUrl, 'data:image') === 0) {
            // Es base64, convertir a archivo
            $parts = explode(',', $imagenUrl);
            if (count($parts) === 2) {
                $data = base64_decode($parts[1]);
                $uploadDir = __DIR__ . '/../img/productos/';
                
                // Crear directorio si no existe
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                // Determinar extensión
                $mime = explode(':', explode(';', $parts[0])[0])[1];
                $ext = 'png';
                if ($mime === 'image/jpeg') $ext = 'jpg';
                if ($mime === 'image/gif') $ext = 'gif';
                if ($mime === 'image/webp') $ext = 'webp';
                
                $fileName = 'prod_' . uniqid() . '.' . $ext;
                $filePath = $uploadDir . $fileName;
                
                if (file_put_contents($filePath, $data)) {
                    $imagenUrl = '/restaurante/img/productos/' . $fileName;
                }
            }
        }

        $stmt = $pdo->prepare(
            "INSERT INTO productos (nombre, categoria, precio, stock, estado, descripcion, imagen_url)
             VALUES (:nombre, :categoria, :precio, :stock, :estado, :descripcion, :imagen_url)"
        );
        
        $resultado = $stmt->execute([
            ':nombre' => $d['nombre'],
            ':categoria' => $d['categoria'],
            ':precio' => floatval($d['precio']),
            ':stock' => intval($d['stock'] ?? 50),
            ':estado' => $d['estado'] ?? 'disponible',
            ':descripcion' => $d['descripcion'] ?? '',
            ':imagen_url' => $imagenUrl
        ]);

        if ($resultado) {
            echo json_encode([
                'success' => true, 
                'id' => (int)$pdo->lastInsertId(),
                'message' => 'Producto creado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo crear el producto']);
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear: ' . $e->getMessage()]);
    }
    exit;
}

// PUT: Actualizar producto
if ($method === 'PUT') {
    try {
        $input = file_get_contents('php://input');
        $d = json_decode($input, true);
        $id = $_GET['id'] ?? $d['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de producto inválido']);
            exit;
        }

        // Verificar que el producto existe
        $check = $pdo->prepare("SELECT id FROM productos WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado']);
            exit;
        }

        // Manejar imagen base64 → guardar como archivo
        $imagenUrl = $d['imagen_url'] ?? '';
        
        if (!empty($imagenUrl) && strpos($imagenUrl, 'data:image') === 0) {
            $parts = explode(',', $imagenUrl);
            if (count($parts) === 2) {
                $data = base64_decode($parts[1]);
                $uploadDir = __DIR__ . '/../img/productos/';
                
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                $mime = explode(':', explode(';', $parts[0])[0])[1];
                $ext = 'png';
                if ($mime === 'image/jpeg') $ext = 'jpg';
                if ($mime === 'image/gif') $ext = 'gif';
                if ($mime === 'image/webp') $ext = 'webp';
                
                $fileName = 'prod_' . uniqid() . '.' . $ext;
                $filePath = $uploadDir . $fileName;
                
                if (file_put_contents($filePath, $data)) {
                    $imagenUrl = '/restaurante/img/productos/' . $fileName;
                }
            }
        }

        $stmt = $pdo->prepare(
            "UPDATE productos 
             SET nombre = :nombre, 
                 categoria = :categoria, 
                 precio = :precio, 
                 stock = :stock, 
                 estado = :estado, 
                 descripcion = :descripcion, 
                 imagen_url = :imagen_url 
             WHERE id = :id"
        );
        
        $resultado = $stmt->execute([
            ':id' => intval($id),
            ':nombre' => $d['nombre'],
            ':categoria' => $d['categoria'],
            ':precio' => floatval($d['precio']),
            ':stock' => intval($d['stock'] ?? 50),
            ':estado' => $d['estado'] ?? 'disponible',
            ':descripcion' => $d['descripcion'] ?? '',
            ':imagen_url' => $imagenUrl
        ]);

        echo json_encode([
            'success' => $resultado,
            'message' => $resultado ? 'Producto actualizado' : 'No se pudo actualizar'
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar: ' . $e->getMessage()]);
    }
    exit;
}

// DELETE: Eliminar producto
if ($method === 'DELETE') {
    try {
        $id = $_GET['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM productos WHERE id = ?");
        $resultado = $stmt->execute([intval($id)]);

        echo json_encode([
            'success' => $resultado,
            'message' => $resultado ? 'Producto eliminado' : 'No se pudo eliminar'
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>