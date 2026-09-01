SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS clients;
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'active',
    plan VARCHAR(100) DEFAULT NULL,
    plan_end DATE DEFAULT NULL,
    photo VARCHAR(255) DEFAULT 'user.png',
    weight FLOAT DEFAULT NULL,
    height FLOAT DEFAULT NULL,
    bmi FLOAT DEFAULT NULL,
    join_date DATE DEFAULT NULL,
    visits INT DEFAULT 0,
    visits_remaining INT DEFAULT NULL,
    direct_access BOOLEAN DEFAULT FALSE,
    password VARCHAR(255) DEFAULT NULL,
    facial_access BOOLEAN DEFAULT TRUE,
    face_descriptor TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO clients (tenant_id, name, email, phone, status, plan, plan_end, weight, height, bmi, join_date, visits, visits_remaining) VALUES 
(1, 'Juan Perez', 'juan@example.com', '555-1111', 'active', 'Mensual', '2026-12-31', 75, 175, 24.5, '2026-01-01', 0, NULL),
(1, 'Maria Lopez', 'maria@example.com', '555-2222', 'active', 'Pospago Tarjeta', '2026-05-31', 60, 160, 23.4, '2026-05-01', 0, 30),
(2, 'Carlos Ruiz', 'carlos@example.com', '555-3333', 'active', 'Mensual', '2026-12-31', 80, 180, 24.7, '2026-02-01', 0, NULL),
(2, 'Ana Diaz', 'ana@example.com', '555-4444', 'active', 'Pospago Tarjeta', '2026-08-31', 65, 165, 23.9, '2026-06-01', 0, 30);
SET FOREIGN_KEY_CHECKS=1;
