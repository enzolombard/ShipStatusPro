-- Check if order_comments table exists and has data
USE ShipStatusPro;

-- Show all tables in ShipStatusPro database
SHOW TABLES;

-- Check if order_comments table exists
DESCRIBE order_comments;

-- Show all comments in order_comments table
SELECT * FROM order_comments ORDER BY created_at DESC LIMIT 10;

-- Check for any comments with specific ACK numbers
SELECT ack_number, comment_text, created_at, created_by 
FROM order_comments 
WHERE ack_number LIKE 'ACK%' 
ORDER BY created_at DESC 
LIMIT 20;
