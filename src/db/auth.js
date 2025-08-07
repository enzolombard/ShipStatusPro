/**
 * Authentication Model
 * Handles user authentication operations against the database
 */

const bcrypt = require('bcryptjs');
const db = require('./connection');

/**
 * Check if a user exists in the database
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - True if user exists, false otherwise
 */
async function checkUserExists(username) {
  try {
    const result = await db.getOne(
      'SELECT COUNT(*) as count FROM users WHERE username = ? AND (app = ? OR app = ? OR app = ?)',
      [username, 'ShipStatusPro', 'WIRE-SCHEDULER', 'MRP']
    );
    return result && result.count > 0;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
}

/**
 * Verify user credentials
 * @param {string} username - The username to verify
 * @param {string} password - The password to verify
 * @returns {Promise<Object|null>} - User object if authenticated, null otherwise
 */
async function verifyCredentials(username, password) {
  try {
    // Get the user from the database including role
    const user = await db.getOne(
      'SELECT id, username, password_hash, role FROM users WHERE username = ? AND (app = ? OR app = ? OR app = ?)',
      [username, 'ShipStatusPro', 'WIRE-SCHEDULER', 'MRP']
    );

    // If no user found, return null
    if (!user) {
      return null;
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    // If password is valid, return user info (excluding the password hash)
    if (isPasswordValid) {
      const { password_hash, ...userInfo } = user;
      return userInfo;
    }
    
    // Password is invalid
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

module.exports = {
  verifyCredentials,
  checkUserExists
};
