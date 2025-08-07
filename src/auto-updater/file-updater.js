/**
 * File Updater Module
 * Handles backing up and updating application files
 */
const fs = require('fs-extra');
const path = require('path');
const { app, shell, dialog } = require('electron');
const { execSync } = require('child_process');

class FileUpdater {
  /**
   * Create a new FileUpdater instance
   * @param {Object} options Configuration options
   * @param {string} options.appPath Path to the application directory
   * @param {string} options.sharedDrivePath Path to the shared drive where updates are stored
   * @param {Function} options.onProgress Callback for update progress
   * @param {Function} options.logger Function to log messages
   */
  constructor(options) {
    this.appPath = options.appPath;
    this.sharedDrivePath = options.sharedDrivePath;
    this.onProgress = options.onProgress || (() => {});
    this.logger = options.logger || console.log;
    
    // Define backup directory in user data folder
    this.backupPath = path.join(app.getPath('userData'), 'backups');
  }

  /**
   * Create a backup of the current application files
   * @returns {Promise<string>} Path to the backup directory
   */
  async backupCurrentFiles() {
    try {
      // Create timestamped backup folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.backupPath, `backup-${timestamp}`);
      
      this.logger(`Creating backup at: ${backupDir}`);
      this.onProgress({ status: 'backup', message: 'Creating backup of current files...' });
      
      await fs.ensureDir(backupDir);
      
      // Copy src folder
      if (await fs.pathExists(path.join(this.appPath, 'src'))) {
        this.onProgress({ status: 'backup', message: 'Backing up src folder...' });
        await fs.copy(
          path.join(this.appPath, 'src'), 
          path.join(backupDir, 'src')
        );
      }
      
      // Copy public folder if it exists
      if (await fs.pathExists(path.join(this.appPath, 'public'))) {
        this.onProgress({ status: 'backup', message: 'Backing up public folder...' });
        await fs.copy(
          path.join(this.appPath, 'public'), 
          path.join(backupDir, 'public')
        );
      }
      
      // Save package.json for dependency comparison
      if (await fs.pathExists(path.join(this.appPath, 'package.json'))) {
        await fs.copy(
          path.join(this.appPath, 'package.json'), 
          path.join(backupDir, 'package.json')
        );
      }
      
      // Save version.json
      if (await fs.pathExists(path.join(this.appPath, 'version.json'))) {
        await fs.copy(
          path.join(this.appPath, 'version.json'), 
          path.join(backupDir, 'version.json')
        );
      }
      
      this.logger('Backup completed successfully');
      return backupDir;
    } catch (error) {
      this.logger('Backup failed:', error.message);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Check if we have write permissions to the app directory
   * @returns {Promise<boolean>} True if we have write permissions
   */
  async hasWritePermissions() {
    try {
      // Log detailed path information for debugging
      this.logger('App path structure:');
      this.logger('- Full app path:', this.appPath);
      this.logger('- Path components:', path.parse(this.appPath));
      this.logger('- Parent directory:', path.dirname(this.appPath));
      
      // Create a test file in the app directory to check write permissions
      const testPath = path.join(this.appPath, '.write-test');
      await fs.writeFile(testPath, 'test');
      await fs.remove(testPath);
      return true;
    } catch (error) {
      this.logger('No write permissions to app directory:', error.message);
      return false;
    }
  }

  /**
   * Show dialog to prompt user to run the updater with elevated permissions
   */
  async showElevatedUpdatePrompt() {
    this.logger('Showing elevated update prompt');
    
    // Get current and new version information
    let currentVersion = '1.0.0';
    let newVersion = '1.1.0';
    
    try {
      // Try to read the current version file
      if (await fs.pathExists(path.join(this.appPath, 'version.json'))) {
        const currentVersionData = await fs.readJson(path.join(this.appPath, 'version.json'));
        currentVersion = currentVersionData.version || '1.0.0';
      }
      
      // Try to read the new version file
      if (await fs.pathExists(path.join(this.sharedDrivePath, 'version.json'))) {
        const newVersionData = await fs.readJson(path.join(this.sharedDrivePath, 'version.json'));
        newVersion = newVersionData.version || '1.1.0';
      }
    } catch (error) {
      this.logger('Error reading version information:', error.message);
    }
    
    // Create two batch files - a launcher and the actual updater
    const userDataPath = app.getPath('userData');
    const launcherPath = path.join(userDataPath, 'update-launcher.bat');
    const updaterPath = path.join(userDataPath, 'update-helper.bat');
    
    // Get the correct app directory path - we need the resources/app directory
    // If the path already ends with resources/app, use it as is
    // Otherwise, ensure we're targeting the correct directory
    let appDirPath = this.appPath;
    if (!appDirPath.endsWith('resources\\app') && !appDirPath.endsWith('resources/app')) {
      // If we're in development mode, the app path might be the project root
      // In production, we need to ensure we're targeting the resources/app directory
      const pathParts = path.parse(appDirPath);
      if (pathParts.base === 'app' && pathParts.dir.endsWith('resources')) {
        // We're already at the right path
      } else {
        // We need to construct the proper path
        appDirPath = path.join(appDirPath, 'resources', 'app');
      }
    }
    
    // Format paths for batch script
    const sourcePath = this.sharedDrivePath.replace(/\//g, '\\');
    const destPath = appDirPath.replace(/\//g, '\\');
    
    // Log the paths for debugging
    this.logger('Source path for batch:', sourcePath);
    this.logger('Destination path for batch:', destPath);
    
    // Log the exact paths for debugging
    this.logger('Original app path:', this.appPath);
    this.logger('Corrected app path:', appDirPath);
    this.logger('Full shared drive path:', this.sharedDrivePath);
    
    // Create the actual updater script - using robocopy for more reliable copying
    const updaterContent = `@echo off
color 1F
title Tacel-NCR Administrator Update

:: This script updates Tacel-NCR with administrator privileges
echo ===================================================
echo               Tacel-NCR UPDATER
echo ===================================================
echo.
echo Updating Tacel-NCR from version ${currentVersion} to ${newVersion}...
echo.

:: Set source and destination paths
set "SOURCE_PATH=${sourcePath}"
set "DEST_PATH=${destPath}"

echo [1/4] Checking directories...
echo Source: %SOURCE_PATH%
echo Destination: %DEST_PATH%

:: Check if destination exists
if not exist "%DEST_PATH%" (
  echo ERROR: Application directory not found!
  goto :error
)

:: Use pushd to map the network drive temporarily
echo [2/4] Accessing network location...
pushd %SOURCE_PATH%
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Cannot access update source directory!
  goto :error
)

:: Check if source files exist
if not exist "src" (
  echo ERROR: Source files not found!
  popd
  goto :error
)

echo [3/4] Copying files...

:: Make sure we're updating the correct directory
echo - Verifying paths...

:: Debug - Show exact paths
echo Exact destination path: "%DEST_PATH%"

:: Use robocopy for more reliable copying (MIR = mirror directories)
echo - Copying src folder...
robocopy "src" "%DEST_PATH%/src" /MIR /NFL /NDL /NJH /NJS /NC /NS /MT:4
if %ERRORLEVEL% GEQ 8 (
  echo ERROR: Failed to copy src folder! Error code: %ERRORLEVEL%
  popd
  goto :error
)

echo - Copying assets folder...%DEST_PATH%
if exist "assets" (
  robocopy "assets" "%DEST_PATH%/assets" /MIR /NFL /NDL /NJH /NJS /NC /NS /MT:4
  if %ERRORLEVEL% GEQ 8 (
    echo ERROR: Failed to copy assets folder! Error code: %ERRORLEVEL%
    popd
    goto :error
  )
)

echo - Copying icon folder...%DEST_PATH%
if exist "icon" (
  robocopy "icon" "%DEST_PATH%/icon" /MIR /NFL /NDL /NJH /NJS /NC /NS /MT:4
  if %ERRORLEVEL% GEQ 8 (
    echo ERROR: Failed to copy icon folder! Error code: %ERRORLEVEL%
    popd
    goto :error
  )
)


echo - Copying NCR_TEMPLATE folder...%DEST_PATH%
if exist "NCR_TEMPLATE" (
  robocopy "NCR_TEMPLATE" "%DEST_PATH%/NCR_TEMPLATE" /MIR /NFL /NDL /NJH /NJS /NC /NS /MT:4
  if %ERRORLEVEL% GEQ 8 (
    echo ERROR: Failed to copy NCR_TEMPLATE folder! Error code: %ERRORLEVEL%
    popd
    goto :error
  )
)

echo - Copying node_modules folder...%DEST_PATH%
if exist "node_modules" (
  robocopy "node_modules" "%DEST_PATH%/node_modules" /MIR /NFL /NDL /NJH /NJS /NC /NS /MT:4
  if %ERRORLEVEL% GEQ 8 (
    echo ERROR: Failed to copy node_modules folder! Error code: %ERRORLEVEL%
    popd
    goto :error
  )
)


echo [4/4] Copying configuration files...
if exist "package.json" (
  copy "package.json" "%DEST_PATH%" /Y
)
if exist "version.json" (
  copy "version.json" "%DEST_PATH%" /Y
)

:: Copy any other important files in the root directory
for %%F in (*.js *.json *.html *.css *.txt) do (
  if exist "%%F" (
    echo - Copying %%F...
    copy "%%F" "%DEST_PATH%" /Y
  )
)

:: Return from network location
popd

echo.
echo ===================================================
echo               UPDATE SUCCESSFUL!
echo ===================================================
echo.
echo Tacel-NCR has been updated successfully!
echo The application will restart automatically in 3 seconds...
echo.
color 2F

:: Wait a few seconds before restarting
timeout /t 3 /nobreak > nul

:: Start the application
echo Restarting Tacel-NCR...
start "" "%DEST_PATH%/../../Tacel-ncr.exe"
goto :end

:error
color 4F
echo.
echo ===================================================
echo                UPDATE FAILED!
echo ===================================================
echo.
echo An error occurred during the update process.
echo Please try again or contact your system administrator.
echo.

:end
pause
`;
    
    // Create a much simpler launcher script that directly runs the updater with admin privileges
    const launcherContent = `@echo off
echo Starting Tacel-NCR Update...

:: Create a VBS script to elevate the updater directly
echo Set UAC = CreateObject("Shell.Application") > "%temp%\Tacel-NCR_elevate.vbs"
echo UAC.ShellExecute "${updaterPath.replace(/\\/g, '\\\\')}", "", "", "runas", 1 >> "%temp%\Tacel-NCR_elevate.vbs"

:: Run the VBS script to launch the updater with elevation
echo Requesting administrative privileges...
call "%temp%\Tacel-NCR_elevate.vbs"

:: Clean up
del "%temp%\Tacel-NCR_elevate.vbs"

echo Update process started with administrator privileges.
echo You may close this window.
timeout /t 5
exit
`;

    // Write both scripts
    await fs.writeFile(updaterPath, updaterContent);
    await fs.writeFile(launcherPath, launcherContent);
    
    // Get reference to the main window to ensure dialog appears on top
    const { BrowserWindow, dialog } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows().find(w => w.isVisible());
    
    // Disable the main window to prevent interaction while update dialog is shown
    if (mainWindow) {
      mainWindow.setEnabled(false);
    }
    
    // Show a simple message box dialog that blocks the main window
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Administrator Privileges Required',
      message: 'Tacel-NCR needs administrator privileges to update.',
      detail: 'Click "Update Now" to run the update with elevated permissions. You may need to approve a UAC prompt.\n\nIf you cancel or close this dialog, the application will close.',
      buttons: ['Update Now', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      modal: true,
      alwaysOnTop: true
    });
    
    // Re-enable the main window regardless of the response
    if (mainWindow) {
      mainWindow.setEnabled(true);
    }
    
    if (response === 0) {
      // Run the launcher script which will request elevation
      shell.openPath(launcherPath);
      return true;
    } else {
      // User clicked Cancel or X (close button), quit the app
      this.logger('Update cancelled by user, closing application');
      setTimeout(() => {
        // Use process.exit instead of app.exit to avoid initialization issues
        process.exit(0);
      }, 100);
      return false;
    }
  }

  /**
   * Update application files from shared drive
   * @param {string} backupDir Path to backup directory (for rollback if needed)
   * @returns {Promise<boolean>} True if successful, throws error otherwise
   */
  async updateFiles(backupDir) {
    try {
      this.logger('Starting file update process');
      
      // Check if we have write permissions
      const hasPermissions = await this.hasWritePermissions();
      
      if (!hasPermissions) {
        // Show elevated update prompt
        const userAccepted = await this.showElevatedUpdatePrompt();
        if (userAccepted) {
          // The update will be handled by the elevated script
          this.onProgress({ status: 'elevated', message: 'Update will be performed with administrator privileges.' });
          
          // Add a delay to allow the progress message to be displayed
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Exit the process to let the elevated script take over
          process.exit(0);
        } else {
          throw new Error('Update cancelled: Administrator privileges are required');
        }
      }
      
      
      // Update src folder
      const remoteSrcPath = path.join(this.sharedDrivePath, 'src');
      const localSrcPath = path.join(this.appPath, 'src');
      
      if (await fs.pathExists(remoteSrcPath)) {
        this.onProgress({ status: 'update', message: 'Updating src folder...' });
        await fs.emptyDir(localSrcPath);
        await fs.copy(remoteSrcPath, localSrcPath);
      } else {
        this.logger('Remote src folder not found');
        throw new Error('Remote src folder not found');
      }
      
      // Update public folder if it public 
      const remotePublicPath = path.join(this.sharedDrivePath, 'public');
      const localPublicPath = path.join(this.appPath, 'public');
      
      if (await fs.pathExists(remotePublicPath)) {
        this.onProgress({ status: 'update', message: 'Updating public folder...' });
        await fs.emptyDir(localPublicPath);
        await fs.copy(remotePublicPath, localPublicPath);
      }
      
      // Update package.json if it exists
      const remotePackagePath = path.join(this.sharedDrivePath, 'package.json');
      const localPackagePath = path.join(this.appPath, 'package.json');
      
      if (await fs.pathExists(remotePackagePath)) {
        this.onProgress({ status: 'update', message: 'Updating package.json...' });
        await fs.copy(remotePackagePath, localPackagePath);
      }
      
      // Update version.json
      const remoteVersionPath = path.join(this.sharedDrivePath, 'version.json');
      const localVersionPath = path.join(this.appPath, 'version.json');
      
      if (await fs.pathExists(remoteVersionPath)) {
        this.onProgress({ status: 'update', message: 'Updating version information...' });
        await fs.copy(remoteVersionPath, localVersionPath);
      }
      
      this.logger('File update completed successfully');
      return true;
    } catch (error) {
      this.logger('File update failed:', error.message);
      
      // Try to rollback
      await this.rollback(backupDir);
      
      throw new Error(`File update failed: ${error.message}`);
    }
  }

  /**
   * Rollback to backup if update fails
   * @param {string} backupDir Path to backup directory
   * @returns {Promise<boolean>} True if rollback successful
   */
  async rollback(backupDir) {
    try {
      this.logger(`Rolling back to backup: ${backupDir}`);
      this.onProgress({ status: 'rollback', message: 'Update failed. Rolling back to previous version...' });
      
      // Restore src folder
      if (await fs.pathExists(path.join(backupDir, 'src'))) {
        await fs.emptyDir(path.join(this.appPath, 'src'));
        await fs.copy(
          path.join(backupDir, 'src'), 
          path.join(this.appPath, 'src')
        );
      }
      
      // Restore public folder
      if (await fs.pathExists(path.join(backupDir, 'public'))) {
        await fs.emptyDir(path.join(this.appPath, 'public'));
        await fs.copy(
          path.join(backupDir, 'public'), 
          path.join(this.appPath, 'public')
        );
      }
      
      // Restore package.json
      if (await fs.pathExists(path.join(backupDir, 'package.json'))) {
        await fs.copy(
          path.join(backupDir, 'package.json'), 
          path.join(this.appPath, 'package.json')
        );
      }
      
      // Restore version.json
      if (await fs.pathExists(path.join(backupDir, 'version.json'))) {
        await fs.copy(
          path.join(backupDir, 'version.json'), 
          path.join(this.appPath, 'version.json')
        );
      }
      
      this.logger('Rollback completed successfully');
      return true;
    } catch (error) {
      this.logger('Rollback failed:', error.message);
      this.onProgress({ 
        status: 'error', 
        message: 'Critical error: Rollback failed. Application may be in an inconsistent state.' 
      });
      return false;
    }
  }

  /**
   * Clean up old backups, keeping only the most recent ones
   * @param {number} keepCount Number of recent backups to keep
   * @returns {Promise<void>}
   */
  async cleanupOldBackups(keepCount = 5) {
    try {
      if (!(await fs.pathExists(this.backupPath))) {
        return;
      }
      
      const backupDirs = await fs.readdir(this.backupPath);
      
      // Sort by creation time (newest first)
      const sortedDirs = backupDirs
        .filter(dir => dir.startsWith('backup-'))
        .map(dir => ({
          name: dir,
          path: path.join(this.backupPath, dir),
          time: fs.statSync(path.join(this.backupPath, dir)).birthtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only the most recent backups
      if (sortedDirs.length > keepCount) {
        for (let i = keepCount; i < sortedDirs.length; i++) {
          this.logger(`Removing old backup: ${sortedDirs[i].name}`);
          await fs.remove(sortedDirs[i].path);
        }
      }
    } catch (error) {
      this.logger('Error cleaning up old backups:', error.message);
    }
  }
}

module.exports = FileUpdater;
