-- Create order_comments table for storing user comments separately from classification
CREATE TABLE IF NOT EXISTS `ShipStatusPro`.`order_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ack_number` VARCHAR(50) NOT NULL,
  `comment_text` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100) DEFAULT 'system',
  INDEX `idx_ack_number` (`ack_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create order_types table for storing order type selections
CREATE TABLE IF NOT EXISTS `ShipStatusPro`.`order_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ack_number` VARCHAR(50) NOT NULL UNIQUE,
  `order_type` ENUM('Standard', 'Rush', 'Emergency', 'Warranty', 'Return') DEFAULT 'Standard',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ack_number` (`ack_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
