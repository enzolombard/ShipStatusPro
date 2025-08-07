const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const { setupIpcHandlers } = require('./ipc-handlers');
const AutoUpdater = require('../auto-updater/index');

// Initialize auto-updater
const autoUpdater = new AutoUpdater({
  sharedDrivePath: 'auto-updater path go here',
  allowSkip: false,
  silent: true,
  autoRestart: false,
  checkOnStartup: false // Don't check immediately on startup
});

// Check for internet connection
function checkInternetConnection() {
  return require('dns').promises.lookup('google.com')
    .then(() => true)
    .catch(() => false);
}

// Create the browser window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Needed for loading local JSON files
    },
    show: false, // Don't show until ready-to-show
    backgroundColor: '#ffffff', // White background
    icon: path.join(__dirname, '../../public/icons/app-icon.ico') // Application icon
  });
  
  // Set the main window reference for the auto-updater
  autoUpdater.setMainWindow(mainWindow);

  // In development mode, enable live reload and open DevTools
  const isDev = process.argv.includes('--inspect');
  
  if (isDev) {
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  }
  
  // Load the index.html file
  const indexPath = path.join(__dirname, '..', '..', 'src', 'renderer', 'index.html');
  
  console.log(`Loading HTML from: ${indexPath}`);
  mainWindow.loadFile(indexPath);

  // Show window when ready and maximize
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize(); // Start in maximized mode for dashboard
    
    // Check for updates after the window is shown
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000); // Wait 3 seconds before checking for updates
  });
  
  // Set the main window reference in the auto-updater
  autoUpdater.setMainWindow(mainWindow);

  // Check internet connection when the app starts
  checkInternetConnection().then(isConnected => {
    if (!isConnected) {
      dialog.showErrorBox(
        'No Internet Connection', 
        'TICKETING-RMA requires an internet connection to function properly. Please connect to the internet and restart the application.'
      );
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Set up IPC handlers before creating the window
  setupIpcHandlers(ipcMain, autoUpdater);
  
  // Check for updates before creating the main window
  try {
    const updateResult = await autoUpdater.checkForUpdates();
    if (!updateResult.updateAvailable || (!updateResult.isRequired && autoUpdater.allowSkip)) {
      // If no update available or update is skippable, proceed with normal startup
      createWindow();
    }
    // If update is available and required, the auto-updater will handle it
  } catch (error) {
    console.error('Error checking for updates:', error);
    // Proceed with normal startup if update check fails
    createWindow();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox(
    'Application Error',
    `An unexpected error occurred: ${error.message}\n\nThe application will now close.`
  );
  app.quit();
});
