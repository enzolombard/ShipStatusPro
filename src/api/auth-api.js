/**
 * Authentication API
 * Provides API endpoints for user authentication
 */

const authModel = require('../db/auth');

/**
 * Initialize authentication API endpoints
 * @param {Electron.IpcMain} ipcMain - The IPC main instance
 */
function initAuthAPI(ipcMain) {
  // Login handler
  ipcMain.handle('login', async (event, credentials) => {
    try {
      // Validate input
      if (!credentials || !credentials.username || !credentials.password) {
        return { 
          success: false, 
          error: 'Username and password are required' 
        };
      }

      const { username, password } = credentials;
      
      // First check if the user exists
      const userExists = await authModel.checkUserExists(username);
      
      if (!userExists) {
        return {
          success: false,
          error: 'Username not found',
          errorType: 'username'
        };
      }
      
      // If user exists, verify password
      const user = await authModel.verifyCredentials(username, password);
      
      if (user) {
        return {
          success: true,
          data: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        };
      } else {
        return {
          success: false,
          error: 'Incorrect password',
          errorType: 'password'
        };
      }
    } catch (error) {
      console.error('Error in login handler:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  });
}

module.exports = {
  initAuthAPI
};
