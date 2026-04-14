CREATE DATABASE IF NOT EXISTS primitivos_db;
USE primitivos_db;

--TABLA USUSARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    nombre_completo  VARCHAR(100),
    rol              ENUM('admin','empleado') DEFAULT 'admin',
    email            VARCHAR(100),
    activo           BOOLEAN DEFAULT TRUE,
    fecha_creacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso    TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
VALUES ('admin', 'CAMBIAR_CON_SETUP_PASSWORD', 'Administrador', 'admin')
ON DUPLICATE KEY UPDATE username = username;

--TABLA PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    categoria           ENUM('Entradas','Platos','Cócteles','Bebidas','Postres','Otros') NOT NULL,
    precio              DECIMAL(10,2) NOT NULL,
    stock               INT DEFAULT 50,
    estado              ENUM('disponible','agotado') DEFAULT 'disponible',
    descripcion         TEXT,
    imagen_url          VARCHAR(500),
    fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--TABLA MESAS

CREATE TABLE IF NOT EXISTS mesas (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    numero              INT NOT NULL UNIQUE,
    capacidad           INT NOT NULL,
    estado              ENUM('disponible','ocupada','reservada','mantenimiento') DEFAULT 'disponible',
    pedido_actual       INT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO mesas (numero, capacidad, estado) VALUES
(1,2,'disponible'),(2,2,'disponible'),(3,2,'disponible'),(4,2,'disponible'),
(5,4,'disponible'),(6,4,'disponible'),(7,4,'disponible'),(8,4,'disponible'),
(9,6,'disponible'),(10,6,'disponible'),(11,6,'disponible'),(12,6,'disponible')
ON DUPLICATE KEY UPDATE numero = numero;

--TABLA CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL,
    tipo_documento   ENUM('CC','NIT','CE','PAS') DEFAULT 'CC',
    numero_documento VARCHAR(20) UNIQUE,
    telefono         VARCHAR(20),
    email            VARCHAR(100),
    direccion        VARCHAR(200),
    total_compras    DECIMAL(12,2) DEFAULT 0,
    ultima_visita    TIMESTAMP NULL,
    fecha_registro   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo           BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--TABLA PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id          INT,
    cliente_nombre      VARCHAR(100),
    mesa_id             INT,
    total               DECIMAL(10,2) NOT NULL,
    estado              ENUM('pendiente','en-proceso','completado','cancelado') DEFAULT 'pendiente',
    fecha_pedido        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (mesa_id)    REFERENCES mesas(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--TABLA DETALLES DE LOS PEDIDOS 
CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id        INT NOT NULL,
    producto_id      INT NOT NULL,
    producto_nombre  VARCHAR(100),
    cantidad         INT NOT NULL,
    precio_unitario  DECIMAL(10,2) NOT NULL,
    subtotal         DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--TABLA RESERVAS JUEGOS
CREATE TABLE IF NOT EXISTS reservas_juegos (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id     INT,
    cliente_nombre VARCHAR(100),
    telefono       VARCHAR(20),
    juego          ENUM('Billares','Futbolín','Bolos','Ping Pong') NOT NULL,
    fecha          DATE NOT NULL,
    hora           TIME NOT NULL,
    duracion       INT NOT NULL,
    personas       INT DEFAULT 2,
    precio_hora    DECIMAL(10,2) NOT NULL,
    total          DECIMAL(10,2) GENERATED ALWAYS AS (precio_hora * duracion) STORED,
    estado         ENUM('confirmada','completada','cancelada') DEFAULT 'confirmada',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--TABLA FACTURAS
CREATE TABLE IF NOT EXISTS facturas (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    numero_factura   VARCHAR(20) UNIQUE NOT NULL,
    cliente_id       INT,
    tipo_documento   ENUM('CC','NIT','CE','PAS') DEFAULT 'CC',
    numero_documento VARCHAR(20),
    cliente_nombre   VARCHAR(100),
    email            VARCHAR(100),
    telefono         VARCHAR(20),
    direccion        VARCHAR(200),
    subtotal         DECIMAL(10,2) NOT NULL,
    iva              DECIMAL(10,2) NOT NULL,
    total            DECIMAL(10,2) NOT NULL,
    cufe             VARCHAR(60) UNIQUE NOT NULL,
    resolucion_dian  VARCHAR(30),
    estado           ENUM('generada','pagada','anulada') DEFAULT 'generada',
    fecha_emision    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- TABLA: DETALLE_FACTURAS
CREATE TABLE IF NOT EXISTS detalle_facturas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    factura_id    INT NOT NULL,
    descripcion   VARCHAR(200) NOT NULL,
    cantidad      INT NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    subtotal      DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * valor_unitario) STORED,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- TABLA: CONFIGURACION
CREATE TABLE IF NOT EXISTS configuracion (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    clave               VARCHAR(50) UNIQUE NOT NULL,
    valor               TEXT NOT NULL,
    descripcion         VARCHAR(200),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO configuracion (clave, valor, descripcion) VALUES
('razon_social',     'Primitivos Restaurante Bar SAS',  'Razón social'),
('nit',              '901.234.567-8',                   'NIT del establecimiento'),
('resolucion_dian',  '18740012345678',                  'Resolución DIAN'),
('iva_porcentaje',   '19',                              'Porcentaje de IVA'),
('retencion_fuente', '2.5',                             'Retención en la fuente'),
('direccion',        'Centro Comercial Multiplaza, Bogotá', 'Dirección'),
('telefono',         '300 750 9970',                    'Teléfono de contacto')
ON DUPLICATE KEY UPDATE clave = clave;


-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha    ON pedidos(fecha_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado   ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente  ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha   ON reservas_juegos(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha   ON facturas(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_productos_cat    ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_clientes_doc     ON clientes(numero_documento);