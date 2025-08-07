/**
 * IPC Handlers for Electron Main Process
 * This file contains all IPC (Inter-Process Communication) handlers for the main process
 * to communicate with the renderer process.
 */

const { dialog } = require('electron');
const { initAuthAPI } = require('../api/auth-api');
const { initShipmentAPI } = require('../api/shipment-api');
// Other API modules have been removed

// Reference to the auto-updater instance
let autoUpdater = null;

/**
 * Initialize all IPC handlers
 * @param {Electron.App} app - The Electron app instance
 * @param {Electron.IpcMain} ipcMain - The IPC main instance
 * @param {Object} updater - The auto-updater instance (optional)
 */
function setupIpcHandlers(ipcMain, updater) {
  // Store the auto-updater reference if provided
  if (updater) {
    autoUpdater = updater;
  }
  
  // Initialize authentication API
  initAuthAPI(ipcMain);
  
  // Initialize shipment API
  console.log('Setting up shipment API handlers...');
  initShipmentAPI(ipcMain);
  console.log('Shipment API handlers initialized');
  
  // Other API initializations have been removed

  // Auto-update related handlers
  if (autoUpdater) {
    // Check for updates
    ipcMain.handle('auto-check-for-updates', async () => {
      try {
        return await autoUpdater.checkForUpdates();
      } catch (error) {
        console.error('Error in auto-check-for-updates handler:', error);
        return { updateAvailable: false, error: error.message };
      }
    });
    
    // Start update process
    ipcMain.handle('auto-start-update', async () => {
      try {
        return await autoUpdater.performUpdate();
      } catch (error) {
        console.error('Error in auto-start-update handler:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Handler for opening folder selection dialog
  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Folder to Upload'
    });
    
    return result;
  });
  
  // Handler for showing message dialogs
  ipcMain.handle('show-message-dialog', async (event, options) => {
    const { type, title, message } = options;
    
    let dialogType = 'info';
    if (type === 'error') {
      dialogType = 'error';
    } else if (type === 'warning') {
      dialogType = 'warning';
    }
    
    const result = await dialog.showMessageBox({
      type: dialogType,
      title: title,
      message: message,
      buttons: ['OK']
    });
    
    return result;
  });
}

module.exports = {
  setupIpcHandlers
};
