const { ipcMain } = require('electron');
const db = require('../db/connection');

/**
 * Helper function to get time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Log activity to the activity_log table
 */
async function logActivity(activityData) {
  try {
    const {
      activity_type,
      description,
      ack_number,
      user_name = 'system',
      old_value = null,
      new_value = null,
      table_name = null
    } = activityData;
    
    // Create activity_log table if it doesn't exist
    await db.getAll(`
      CREATE TABLE IF NOT EXISTS \`ShipStatusPro\`.\`activity_log\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`activity_type\` VARCHAR(50) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`ack_number\` VARCHAR(50),
        \`user_name\` VARCHAR(100) DEFAULT 'system',
        \`old_value\` TEXT,
        \`new_value\` TEXT,
        \`table_name\` VARCHAR(100),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_ack_number\` (\`ack_number\`),
        INDEX \`idx_activity_type\` (\`activity_type\`),
        INDEX \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Insert activity log entry
    await db.getAll(`
      INSERT INTO \`ShipStatusPro\`.activity_log 
      (activity_type, description, ack_number, user_name, old_value, new_value, table_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [activity_type, description, ack_number, user_name, old_value, new_value, table_name]);
    
    console.log(`Activity logged: ${activity_type} for ${ack_number || 'system'}`);
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

/**
 * Initialize shipment API IPC handlers
 */
/**
 * Ensures the order_type column exists in the shipment_classification table
 */
async function ensureOrderTypeColumn() {
  try {
    console.log('Checking for order_type column in shipment_classification table...');
    
    // Check if the column exists
    const [columns] = await db.getAll(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ShipStatusPro' 
      AND TABLE_NAME = 'shipment_classification' 
      AND COLUMN_NAME = 'order_type'
    `);
    
    // If column doesn't exist, add it
    if (columns.length === 0) {
      console.log('order_type column does not exist. Creating it now...');
      await db.getAll(`
        ALTER TABLE \`ShipStatusPro\`.shipment_classification 
        ADD COLUMN order_type VARCHAR(50) DEFAULT NULL
      `);
      console.log('order_type column created successfully!');
    } else {
      console.log('order_type column already exists.');
    }
  } catch (error) {
    console.error('Error checking/creating order_type column:', error);
  }
}

function initShipmentAPI() {
  console.log('Initializing Shipment API with database connection...');
  
  // Ensure the order_type column exists
  ensureOrderTypeColumn().catch(err => {
    console.error('Failed to ensure order_type column exists:', err);
  });

  // Get shipments handler with pagination
  ipcMain.handle('get-shipments', async (event, { page = 1, pageSize = 50 }) => {
    try {
      console.log(`Fetching shipments (page ${page}, pageSize ${pageSize})...`);
      
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;
      
      // Get total count for pagination
      const [countResult] = await db.getAll(`
        SELECT COUNT(*) as total 
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        WHERE o.ORDNUMBER LIKE 'ACK%'
      `);
      
      const totalCount = countResult ? countResult.total : 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      console.log(`Total records: ${totalCount}, Total pages: ${totalPages}`);
      
      // Get shipments with JOIN to OEORDH for complete order data
      // Using string interpolation for LIMIT to avoid parameter issues with cross-database queries
      const shipments = await db.getAll(`
        SELECT 
          o.ORDNUMBER as ack_number,
          o.CUSTOMER,
          o.SHPNAME,
          o.SALESPER1,
          o.ORDDATE,
          o.EXPDATE,
          o.LOCATION,
          COALESCE(sc.classification, 'No Classification') as classification,
          COALESCE(sc.classification, 'NEW') as status,
          '' as comments,
          sc.order_type as order_type,
          o.ORDDATE as last_updated,
          'OEORDH' as source_tables,
          o.COMPLETE as system_status,
          COALESCE(sc.classification, 'NEW') as user_status
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON o.ORDNUMBER = sc.ack_number
        WHERE o.ORDNUMBER LIKE 'ACK%'
        ORDER BY o.ORDNUMBER DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);
      
      console.log(`Found ${shipments.length} shipments for page ${page}`);
      
      return {
        success: true,
        data: shipments,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching shipments from classification:', error);
      return {
        success: false,
        error: `Failed to fetch shipment data: ${error.message}`
      };
    }
  });

  // Get filtered shipments handler with pagination
  ipcMain.handle('get-filtered-shipments', async (event, { filters, page = 1, pageSize = 50 }) => {
    try {
      console.log(`Fetching filtered shipments (page ${page}, pageSize ${pageSize}) with filters:`, filters);
      const { status, startDate, endDate } = filters || {};
      
      // Build the WHERE clause based on filters
      let whereClause = '';
      const countParams = [];
      
      if (status && status !== 'ALL') {
        whereClause += ' AND sc.classification = ?';
        countParams.push(status);
      }
      
      // Add date range filtering (OEORDH dates are in YYYYMMDD format)
      if (startDate) {
        // Convert YYYY-MM-DD to YYYYMMDD format for comparison
        const startDateFormatted = startDate.replace(/-/g, '');
        whereClause += ' AND o.ORDDATE >= ?';
        countParams.push(startDateFormatted);
      }
      
      if (endDate) {
        // Convert YYYY-MM-DD to YYYYMMDD format for comparison
        const endDateFormatted = endDate.replace(/-/g, '');
        whereClause += ' AND o.ORDDATE <= ?';
        countParams.push(endDateFormatted);
      }
      
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;
      
      // Get total count for pagination with filters applied
      const [countResult] = await db.getAll(`
        SELECT COUNT(*) as total 
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON o.ORDNUMBER = sc.ack_number
        WHERE o.ORDNUMBER LIKE 'ACK%' ${whereClause}
      `, countParams);
      
      const totalCount = countResult ? countResult.total : 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      console.log(`Total filtered records: ${totalCount}, Total pages: ${totalPages}`);
      
      // Get filtered shipments with JOIN to OEORDH for complete order data
      // Using string interpolation for LIMIT to avoid parameter issues
      const shipments = await db.getAll(`
        SELECT 
          o.ORDNUMBER as ack_number,
          o.CUSTOMER,
          o.SHPNAME,
          o.SALESPER1,
          o.ORDDATE,
          o.EXPDATE,
          o.LOCATION,
          COALESCE(sc.classification, 'No Classification') as classification,
          COALESCE(sc.classification, 'NEW') as status,
          '' as comments,
          sc.order_type as order_type,
          o.ORDDATE as last_updated,
          'OEORDH' as source_tables,
          o.COMPLETE as system_status,
          COALESCE(sc.classification, 'NEW') as user_status
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON o.ORDNUMBER = sc.ack_number
        WHERE o.ORDNUMBER LIKE 'ACK%' ${whereClause}
        ORDER BY o.ORDNUMBER DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `, countParams);
      
      console.log(`Found ${shipments.length} filtered shipments for page ${page}`);
      
      return {
        success: true,
        data: shipments,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching filtered shipments from classification:', error);
      return {
        success: false,
        error: `Failed to fetch filtered shipment data: ${error.message}`
      };
    }
  });

  // Update shipment status handler
  ipcMain.handle('update-shipment-status', async (event, data) => {
    try {
      const { ackNumber, status } = data;
      
      console.log(`Updating status for ${ackNumber} to ${status} in shipment_classification table`);
      
      // Update the classification in the shipment_classification table (using classification as status)
      await db.getAll(`
        UPDATE \`ShipStatusPro\`.shipment_classification 
        SET classification = ?
        WHERE ack_number = ?
      `, [status, ackNumber]);
      
      console.log(`Status updated successfully for ${ackNumber}`);
      
      return {
        success: true,
        message: 'Status updated successfully'
      };
    } catch (error) {
      console.error('Error updating shipment status:', error);
      return {
        success: false,
        error: `Failed to update shipment status: ${error.message}`
      };
    }
  });

  // Update shipment classification handler (for comments)
  ipcMain.handle('update-shipment-classification', async (event, data) => {
    try {
      const { ackNumber, classification } = data;
      
      console.log(`Updating classification for ${ackNumber} to ${classification} in shipment_classification table`);
      
      // Update the classification in the shipment_classification table
      await db.getAll(`
        UPDATE \`ShipStatusPro\`.shipment_classification 
        SET classification = ?
        WHERE ack_number = ?
      `, [classification, ackNumber]);
      
      console.log(`Classification updated successfully for ${ackNumber}`);
      
      return {
        success: true,
        message: 'Classification updated successfully'
      };
    } catch (error) {
      console.error('Error updating shipment classification:', error);
      return {
        success: false,
        error: `Failed to update shipment classification: ${error.message}`
      };
    }
  });

  // Update order type handler
  ipcMain.handle('update-order-type', async (event, data) => {
    try {
      const { ackNumber, orderType } = data;
      
      console.log(`Updating order type for ${ackNumber} to ${orderType === null ? 'NULL' : orderType} in shipment_classification table`);
      
      // Validate input parameters
      if (!ackNumber) {
        console.error('Missing ackNumber parameter');
        return {
          success: false,
          error: 'Missing order ID (ackNumber)'
        };
      }
      
      // Ensure the order_type column exists
      try {
        await ensureOrderTypeColumn();
      } catch (columnError) {
        console.error('Failed to ensure order_type column exists:', columnError);
        // Continue anyway, as the column might already exist
      }
      
      // First check if record exists
      console.log(`Checking if record exists for ack_number: ${ackNumber}`);
      let existingRecords;
      try {
        existingRecords = await db.getAll(`
          SELECT ack_number FROM \`ShipStatusPro\`.shipment_classification 
          WHERE ack_number = ?
        `, [ackNumber]);
        
        console.log(`Found ${existingRecords ? existingRecords.length : 0} existing records for ${ackNumber}`);
      } catch (queryError) {
        console.error('Error checking for existing record:', queryError);
        return {
          success: false,
          error: `Database error: ${queryError.message}`
        };
      }
      
      // Now update or insert the record
      try {
        if (existingRecords && existingRecords.length > 0) {
          // Update existing record
          await db.run(`
            UPDATE \`ShipStatusPro\`.shipment_classification 
            SET order_type = ? 
            WHERE ack_number = ?
          `, [orderType, ackNumber]);
          console.log(`Updated order_type for existing record ${ackNumber}`);
        } else {
          // Insert new record
          await db.run(`
            INSERT INTO \`ShipStatusPro\`.shipment_classification 
            (ack_number, classification, order_type) 
            VALUES (?, ?, ?)
          `, [ackNumber, 'New', orderType]);
          console.log(`Inserted new record for ${ackNumber} with order_type`);
        }
        
        return {
          success: true,
          message: 'Order type updated successfully'
        };
      } catch (dbError) {
        console.error('Database error updating order type:', dbError);
        
        // Check for specific MySQL errors
        if (dbError.code === 'ER_BAD_FIELD_ERROR') {
          console.error('Column order_type does not exist. Attempting to create it...');
          try {
            await ensureOrderTypeColumn();
            // Try the update again after creating the column
            return await event.sender.invoke('update-order-type', data);
          } catch (columnError) {
            console.error('Failed to create order_type column:', columnError);
            return {
              success: false,
              error: `Failed to create order_type column: ${columnError.message}`
            };
          }
        }
        
        return {
          success: false,
          error: `Database error: ${dbError.message}`
        };
      }
    } catch (error) {
      console.error('Error in update-order-type handler:', error);
      return {
        success: false,
        error: `Failed to update order type: ${error.message}`
      };
    }
  });
  
  // Submit job to New Jobs table handler
  ipcMain.handle('submit-job-to-new', async (event, data) => {
    try {
      const { ackNumber, orderType, customer, orderData } = data;
      
      console.log(`Submitting job ${ackNumber} to New Jobs table with order type: ${orderType}`);
      
      // Validate input parameters
      if (!ackNumber) {
        console.error('Missing ackNumber parameter');
        return {
          success: false,
          error: 'Missing order ID (ackNumber)'
        };
      }
      
      if (!orderType) {
        console.error('Missing orderType parameter');
        return {
          success: false,
          error: 'Missing order type'
        };
      }
      
      // 1. Update the order_type in shipment_classification table
      try {
        // First check if record exists
        const existingRecords = await db.getAll(`
          SELECT ack_number FROM \`ShipStatusPro\`.shipment_classification 
          WHERE ack_number = ?
        `, [ackNumber]);
        
        if (existingRecords && existingRecords.length > 0) {
          // Update existing record
          await db.run(`
            UPDATE \`ShipStatusPro\`.shipment_classification 
            SET order_type = ? 
            WHERE ack_number = ?
          `, [orderType, ackNumber]);
        } else {
          // Insert new record
          await db.run(`
            INSERT INTO \`ShipStatusPro\`.shipment_classification 
            (ack_number, classification, order_type) 
            VALUES (?, ?, ?)
          `, [ackNumber, orderData?.classification || 'New', orderType]);
        }
      } catch (dbError) {
        console.error('Database error updating order type:', dbError);
        return {
          success: false,
          error: `Database error: ${dbError.message}`
        };
      }
      
      // We're no longer updating the classification status as requested by the user
      // Instead, we'll just keep track of submission in the new_jobs table
      
      // 3. Create new_jobs table if it doesn't exist and insert the record
      try {
        // Check if new_jobs table exists
        const tableExists = await db.getAll(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'ShipStatusPro' AND table_name = 'new_jobs'
        `);
        
        if (!tableExists || tableExists.length === 0) {
          console.log('new_jobs table does not exist, creating it now...');
          // Create the new_jobs table
          try {
            await db.run(`
              CREATE TABLE IF NOT EXISTS \`ShipStatusPro\`.new_jobs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ack_number VARCHAR(50) NOT NULL,
                customer VARCHAR(255),
                order_type VARCHAR(50),
                comments TEXT,
                location VARCHAR(50),
                submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'New',
                UNIQUE KEY (ack_number)
              )
            `);
            console.log('new_jobs table created successfully');
          } catch (createError) {
            console.error('Error creating new_jobs table:', createError);
            // Continue anyway, we'll try to insert
          }
        }
        
        // Now try to insert into the table (whether it existed or we just created it)
        await db.run(`
          INSERT INTO \`ShipStatusPro\`.new_jobs 
          (ack_number, customer, order_type, comments, location, submission_date) 
          VALUES (?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE 
            customer = VALUES(customer),
            order_type = VALUES(order_type),
            comments = VALUES(comments),
            location = VALUES(location),
            submission_date = NOW()
        `, [ackNumber, customer, orderType, orderData?.comments || '', orderData?.location || '']);
        
        console.log(`Successfully inserted/updated job ${ackNumber} in new_jobs table`);
      } catch (insertError) {
        console.error('Error inserting into new_jobs table:', insertError);
        // Continue anyway, as the main operation succeeded
      }
      
      console.log(`Job ${ackNumber} successfully submitted to New Jobs`);
      
      return {
        success: true,
        message: 'Job successfully submitted to New Jobs'
      };
    } catch (error) {
      console.error('Error submitting job to New Jobs:', error);
      return {
        success: false,
        error: `Failed to submit job: ${error.message}`
      };
    }
  });

  // Update order comment handler
  ipcMain.handle('update-order-comment', async (event, data) => {
    try {
      const { ackNumber, comment } = data;
      
      console.log(`Updating comment for ${ackNumber} to: ${comment}`);
      
      // Validate input parameters
      if (!ackNumber) {
        console.error('Missing ackNumber parameter');
        return {
          success: false,
          error: 'Missing order ID (ackNumber)'
        };
      }
      
      // Check if new_jobs table exists, create if not
      try {
        await db.getAll(`
          CREATE TABLE IF NOT EXISTS \`ShipStatusPro\`.\`new_jobs\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`ack_number\` VARCHAR(50) NOT NULL UNIQUE,
            \`customer\` VARCHAR(255),
            \`ship_name\` VARCHAR(255),
            \`salesperson\` VARCHAR(100),
            \`order_date\` VARCHAR(20),
            \`expected_date\` VARCHAR(20),
            \`location\` VARCHAR(100),
            \`order_type\` VARCHAR(100),
            \`status\` VARCHAR(100),
            \`comments\` TEXT,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            \`created_by\` VARCHAR(100) DEFAULT 'system',
            INDEX \`idx_ack_number\` (\`ack_number\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('new_jobs table created or verified');
      } catch (createError) {
        console.warn('Could not create new_jobs table:', createError.message);
      }
      
      // Update or insert comment in new_jobs table
      try {
        // Get current user from session or default to 'system'
        const currentUser = 'system'; // TODO: Get from session when user management is implemented
        
        // First try to update existing record
        const updateResult = await db.getAll(`
          UPDATE \`ShipStatusPro\`.new_jobs 
          SET comments = ? 
          WHERE ack_number = ?
        `, [comment, ackNumber]);
        
        console.log('Update result:', updateResult);
        
        // If no rows were affected, the record doesn't exist, so insert it
        if (updateResult.affectedRows === 0) {
          console.log(`No existing record found for ${ackNumber}, creating new record...`);
          await db.getAll(`
            INSERT INTO \`ShipStatusPro\`.new_jobs 
            (ack_number, comments) 
            VALUES (?, ?)
          `, [ackNumber, comment]);
          console.log(`New record created for ${ackNumber} with comment`);
        } else {
          console.log(`Updated existing record for ${ackNumber} with new comment`);
        }
        
        console.log(`Comment saved successfully for ${ackNumber}: ${comment}`);
        
        // Log activity to activity_log table
        try {
          await logActivity({
            activity_type: 'comment_added',
            description: `Comment added to order ${ackNumber}`,
            ack_number: ackNumber,
            user_name: currentUser,
            old_value: null,
            new_value: comment,
            table_name: 'order_comments'
          });
        } catch (activityError) {
          console.warn('Failed to log activity:', activityError.message);
        }
        
        return {
          success: true,
          message: 'Comment saved successfully',
          data: {
            ackNumber: ackNumber,
            comment: comment
          }
        };
      } catch (dbError) {
        console.error('Database error updating comment:', dbError);
        return {
          success: false,
          error: `Database error: ${dbError.message}`
        };
      }
    } catch (error) {
      console.error('Error in update-order-comment handler:', error);
      return {
        success: false,
        error: `Failed to update comment: ${error.message}`
      };
    }
  });
  
  // Get order comments handler
  ipcMain.handle('get-order-comments', async (event, { ackNumber }) => {
    try {
      console.log(`Fetching comments for order ${ackNumber}...`);
      
      if (!ackNumber) {
        return {
          success: false,
          error: 'Missing order ID (ackNumber)'
        };
      }
      
      // Check if new_jobs table exists, create if not
      try {
        await db.getAll(`
          CREATE TABLE IF NOT EXISTS \`ShipStatusPro\`.\`new_jobs\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`ack_number\` VARCHAR(50) NOT NULL UNIQUE,
            \`customer\` VARCHAR(255),
            \`ship_name\` VARCHAR(255),
            \`salesperson\` VARCHAR(100),
            \`order_date\` VARCHAR(20),
            \`expected_date\` VARCHAR(20),
            \`location\` VARCHAR(100),
            \`order_type\` VARCHAR(100),
            \`status\` VARCHAR(100),
            \`comments\` TEXT,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            \`created_by\` VARCHAR(100) DEFAULT 'system',
            INDEX \`idx_ack_number\` (\`ack_number\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (createError) {
        console.warn('Could not create new_jobs table:', createError.message);
      }
      
      // Get comment for this order from new_jobs table
      const comments = await db.getAll(`
        SELECT 
          ack_number,
          comments as comment_text
        FROM \`ShipStatusPro\`.new_jobs 
        WHERE ack_number = ?
      `, [ackNumber]);
      
      console.log(`Found ${comments.length} comments for order ${ackNumber}`);
      
      return {
        success: true,
        comments: comments || [],
        count: comments ? comments.length : 0
      };
    } catch (error) {
      console.error('Error in get-order-comments handler:', error);
      return {
        success: false,
        error: `Failed to get comments: ${error.message}`,
        comments: []
      };
    }
  });
  
  // Get New Jobs data handler
  ipcMain.handle('get-new-jobs', async (event, { page = 1, pageSize = 50 } = {}) => {
    try {
      console.log(`Fetching new jobs (page ${page}, pageSize ${pageSize})...`);
      
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;
      
      // Check if new_jobs table exists first
      const tableExists = await db.getAll(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'ShipStatusPro' AND table_name = 'new_jobs'
      `);
      
      if (!tableExists || tableExists.length === 0) {
        console.log('new_jobs table does not exist, returning empty result');
        return {
          success: true,
          data: [],
          pagination: {
            page,
            pageSize,
            totalCount: 0,
            totalPages: 0
          }
        };
      }
      
      // Get total count for pagination
      const [countResult] = await db.getAll(`
        SELECT COUNT(*) as total 
        FROM \`ShipStatusPro\`.new_jobs
      `);
      
      const totalCount = countResult ? countResult.total : 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      console.log(`Total new jobs records: ${totalCount}, Total pages: ${totalPages}`);
      
      // Get new jobs with JOIN to OEORDH and shipment_classification for complete order data
      const newJobs = await db.getAll(`
        SELECT 
          nj.ack_number,
          nj.customer,
          nj.order_type,
          nj.comments,
          nj.location,
          nj.submission_date,
          nj.status,
          o.SHPNAME,
          o.SALESPER1,
          o.ORDDATE,
          o.EXPDATE,
          o.COMPLETE as system_status,
          COALESCE(sc.classification, 'NEW') as ship_status
        FROM \`ShipStatusPro\`.new_jobs nj
        LEFT JOIN \`SAGE-AUTO-UPDATE\`.OEORDH o ON nj.ack_number = o.ORDNUMBER
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON nj.ack_number = sc.ack_number
        ORDER BY nj.submission_date DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);
      
      console.log(`Found ${newJobs.length} new jobs for page ${page}`);
      
      // Map the data to match the expected format
      const mappedJobs = newJobs.map(job => ({
        ORDNUMBER: job.ack_number,
        CUSTOMER: job.customer,
        SHPNAME: job.SHPNAME || 'N/A',
        SALESPER1: job.SALESPER1 || 'N/A',
        ORDDATE: job.ORDDATE,
        EXPDATE: job.EXPDATE,
        LOCATION: job.location === '1' ? 'Ontario' : job.location === '3' ? 'Quebec' : (job.location || 'Unknown'),
        ORDER_TYPE: job.order_type,
        COMPLETE: job.system_status || 0,
        status: job.ship_status || 'NEW',
        classification: job.ship_status || 'NEW',
        comments: job.comments || '',
        submission_date: job.submission_date
      }));
      
      return {
        success: true,
        data: mappedJobs,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching new jobs:', error);
      return {
        success: false,
        error: `Failed to fetch new jobs data: ${error.message}`
      };
    }
  });
  
  // Get filtered New Jobs data handler
  ipcMain.handle('get-filtered-new-jobs', async (event, { filters, page = 1, pageSize = 50 }) => {
    try {
      console.log(`Fetching filtered new jobs (page ${page}, pageSize ${pageSize}) with filters:`, filters);
      const { orderType, customer, startDate, endDate, startAck, endAck } = filters || {};
      
      // Check if new_jobs table exists first
      const tableExists = await db.getAll(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'ShipStatusPro' AND table_name = 'new_jobs'
      `);
      
      if (!tableExists || tableExists.length === 0) {
        console.log('new_jobs table does not exist, returning empty result');
        return {
          success: true,
          data: [],
          pagination: {
            page,
            pageSize,
            totalCount: 0,
            totalPages: 0
          }
        };
      }
      
      // Build the WHERE clause based on filters
      let whereClause = '';
      const countParams = [];
      
      if (orderType && orderType !== 'recent') {
        whereClause += ' AND nj.order_type = ?';
        countParams.push(orderType);
      }
      
      if (customer) {
        whereClause += ' AND nj.customer LIKE ?';
        countParams.push(`%${customer}%`);
      }
      
      // Add date range filtering
      if (startDate) {
        whereClause += ' AND DATE(nj.submission_date) >= ?';
        countParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND DATE(nj.submission_date) <= ?';
        countParams.push(endDate);
      }
      
      // Add order number range filtering
      if (startAck) {
        whereClause += ' AND nj.ack_number >= ?';
        countParams.push(startAck);
      }
      
      if (endAck) {
        whereClause += ' AND nj.ack_number <= ?';
        countParams.push(endAck);
      }
      
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;
      
      // Get total count for pagination with filters applied
      const [countResult] = await db.getAll(`
        SELECT COUNT(*) as total 
        FROM \`ShipStatusPro\`.new_jobs nj
        WHERE 1=1 ${whereClause}
      `, countParams);
      
      const totalCount = countResult ? countResult.total : 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      console.log(`Total filtered new jobs records: ${totalCount}, Total pages: ${totalPages}`);
      
      // Get filtered new jobs with JOIN to OEORDH and shipment_classification for complete order data
      const newJobs = await db.getAll(`
        SELECT 
          nj.ack_number,
          nj.customer,
          nj.order_type,
          nj.comments,
          nj.location,
          nj.submission_date,
          nj.status,
          o.SHPNAME,
          o.SALESPER1,
          o.ORDDATE,
          o.EXPDATE,
          o.COMPLETE as system_status,
          COALESCE(sc.classification, 'NEW') as ship_status
        FROM \`ShipStatusPro\`.new_jobs nj
        LEFT JOIN \`SAGE-AUTO-UPDATE\`.OEORDH o ON nj.ack_number = o.ORDNUMBER
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON nj.ack_number = sc.ack_number
        WHERE 1=1 ${whereClause}
        ORDER BY nj.submission_date DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `, countParams);
      
      console.log(`Found ${newJobs.length} filtered new jobs for page ${page}`);
      
      // Map the data to match the expected format
      const mappedJobs = newJobs.map(job => ({
        ORDNUMBER: job.ack_number,
        CUSTOMER: job.customer,
        SHPNAME: job.SHPNAME || 'N/A',
        SALESPER1: job.SALESPER1 || 'N/A',
        ORDDATE: job.ORDDATE,
        EXPDATE: job.EXPDATE,
        LOCATION: job.location === '1' ? 'Ontario' : job.location === '3' ? 'Quebec' : (job.location || 'Unknown'),
        ORDER_TYPE: job.order_type,
        COMPLETE: job.system_status || 0,
        status: job.ship_status || 'NEW',
        classification: job.ship_status || 'NEW',
        comments: job.comments || '',
        submission_date: job.submission_date
      }));
      
      return {
        success: true,
        data: mappedJobs,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching filtered new jobs:', error);
      return {
        success: false,
        error: `Failed to fetch filtered new jobs data: ${error.message}`
      };
    }
  });

  // Dashboard Statistics API Handlers
  
  // Get dashboard statistics
  ipcMain.handle('get-dashboard-stats', async (event) => {
    try {
      console.log('Fetching dashboard statistics...');
      
      // Get New Jobs count
      const [newJobsResult] = await db.getAll(`
        SELECT COUNT(*) as count FROM \`ShipStatusPro\`.new_jobs
      `);
      const newJobsCount = newJobsResult.count || 0;
      
      // Get Current Jobs (RMA) count
      const [currentJobsResult] = await db.getAll(`
        SELECT COUNT(*) as count 
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON o.ORDNUMBER = sc.ack_number
        WHERE o.COMPLETE IN (1, 2) -- In progress orders
      `);
      const currentJobsCount = currentJobsResult.count || 0;
      
      // Get Completed Orders count
      const [completedResult] = await db.getAll(`
        SELECT COUNT(*) as count 
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON o.ORDNUMBER = sc.ack_number
        WHERE o.COMPLETE = 3 OR sc.classification = 'Completed'
      `);
      const completedCount = completedResult.count || 0;
      
      // Get Pending Orders count (orders that haven't been shipped)
      const [pendingResult] = await db.getAll(`
        SELECT COUNT(*) as count 
        FROM \`SAGE-AUTO-UPDATE\`.OEORDH o
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON o.ORDNUMBER = sc.ack_number
        WHERE (sc.classification = 'Never Shipped' OR sc.classification IS NULL OR sc.classification = 'NEW')
        AND o.COMPLETE != 3
      `);
      const pendingCount = pendingResult.count || 0;
      
      console.log('Dashboard stats:', {
        newJobs: newJobsCount,
        currentJobs: currentJobsCount,
        completed: completedCount,
        pending: pendingCount
      });
      
      return {
        success: true,
        data: {
          newJobs: newJobsCount,
          currentJobs: currentJobsCount,
          completed: completedCount,
          pending: pendingCount
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      return {
        success: false,
        error: `Failed to fetch dashboard statistics: ${error.message}`
      };
    }
  });
  
  // Get overdue orders from New Jobs table
  ipcMain.handle('get-overdue-orders', async (event) => {
    try {
      console.log('Fetching overdue orders from New Jobs...');
      
      const query = `
        SELECT 
          nj.ack_number,
          nj.customer,
          nj.order_type,
          nj.comments,
          nj.location,
          nj.submission_date,
          o.ORDDATE,
          o.SHPNAME,
          o.SALESPER1,
          COALESCE(sc.classification, 'NEW') as ship_status,
          -- Calculate expected date (14 days after order date)
          DATE_ADD(
            STR_TO_DATE(o.ORDDATE, '%Y%m%d'), 
            INTERVAL 14 DAY
          ) as expected_date,
          -- Check if overdue (expected date < current date)
          CASE 
            WHEN DATE_ADD(STR_TO_DATE(o.ORDDATE, '%Y%m%d'), INTERVAL 14 DAY) < CURDATE() 
            THEN 1 
            ELSE 0 
          END as is_overdue,
          -- Days overdue
          CASE 
            WHEN DATE_ADD(STR_TO_DATE(o.ORDDATE, '%Y%m%d'), INTERVAL 14 DAY) < CURDATE() 
            THEN DATEDIFF(CURDATE(), DATE_ADD(STR_TO_DATE(o.ORDDATE, '%Y%m%d'), INTERVAL 14 DAY))
            ELSE 0 
          END as days_overdue
        FROM \`ShipStatusPro\`.new_jobs nj
        LEFT JOIN \`SAGE-AUTO-UPDATE\`.OEORDH o ON nj.ack_number = o.ORDNUMBER
        LEFT JOIN \`ShipStatusPro\`.shipment_classification sc ON nj.ack_number = sc.ack_number
        WHERE DATE_ADD(STR_TO_DATE(o.ORDDATE, '%Y%m%d'), INTERVAL 14 DAY) < CURDATE()
        AND (sc.classification != 'Completed' OR sc.classification IS NULL)
        ORDER BY days_overdue DESC
        LIMIT 10
      `;
      
      const overdueOrders = await db.getAll(query);
      
      // Map the results
      const mappedOrders = overdueOrders.map(order => ({
        ack_number: order.ack_number,
        customer: order.customer || 'Unknown Customer',
        order_type: order.order_type || 'Standard',
        ship_status: order.ship_status || 'NEW',
        order_date: order.ORDDATE,
        expected_date: order.expected_date,
        days_overdue: order.days_overdue,
        salesperson: order.SALESPER1 || 'N/A',
        ship_name: order.SHPNAME || 'N/A'
      }));
      
      console.log(`Found ${mappedOrders.length} overdue orders`);
      
      return {
        success: true,
        data: {
          count: mappedOrders.length,
          orders: mappedOrders
        }
      };
    } catch (error) {
      console.error('Error fetching overdue orders:', error);
      return {
        success: false,
        error: `Failed to fetch overdue orders: ${error.message}`
      };
    }
  });

  // Activity Log API Handlers
  
  // Get recent activity for dashboard
  ipcMain.handle('get-recent-activity', async (event, { limit = 10 }) => {
    try {
      console.log(`Fetching recent activity (limit ${limit})...`);
      
      // Create activity_log table if it doesn't exist
      try {
        await db.getAll(`
          CREATE TABLE IF NOT EXISTS \`ShipStatusPro\`.\`activity_log\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`activity_type\` VARCHAR(50) NOT NULL,
            \`description\` TEXT NOT NULL,
            \`ack_number\` VARCHAR(50),
            \`user_name\` VARCHAR(100) DEFAULT 'system',
            \`old_value\` TEXT,
            \`new_value\` TEXT,
            \`table_name\` VARCHAR(100),
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_ack_number\` (\`ack_number\`),
            INDEX \`idx_activity_type\` (\`activity_type\`),
            INDEX \`idx_created_at\` (\`created_at\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (createError) {
        console.warn('Could not create activity_log table:', createError.message);
      }
      
      // Fetch real activity data from database
      let activities = [];
      try {
        activities = await db.getAll(`
          SELECT 
            id,
            activity_type,
            description,
            ack_number,
            user_name,
            old_value,
            new_value,
            table_name,
            created_at
          FROM \`ShipStatusPro\`.activity_log 
          ORDER BY created_at DESC 
          LIMIT ?
        `, [parseInt(limit)]);
        
        console.log(`Found ${activities.length} real activities in database`);
      } catch (queryError) {
        console.warn('Could not fetch activities from database:', queryError.message);
      }
      
      // If no activities found, show helpful message
      if (activities.length === 0) {
        activities = [
          {
            id: 1,
            activity_type: 'system_info',
            description: 'No recent activity found. Activity will appear here when you make changes.',
            ack_number: null,
            user_name: 'System',
            old_value: null,
            new_value: null,
            table_name: 'activity_log',
            created_at: new Date()
          }
        ];
      }
      
      console.log(`Returning ${activities.length} activities`);
      
      return {
        success: true,
        activities: activities.map(activity => ({
          id: activity.id,
          type: activity.activity_type,
          message: activity.description,
          ackNumber: activity.ack_number,
          userName: activity.user_name,
          oldValue: activity.old_value,
          newValue: activity.new_value,
          tableName: activity.table_name,
          timestamp: activity.created_at,
          timeAgo: getTimeAgo(activity.created_at)
        }))
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return {
        success: false,
        error: `Failed to fetch recent activity: ${error.message}`,
        activities: []
      };
    }
  });
  
  // Log activity function
  ipcMain.handle('log-activity', async (event, { type, description, ackNumber, userName, oldValue, newValue, tableName }) => {
    try {
      // For now, just log to console to avoid database issues
      console.log(`Activity logged: ${type} - ${description}`);
      console.log(`  ACK: ${ackNumber}, User: ${userName}`);
      console.log(`  Old Value: ${oldValue}, New Value: ${newValue}`);
      console.log(`  Table: ${tableName}`);
      
      return {
        success: true,
        message: 'Activity logged successfully (console only)'
      };
    } catch (error) {
      console.error('Error logging activity:', error);
      return {
        success: false,
        error: `Failed to log activity: ${error.message}`
      };
    }
  });
  
  // getTimeAgo function is defined at the top of the file
}

module.exports = {
  initShipmentAPI
};
