-- Columnas que usa la vista de Inventario > Equipos (tipo, cantidad, ubicación, notas)
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS `type` VARCHAR(50) DEFAULT 'Máquina' AFTER `name`,
  ADD COLUMN IF NOT EXISTS `quantity` INT NOT NULL DEFAULT 1 AFTER `type`,
  ADD COLUMN IF NOT EXISTS `location` VARCHAR(255) DEFAULT NULL AFTER `quantity`,
  ADD COLUMN IF NOT EXISTS `notes` TEXT DEFAULT NULL AFTER `location`;
