-- Create activity_log table for tracking user actions and system changes
CREATE TABLE IF NOT EXISTS `ShipStatusPro`.`activity_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_type` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `ack_number` VARCHAR(20) DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT NULL,
  `old_value` TEXT DEFAULT NULL,
  `new_value` TEXT DEFAULT NULL,
  `table_name` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_activity_type` (`activity_type`),
  INDEX `idx_ack_number` (`ack_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert some sample data for testing
INSERT INTO `ShipStatusPro`.`activity_log` 
(`activity_type`, `description`, `ack_number`, `user_name`, `old_value`, `new_value`, `table_name`) 
VALUES 
('status_change', 'Order status changed from "In Progress" to "Completed"', 'ACK12345', 'System', 'In Progress', 'Completed', 'shipment_classification'),
('comment_added', 'Comment added to order', 'ACK67890', 'Admin', NULL, 'Customer requested expedited shipping', 'shipment_classification'),
('new_job_submitted', 'New job submitted from RMA module', 'ACK54321', 'Admin', NULL, 'Traffic Cabinet order', 'new_jobs'),
('order_type_changed', 'Order type updated', 'ACK98765', 'Admin', 'Recent', 'Traffic Cabinet', 'shipment_classification'),
('job_moved', 'Job moved from New Jobs to Current Jobs', 'ACK24680', 'Admin', 'new_jobs', 'current_jobs', 'system');
