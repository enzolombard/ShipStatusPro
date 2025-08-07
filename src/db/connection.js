/**
 * Database Connection Module
 * Handles database connections for the ShipStatus Pro application
 * Supports both MySQL and SQLite as fallback
 */

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

// Database configuration for MySQL
const dbConfig = {
  host: '192.168.12.25',        // Linux server IP
  user: 'root',                 // MySQL username
  password: 'R00t4T5c3L$',      // MySQL password
  database: 'ShipStatusPro',
  waitForConnections: true,
  connectionLimit: 10,          // Maximum number of connections in the pool
  queueLimit: 0,                // Unlimited queue size
  connectTimeout: 10000         // 10 second timeout for connection
};

// SQLite configuration
const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(userDataPath, 'ship-status-pro.db');

// Ensure the data directory exists for SQLite
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Variables to hold connections
let mysqlPool = null;
let sqliteDb = null;
let usingMysql = true; // Flag to track which database we're using

// Create a connection pool
mysqlPool = mysql.createPool(dbConfig);

// Initialize database connections
async function initializeDatabase() {
  // Try MySQL first
  try {
    if (!mysqlPool) {
      mysqlPool = mysql.createPool(dbConfig);
    }
    
    const connection = await mysqlPool.getConnection();
    console.log('MySQL connection successful');
    connection.release();
    usingMysql = true;
    
    // Initialize MySQL tables if needed
    await initializeMysqlTables();
    
    return true;
  } catch (error) {
    console.warn('MySQL connection failed, falling back to SQLite:', error.message);
    
    // Fall back to SQLite
    try {
      if (!sqliteDb) {
        sqliteDb = await initializeSqlite();
      }
      console.log('SQLite connection successful');
      usingMysql = false;
      
      // Initialize SQLite tables
      await initializeSqliteTables();
      
      return true;
    } catch (sqliteError) {
      console.error('SQLite connection failed:', sqliteError);
      return false;
    }
  }
}

// Initialize SQLite database
function initializeSqlite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database:', err);
        return reject(err);
      }
      
      console.log('Connected to SQLite database at:', dbPath);
      resolve(db);
    });
  });
}

// Initialize MySQL tables
async function initializeMysqlTables() {
  try {
    // Create users table if it doesn't exist
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        app VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create or update shipment_classification table
    await ensureShipmentClassificationTable();
    
    // Check if we need to create a default admin user for ShipStatusPro
    const [rows] = await mysqlPool.execute('SELECT COUNT(*) as count FROM users WHERE app = ?', ['ShipStatusPro']);
    
    if (rows[0].count === 0) {
      // Create a default admin user with password 'admin'
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin', salt);
      
      await mysqlPool.execute(
        'INSERT INTO users (username, password_hash, role, app) VALUES (?, ?, ?, ?)',
        ['admin', passwordHash, 'admin', 'ShipStatusPro']
      );
      
      console.log('Created default admin user for ShipStatusPro in MySQL');
    }
  } catch (error) {
    console.error('Error initializing MySQL tables:', error);
    throw error;
  }
}

// Ensure shipment_classification table exists with all required columns
async function ensureShipmentClassificationTable() {
  try {
    console.log('Checking shipment_classification table...');
    
    // First, ensure the database exists
    await mysqlPool.execute(`CREATE DATABASE IF NOT EXISTS \`ShipStatusPro\``);
    
    // Create the table if it doesn't exist
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS \`ShipStatusPro\`.\`shipment_classification\` (
        ack_number VARCHAR(50) PRIMARY KEY,
        classification VARCHAR(50) DEFAULT 'NEW',
        order_type VARCHAR(50) DEFAULT NULL
      )
    `);
    
    // Check if order_type column exists
    const [columns] = await mysqlPool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ShipStatusPro' 
      AND TABLE_NAME = 'shipment_classification' 
      AND COLUMN_NAME = 'order_type'
    `);
    
    // Add order_type column if it doesn't exist
    if (columns.length === 0) {
      console.log('Adding order_type column to shipment_classification table...');
      await mysqlPool.execute(`
        ALTER TABLE \`ShipStatusPro\`.\`shipment_classification\` 
        ADD COLUMN order_type VARCHAR(50) DEFAULT NULL
      `);
      console.log('order_type column added successfully!');
    } else {
      console.log('order_type column already exists in shipment_classification table.');
    }
  } catch (error) {
    console.error('Error ensuring shipment_classification table:', error);
    throw error;
  }
}

// Initialize SQLite tables
function initializeSqliteTables() {
  return new Promise((resolve, reject) => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        app TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, async (err) => {
      if (err) {
        console.error('Error creating users table in SQLite:', err);
        return reject(err);
      }
      
      // Check if we need to create a default admin user
      sqliteDb.get('SELECT COUNT(*) as count FROM users WHERE app = ?', ['ShipStatusPro'], async (err, row) => {
        if (err) {
          console.error('Error checking users in SQLite:', err);
          return reject(err);
        }
        
        if (row.count === 0) {
          // Create a default admin user with password 'admin'
          const bcrypt = require('bcryptjs');
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('admin', salt);
          
          sqliteDb.run(
            'INSERT INTO users (username, password_hash, role, app) VALUES (?, ?, ?, ?)',
            ['admin', passwordHash, 'admin', 'ShipStatusPro'],
            (err) => {
              if (err) {
                console.error('Error creating admin user in SQLite:', err);
                return reject(err);
              }
              
              console.log('Created default admin user in SQLite');
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
}

// Test the connection
async function testConnection() {
  return await initializeDatabase();
}

/**
 * Execute a SQL query
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise} - Promise resolving to query results
 */
async function query(sql, params = []) {
  // Ensure database is initialized
  await initializeDatabase();
  
  if (usingMysql) {
    try {
      const [results] = await mysqlPool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('MySQL query error:', error);
      throw error;
    }
  } else {
    // Convert MySQL query to SQLite format if needed
    const sqliteQuery = convertToSqlite(sql);
    
    return new Promise((resolve, reject) => {
      // Determine if this is a SELECT query
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      if (isSelect) {
        sqliteDb.all(sqliteQuery, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', err);
            return reject(err);
          }
          resolve(rows);
        });
      } else {
        sqliteDb.run(sqliteQuery, params, function(err) {
          if (err) {
            console.error('SQLite query error:', err);
            return reject(err);
          }
          
          resolve({
            insertId: this.lastID,
            affectedRows: this.changes
          });
        });
      }
    });
  }
}

// Convert MySQL query syntax to SQLite syntax
function convertToSqlite(sql) {
  // Replace MySQL-specific syntax with SQLite equivalents
  return sql
    .replace(/`/g, '"')  // Replace backticks with double quotes
    .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
    .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');
}

/**
 * Get a single row from a query
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise} - Promise resolving to a single row or null
 */
async function getOne(sql, params = []) {
  // Ensure database is initialized
  await initializeDatabase();
  
  if (usingMysql) {
    try {
      const results = await query(sql, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw error;
    }
  } else {
    // Convert MySQL query to SQLite format if needed
    const sqliteQuery = convertToSqlite(sql);
    
    return new Promise((resolve, reject) => {
      sqliteDb.get(sqliteQuery, params, (err, row) => {
        if (err) {
          console.error('SQLite getOne error:', err);
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }
}

/**
 * Insert a record into a table
 * @param {string} table - The table name
 * @param {Object} data - Object containing column:value pairs
 * @returns {Promise} - Promise resolving to insert result
 */
async function insert(table, data) {
  try {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await query(sql, values);
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a record in a table
 * @param {string} table - The table name OR a complete SQL query if data is null
 * @param {Object|null} data - Object containing column:value pairs to update, or null if using raw SQL
 * @param {Object|Array} where - Object containing column:value pairs for WHERE clause, or array of parameters if using raw SQL
 * @returns {Promise} - Promise resolving to update result
 */
async function update(table, data, where) {
  try {
    // Check if this is a raw SQL query or a table update
    if (typeof table === 'string' && data === null) {
      // This is a raw SQL query
      const sql = table;
      const params = Array.isArray(where) ? where : [];
      return await query(sql, params);
    } else if (typeof table === 'string' && data && typeof data === 'object' && where && typeof where === 'object') {
      // This is a table update with data and where objects
      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      
      const values = [...Object.values(data), ...Object.values(where)];
      
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      return await query(sql, values);
    } else {
      throw new Error('Invalid arguments for update function');
    }
  } catch (error) {
    console.error('Error in update function:', error);
    throw error;
  }
}

/**
 * Delete a record from a table
 * @param {string} table - The table name
 * @param {Object} where - Object containing column:value pairs for WHERE clause
 * @returns {Promise} - Promise resolving to delete result
 */
async function remove(table, where) {
  try {
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(where);
    
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await query(sql, values);
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all rows from a query
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise} - Promise resolving to all rows
 */
async function getAll(sql, params = []) {
  // Ensure database is initialized
  await initializeDatabase();
  
  if (usingMysql) {
    try {
      const results = await query(sql, params);
      return results;
    } catch (error) {
      console.error('MySQL getAll error:', error);
      throw error;
    }
  } else {
    // Convert MySQL query to SQLite format if needed
    const sqliteQuery = convertToSqlite(sql);
    
    return new Promise((resolve, reject) => {
      sqliteDb.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          console.error('SQLite getAll error:', err);
          return reject(err);
        }
        resolve(rows || []);
      });
    });
  }
}

// Initialize the database when the module is loaded
initializeDatabase().catch(console.error);

/**
 * Execute a SQL query that doesn't return results (INSERT, UPDATE, DELETE)
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise} - Promise resolving to query results
 */
async function run(sql, params = []) {
  // Ensure database is initialized
  await initializeDatabase();
  
  if (usingMysql) {
    try {
      const result = await query(sql, params);
      return result;
    } catch (error) {
      console.error('MySQL run error:', error);
      throw error;
    }
  } else {
    // Convert MySQL query to SQLite format if needed
    const sqliteQuery = convertToSqlite(sql);
    
    return new Promise((resolve, reject) => {
      sqliteDb.run(sqliteQuery, params, function(err) {
        if (err) {
          console.error('SQLite run error:', err);
          return reject(err);
        }
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }
}

module.exports = {
  testConnection,
  query,
  getOne,
  getAll,
  insert,
  update,
  remove,
  run
};
