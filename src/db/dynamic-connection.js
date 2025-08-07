/**
 * Dynamic Database Connection Module
 * Handles multiple database connections for the ShipStatus Pro application
 * Supports connecting to different databases on the same MySQL server
 * Falls back to SQLite when MySQL is unavailable
 */

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

// Base database configuration for MySQL
const baseDbConfig = {
  host: '192.168.12.25',        // Linux server IP
  user: 'root',                 // MySQL username
  password: 'R00t4T5c3L$',      // MySQL password
  waitForConnections: true,
  connectionLimit: 10,          // Maximum number of connections in the pool
  queueLimit: 0,                // Unlimited queue size
  connectTimeout: 10000         // 10 second timeout for connection
};

// SQLite configuration
const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..', '..', 'data');
const getDbPath = (dbName) => path.join(userDataPath, `${dbName}.db`);

// Ensure the data directory exists for SQLite
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// Connection pools cache
const mysqlPools = new Map();
const sqliteDbs = new Map();
const connectionStatus = new Map(); // Tracks which database type is being used for each database name

/**
 * Get or create a MySQL connection pool for a specific database
 * @param {string} dbName - Database name to connect to
 * @returns {Object} MySQL connection pool
 */
function getMysqlPool(dbName) {
  if (!mysqlPools.has(dbName)) {
    const config = { ...baseDbConfig, database: dbName };
    mysqlPools.set(dbName, mysql.createPool(config));
  }
  return mysqlPools.get(dbName);
}

/**
 * Initialize SQLite database
 * @param {string} dbName - Database name for the SQLite file
 * @returns {Promise} Promise resolving to SQLite database instance
 */
function initializeSqlite(dbName) {
  return new Promise((resolve, reject) => {
    const dbPath = getDbPath(dbName);
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`Error connecting to SQLite database ${dbName}:`, err);
        return reject(err);
      }
      
      console.log(`Connected to SQLite database ${dbName} at:`, dbPath);
      resolve(db);
    });
  });
}

/**
 * Initialize database connection for a specific database
 * @param {string} dbName - Database name to connect to
 * @returns {Promise<boolean>} - Promise resolving to true if connection successful
 */
async function initializeDatabase(dbName) {
  // Default to MRP if no database name provided
  const database = dbName || 'MRP';
  
  // Try MySQL first
  try {
    const pool = getMysqlPool(database);
    const connection = await pool.getConnection();
    console.log(`MySQL connection to ${database} successful`);
    connection.release();
    connectionStatus.set(database, 'mysql');
    return true;
  } catch (error) {
    console.warn(`MySQL connection to ${database} failed, falling back to SQLite:`, error.message);
    
    // Fall back to SQLite
    try {
      if (!sqliteDbs.has(database)) {
        const db = await initializeSqlite(database);
        sqliteDbs.set(database, db);
      }
      console.log(`SQLite connection for ${database} successful`);
      connectionStatus.set(database, 'sqlite');
      return true;
    } catch (sqliteError) {
      console.error(`SQLite connection for ${database} failed:`, sqliteError);
      return false;
    }
  }
}

/**
 * Convert MySQL query syntax to SQLite syntax
 * @param {string} sql - MySQL query to convert
 * @returns {string} - SQLite compatible query
 */
function convertToSqlite(sql) {
  // Replace MySQL-specific syntax with SQLite equivalents
  return sql
    .replace(/`/g, '"')  // Replace backticks with double quotes
    .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
    .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');
}

/**
 * Execute a SQL query on a specific database
 * @param {string} dbName - Database name to query
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise} - Promise resolving to query results
 */
async function query(dbName, sql, params = []) {
  // Default to ShipStatusPro if no database name provided
  const database = dbName || 'ShipStatusPro';
  
  // Ensure database is initialized
  if (!connectionStatus.has(database)) {
    await initializeDatabase(database);
  }
  
  const usingMysql = connectionStatus.get(database) === 'mysql';
  
  if (usingMysql) {
    try {
      const pool = getMysqlPool(database);
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error(`MySQL query error on ${database}:`, error);
      throw error;
    }
  } else {
    // Convert MySQL query to SQLite format if needed
    const sqliteQuery = convertToSqlite(sql);
    const db = sqliteDbs.get(database);
    
    return new Promise((resolve, reject) => {
      // Determine if this is a SELECT query
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      if (isSelect) {
        db.all(sqliteQuery, params, (err, rows) => {
          if (err) {
            console.error(`SQLite query error on ${database}:`, err);
            return reject(err);
          }
          resolve(rows);
        });
      } else {
        db.run(sqliteQuery, params, function(err) {
          if (err) {
            console.error(`SQLite query error on ${database}:`, err);
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

/**
 * Get a single row from a query
 * @param {string} dbName - Database name to query
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise} - Promise resolving to a single row or null
 */
async function getOne(dbName, sql, params = []) {
  const results = await query(dbName, sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

/**
 * Insert a record into a table
 * @param {string} dbName - Database name to use
 * @param {string} table - The table name
 * @param {Object} data - Object containing column:value pairs
 * @returns {Promise} - Promise resolving to insert result
 */
async function insert(dbName, table, data) {
  try {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await query(dbName, sql, values);
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a record in a table
 * @param {string} dbName - Database name to use
 * @param {string} table - The table name OR a complete SQL query if data is null
 * @param {Object|null} data - Object containing column:value pairs to update, or null if using raw SQL
 * @param {Object|Array} where - Object containing column:value pairs for WHERE clause, or array of parameters if using raw SQL
 * @returns {Promise} - Promise resolving to update result
 */
async function update(dbName, table, data, where) {
  try {
    // Check if this is a raw SQL query or a table update
    if (typeof table === 'string' && data === null) {
      // This is a raw SQL query
      const sql = table;
      const params = Array.isArray(where) ? where : [];
      return await query(dbName, sql, params);
    } else if (typeof table === 'string' && data && typeof data === 'object' && where && typeof where === 'object') {
      // This is a table update with data and where objects
      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      
      const values = [...Object.values(data), ...Object.values(where)];
      
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      return await query(dbName, sql, values);
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
 * @param {string} dbName - Database name to use
 * @param {string} table - The table name
 * @param {Object} where - Object containing column:value pairs for WHERE clause
 * @returns {Promise} - Promise resolving to delete result
 */
async function remove(dbName, table, where) {
  try {
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(where);
    
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await query(dbName, sql, values);
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Test connection to a specific database
 * @param {string} dbName - Database name to test connection to
 * @returns {Promise<boolean>} - Promise resolving to true if connection successful
 */
async function testConnection(dbName) {
  return await initializeDatabase(dbName);
}

/**
 * Get list of available databases on the MySQL server
 * @returns {Promise<Array>} - Promise resolving to array of database names
 */
async function listDatabases() {
  try {
    // Create a temporary connection without specifying a database
    const tempConfig = { ...baseDbConfig };
    delete tempConfig.database;
    
    const tempPool = mysql.createPool(tempConfig);
    const [results] = await tempPool.execute('SHOW DATABASES');
    await tempPool.end();
    
    // Filter databases and prioritize ShipStatusPro and SAGE-AUTO-UPDATE
  const allDatabases = results.map(row => row.Database).filter(name => 
    !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(name)
  );
  
  // Ensure ShipStatusPro and SAGE-AUTO-UPDATE are at the beginning of the list if they exist
  const priorityDatabases = ['ShipStatusPro', 'SAGE-AUTO-UPDATE'];
  const prioritized = [];
  
  // Add priority databases first if they exist
  priorityDatabases.forEach(dbName => {
    if (allDatabases.includes(dbName)) {
      prioritized.push(dbName);
    }
  });
  
  // Add remaining databases
  allDatabases.forEach(dbName => {
    if (!priorityDatabases.includes(dbName)) {
      prioritized.push(dbName);
    }
  });
  
  return prioritized;
  } catch (error) {
    console.error('Error listing databases:', error);
    return [];
  }
}
/**
 * Close all database connections
 * @returns {Promise} - Promise resolving when all connections are closed
 */
async function closeAllConnections() {
  const promises = [];
  
  // Close all MySQL pools
  for (const [dbName, pool] of mysqlPools.entries()) {
    promises.push(
      pool.end().catch(err => console.error(`Error closing MySQL pool for ${dbName}:`, err))
    );
  }
  
  // Close all SQLite connections
  for (const [dbName, db] of sqliteDbs.entries()) {
    promises.push(
      new Promise((resolve) => {
        db.close(err => {
          if (err) console.error(`Error closing SQLite connection for ${dbName}:`, err);
          resolve();
        });
      })
    );
  }
  
  await Promise.all(promises);
  
  // Clear the maps
  mysqlPools.clear();
  sqliteDbs.clear();
  connectionStatus.clear();
}

module.exports = {
  testConnection,
  query,
  getOne,
  insert,
  update,
  remove,
  listDatabases,
  closeAllConnections
};
