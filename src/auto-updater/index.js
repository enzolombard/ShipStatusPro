/**
 * Auto-Updater Module
 * Main module that orchestrates the entire update process
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const VersionChecker = require('./version-checker');
const FileUpdater = require('./file-updater');
const DependencyManager = require('./dependency-manager');

class AutoUpdater {
  /**
   * Create a new AutoUpdater instance
   * @param {Object} options Configuration options
   * @param {string} options.sharedDrivePath Path to the shared drive where updates are stored
   * @param {boolean} options.allowSkip Whether to allow users to skip updates
   * @param {boolean} options.silent Whether to perform updates silently
   * @param {boolean} options.autoRestart Whether to restart automatically after update
   */
  constructor(options) {
    this.appPath = app.getAppPath();
    this.sharedDrivePath = options.sharedDrivePath;
    this.allowSkip = options.allowSkip !== undefined ? options.allowSkip : true;
    this.silent = options.silent !== undefined ? options.silent : false;
    this.autoRestart = options.autoRestart !== undefined ? options.autoRestart : false;
    this.checkOnStartup = options.checkOnStartup !== undefined ? options.checkOnStartup : true;
    
    this.updateInProgress = false;
    this.updateWindow = null;
    this.mainWindow = null;
    this.updateResult = null;
    this.logPath = path.join(app.getPath('userData'), 'update-logs.json');
    
    // Initialize sub-modules
    this.versionChecker = new VersionChecker({
      appPath: this.appPath,
      sharedDrivePath: this.sharedDrivePath,
      logger: this.log.bind(this)
    });
    
    this.fileUpdater = new FileUpdater({
      appPath: this.appPath,
      sharedDrivePath: this.sharedDrivePath,
      onProgress: this.handleProgress.bind(this),
      logger: this.log.bind(this)
    });
    
    this.dependencyManager = new DependencyManager({
      appPath: this.appPath,
      onProgress: this.handleProgress.bind(this),
      logger: this.log.bind(this)
    });
    
    // Setup IPC handlers
    this.setupIpcHandlers();
    
    // Check for updates on startup if enabled
    if (this.checkOnStartup) {
      this.checkForUpdates();
    }
  }

  /**
   * Set the main window reference
   * @param {BrowserWindow} window The main application window
   */
  setMainWindow(window) {
    this.log('Setting main window reference');
    this.mainWindow = window;
  }

  /**
   * Set up IPC handlers for update-related events
   */
  setupIpcHandlers() {
    // Only set up the event listeners that don't conflict with the ones in ipc-handlers.js
    ipcMain.on('skip-update', () => {
      this.closeUpdateWindow();
    });
    
    ipcMain.on('restart-app', () => {
      this.restartApp();
    });
  }

  /**
   * Set the main application window reference
   * @param {BrowserWindow} window The main application window
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Log a message to the console and update log file
   * @param  {...any} args Arguments to log
   */
  log(...args) {
    console.log('[AutoUpdater]', ...args);
    this.saveLog('info', args.join(' '));
  }

  /**
   * Log an error message
   * @param  {...any} args Arguments to log
   */
  logError(...args) {
    console.error('[AutoUpdater ERROR]', ...args);
    this.saveLog('error', args.join(' '));
  }

  /**
   * Save a log entry to the log file
   * @param {string} level Log level (info, error, etc.)
   * @param {string} message Log message
   */
  async saveLog(level, message) {
    // Temporarily disable file logging to avoid issues
    console.log(`[AutoUpdater] ${level.toUpperCase()}: ${message}`);
    return;
    
    /* Disabled due to JSON parsing issues
    try {
      let logs = [];
      
      if (await fs.pathExists(this.logPath)) {
        try {
          const logContent = await fs.readFile(this.logPath, 'utf8');
          logs = JSON.parse(logContent);
          
          // Validate logs is an array
          if (!Array.isArray(logs)) {
            console.warn('Log file content is not an array, resetting logs');
            logs = [];
          }
        } catch (parseError) {
          console.warn('Error parsing log file, creating new log file:', parseError.message);
          // If there's an error parsing the log file, create a new one
          logs = [];
          // Backup the corrupted file for debugging
          const backupPath = `${this.logPath}.corrupted.${Date.now()}`;
          try {
            await fs.copy(this.logPath, backupPath);
            console.log(`Corrupted log file backed up to ${backupPath}`);
          } catch (backupError) {
            console.error('Failed to backup corrupted log file:', backupError);
          }
        }
      }
      
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message
      });
      
      // Keep only the last 1000 log entries
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }
      
      await fs.writeFile(this.logPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Failed to save log:', error);
    }
    */
  }

  /**
   * Handle progress updates from sub-modules
   * @param {Object} progress Progress information
   */
  handleProgress(progress) {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.webContents.send('update-progress', progress);
    }
    
    this.log(`Progress: ${progress.status} - ${progress.message}`);
    
    // If this is an elevated update, close the update window after a delay
    if (progress.status === 'elevated') {
      setTimeout(() => {
        this.closeUpdateWindow();
      }, 3000);
    }
  }

  /**
   * Check if an update is available
   * @returns {Promise<Object>} Update check result
   */
  async checkForUpdates() {
    try {
      this.log('Checking for updates...');
      const result = await this.versionChecker.checkForUpdates();
      this.updateResult = result;
      
      if (result.updateAvailable) {
        this.log(`Update available: ${result.currentVersion} -> ${result.newVersion}`);
        
        // Always perform the update silently in the background
        this.log('Starting silent update in the background');
        await this.performUpdate();
      } else {
        this.log('No updates available');
      }
      
      return result;
    } catch (error) {
      this.logError('Error checking for updates:', error.message);
      return { 
        updateAvailable: false, 
        error: error.message 
      };
    }
  }

  /**
   * Show the update prompt window
   * @param {Object} updateInfo Update information
   */
  showUpdatePrompt(updateInfo) {
    this.log('Showing update prompt window with info:', JSON.stringify(updateInfo));
    
    if (this.updateWindow) {
      this.log('Update window already exists, focusing it');
      this.updateWindow.focus();
      return;
    }
    
    try {
      // Make sure we have a reference to the main window
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        this.log('Main window not available, cannot show update prompt');
        return;
      }
      
      this.log('Creating update prompt window');
      this.updateWindow = new BrowserWindow({
        width: 500,
        height: 400,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        },
        title: 'TACEL-NCR Update Available',
        parent: this.mainWindow,
        modal: true,
        alwaysOnTop: true,
        center: true
      });
      
      const updatePromptPath = path.join(this.appPath, 'src', 'renderer', 'update-prompt.html');
      this.log(`Loading update prompt from: ${updatePromptPath}`);
      this.updateWindow.loadFile(updatePromptPath);
    } catch (error) {
      this.logError('Error creating update prompt window:', error);
    }
    
    this.updateWindow.webContents.on('did-finish-load', () => {
      try {
        this.log('Update prompt window loaded, sending update info');
        this.updateWindow.webContents.send('update-info', {
          ...updateInfo,
          allowSkip: this.allowSkip && !updateInfo.isRequired
        });
        this.log('Showing update prompt window');
        this.updateWindow.show();
      } catch (error) {
        this.logError('Error in update prompt did-finish-load handler:', error);
      }
    });
    
    this.updateWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      this.logError(`Failed to load update prompt: ${errorDescription} (${errorCode})`);
    });
    
    this.updateWindow.on('closed', () => {
      this.updateWindow = null;
    });
  }

  /**
   * Show the update progress window
   */
  showUpdateProgress() {
    if (this.updateWindow) {
      this.updateWindow.close();
    }
    
    this.updateWindow = new BrowserWindow({
      width: 500,
      height: 350,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      title: 'TACEL-NCR Updating...'
    });
    
    this.updateWindow.loadFile(path.join(this.appPath, 'src', 'renderer', 'update-progress.html'));
    
    this.updateWindow.webContents.on('did-finish-load', () => {
      this.updateWindow.show();
    });
    
    this.updateWindow.on('closed', () => {
      this.updateWindow = null;
    });
  }

  /**
   * Close the update window
   */
  closeUpdateWindow() {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close();
      this.updateWindow = null;
    }
  }

  /**
   * Perform the update process
   * @returns {Promise<Object>} Update result
   */
  async performUpdate() {
    if (this.updateInProgress) {
      this.log('Update already in progress');
      return { success: false, error: 'Update already in progress' };
    }
    
    this.updateInProgress = true;
    
    try {
      // Check if we have write permissions before showing the update progress window
      const hasPermissions = await this.fileUpdater.hasWritePermissions();
      
      // Only show the update progress window if we have permissions
      // Otherwise, the elevated update prompt will be shown by fileUpdater.updateFiles()
      if (!this.silent && hasPermissions) {
        this.showUpdateProgress();
      }
      
      this.log('Starting update process');
      this.handleProgress({ status: 'start', message: 'Starting update process...' });
      
      // Create backup
      const backupDir = await this.fileUpdater.backupCurrentFiles();
      
      // Update files
      await this.fileUpdater.updateFiles(backupDir);
      
      // Check if dependencies need updating
      const oldPackagePath = path.join(backupDir, 'package.json');
      const newPackagePath = path.join(this.appPath, 'package.json');
      
      const needDependencyUpdate = await this.dependencyManager.dependenciesNeedUpdate(
        oldPackagePath, 
        newPackagePath
      );
      
      if (needDependencyUpdate) {
        // Install dependencies
        await this.dependencyManager.installDependencies();
      } else {
        this.log('No dependency changes detected');
        this.handleProgress({ 
          status: 'dependencies', 
          message: 'No dependency changes detected' 
        });
      }
      
      // Clean up old backups
      await this.fileUpdater.cleanupOldBackups();
      
      this.log('Update completed successfully');
      this.handleProgress({ 
        status: 'complete', 
        message: 'Update completed successfully!' 
      });
      
      // Always restart the app after a successful update
      this.log('Restarting app to apply updates...');
      setTimeout(() => this.restartApp(), 2000);
      
      this.updateInProgress = false;
      return { success: true };
    } catch (error) {
      this.logError('Update failed:', error.message);
      this.handleProgress({ 
        status: 'error', 
        message: `Update failed: ${error.message}` 
      });
      
      this.updateInProgress = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Restart the application
   */
  restartApp() {
    this.log('Restarting application...');
    app.relaunch();
    app.exit();
  }
}

module.exports = AutoUpdater;
