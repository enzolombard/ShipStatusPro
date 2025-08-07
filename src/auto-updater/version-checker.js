/**
 * Version Checker Module
 * Handles checking for updates by comparing local and remote version files
 */
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');

class VersionChecker {
  /**
   * Create a new VersionChecker instance
   * @param {Object} options Configuration options
   * @param {string} options.appPath Path to the application directory
   * @param {string} options.sharedDrivePath Path to the shared drive where updates are stored
   * @param {Function} options.logger Function to log messages
   */
  constructor(options) {
    this.appPath = options.appPath;
    this.sharedDrivePath = options.sharedDrivePath;
    this.logger = options.logger || console.log;
    
    this.localVersionPath = path.join(this.appPath, 'version.json');
    this.remoteVersionPath = path.join(this.sharedDrivePath, 'version.json');
  }

  /**
   * Check if the shared drive is accessible
   * @returns {Promise<boolean>} True if accessible, false otherwise
   */
  async isSharedDriveAccessible() {
    try {
      this.logger(`Checking if shared drive path exists: ${this.sharedDrivePath}`);
      await fs.access(this.sharedDrivePath);
      this.logger('Shared drive is accessible');
      
      // List files in the shared drive path to help debug
      try {
        const files = await fs.readdir(this.sharedDrivePath);
        this.logger(`Files in shared drive path: ${files.join(', ')}`);
      } catch (listError) {
        this.logger(`Could not list files in shared drive: ${listError.message}`);
      }
      
      return true;
    } catch (error) {
      this.logger(`Shared drive not accessible: ${error.message}`);
      return false;
    }
  }

  /**
   * Read the local version file
   * @returns {Promise<Object|null>} Version object or null if not found
   */
  async getLocalVersion() {
    try {
      if (await fs.pathExists(this.localVersionPath)) {
        const data = await fs.readFile(this.localVersionPath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      this.logger('Error reading local version:', error.message);
      return null;
    }
  }

  /**
   * Read the remote version file from the shared drive
   * @returns {Promise<Object|null>} Version object or null if not found
   */
  async getRemoteVersion() {
    try {
      if (!(await this.isSharedDriveAccessible())) {
        this.logger('Shared drive is not accessible, cannot check for remote version');
        return null;
      }

      this.logger(`Checking if remote version file exists at: ${this.remoteVersionPath}`);
      if (await fs.pathExists(this.remoteVersionPath)) {
        this.logger('Remote version file found, reading contents');
        const data = await fs.readFile(this.remoteVersionPath, 'utf8');
        const versionData = JSON.parse(data);
        this.logger(`Remote version data: ${JSON.stringify(versionData)}`);
        return versionData;
      }
      this.logger(`Remote version file not found at: ${this.remoteVersionPath}`);
      return null;
    } catch (error) {
      this.logger(`Error reading remote version: ${error.message}`);
      return null;
    }
  }

  /**
   * Compare local and remote versions to determine if an update is available
   * @returns {Promise<Object>} Update check result
   */
  async checkForUpdates() {
    const localVersion = await this.getLocalVersion();
    const remoteVersion = await this.getRemoteVersion();

    if (!localVersion) {
      this.logger('No local version found');
      return { 
        updateAvailable: false, 
        error: 'No local version found' 
      };
    }

    if (!remoteVersion) {
      this.logger('No remote version found');
      return { 
        updateAvailable: false, 
        error: 'No remote version found or shared drive not accessible' 
      };
    }

    const localVer = localVersion.version;
    const remoteVer = remoteVersion.version;

    // Compare versions using semver
    const updateAvailable = semver.gt(remoteVer, localVer);

    return {
      updateAvailable,
      currentVersion: localVer,
      newVersion: remoteVer,
      isRequired: remoteVersion.requiredUpdate || false,
      updateMessage: remoteVersion.updateMessage || '',
      changesUrl: remoteVersion.changesUrl || '',
      releaseDate: remoteVersion.releaseDate || new Date().toISOString().split('T')[0]
    };
  }
}

module.exports = VersionChecker;
