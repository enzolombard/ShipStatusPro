-- Add order_type column to shipment_classification table
USE ShipStatusPro;

-- Check if order_type column exists and add it if it doesn't
SET @columnExists = 0;
SELECT COUNT(*) INTO @columnExists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ShipStatusPro' AND TABLE_NAME = 'shipment_classification' AND COLUMN_NAME = 'order_type';

-- Add the column only if it doesn't exist
SET @sql = IF(@columnExists = 0, 'ALTER TABLE shipment_classification ADD COLUMN order_type VARCHAR(50) DEFAULT NULL', 'SELECT "Column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE shipment_classification;

-- Show sample data
SELECT ack_number, classification, order_type FROM shipment_classification LIMIT 5;
