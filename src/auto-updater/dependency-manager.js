/**
 * Dependency Manager Module
 * Handles installing dependencies after updates
 */
const { spawn } = require('child_process');
const path = require('path');

class DependencyManager {
  /**
   * Create a new DependencyManager instance
   * @param {Object} options Configuration options
   * @param {string} options.appPath Path to the application directory
   * @param {Function} options.onProgress Callback for installation progress
   * @param {Function} options.logger Function to log messages
   */
  constructor(options) {
    this.appPath = options.appPath;
    this.onProgress = options.onProgress || (() => {});
    this.logger = options.logger || console.log;
  }

  /**
   * Install dependencies using npm
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  async installDependencies() {
    return new Promise((resolve, reject) => {
      this.logger('Starting npm install');
      this.onProgress({ 
        status: 'dependencies', 
        message: 'Installing dependencies...' 
      });

      // Run npm install in the app directory
      const npmProcess = spawn('npm', ['install'], { 
        cwd: this.appPath,
        shell: true,
        windowsHide: true
      });

      let output = '';
      let errorOutput = '';

      npmProcess.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        this.logger(`npm install output: ${message}`);
        this.onProgress({ 
          status: 'dependencies', 
          message: `Installing dependencies: ${message.trim().split('\n').pop() || 'Processing...'}` 
        });
      });

      npmProcess.stderr.on('data', (data) => {
        const message = data.toString();
        errorOutput += message;
        this.logger(`npm install error: ${message}`);
        
        // npm sometimes outputs progress to stderr, so we still want to show this
        this.onProgress({ 
          status: 'dependencies', 
          message: `Installing dependencies: ${message.trim().split('\n').pop() || 'Processing...'}` 
        });
      });

      npmProcess.on('close', (code) => {
        if (code === 0) {
          this.logger('npm install completed successfully');
          this.onProgress({ 
            status: 'dependencies', 
            message: 'Dependencies installed successfully' 
          });
          resolve(true);
        } else {
          this.logger(`npm install failed with code ${code}`);
          this.onProgress({ 
            status: 'error', 
            message: `Failed to install dependencies (code ${code})` 
          });
          reject(new Error(`npm install failed with code ${code}: ${errorOutput}`));
        }
      });

      npmProcess.on('error', (error) => {
        this.logger(`npm install process error: ${error.message}`);
        this.onProgress({ 
          status: 'error', 
          message: `Error running npm: ${error.message}` 
        });
        reject(error);
      });
    });
  }

  /**
   * Check if dependencies need to be updated by comparing package.json files
   * @param {string} oldPackagePath Path to the old package.json
   * @param {string} newPackagePath Path to the new package.json
   * @returns {Promise<boolean>} True if dependencies need updating
   */
  async dependenciesNeedUpdate(oldPackagePath, newPackagePath) {
    try {
      const fs = require('fs-extra');
      
      if (!(await fs.pathExists(oldPackagePath)) || !(await fs.pathExists(newPackagePath))) {
        // If either file doesn't exist, assume dependencies need updating
        return true;
      }
      
      const oldPackage = JSON.parse(await fs.readFile(oldPackagePath, 'utf8'));
      const newPackage = JSON.parse(await fs.readFile(newPackagePath, 'utf8'));
      
      // Compare dependencies
      const oldDeps = oldPackage.dependencies || {};
      const newDeps = newPackage.dependencies || {};
      
      // Check if any dependencies were added or versions changed
      for (const [pkg, version] of Object.entries(newDeps)) {
        if (!oldDeps[pkg] || oldDeps[pkg] !== version) {
          this.logger(`Dependency change detected: ${pkg}@${version}`);
          return true;
        }
      }
      
      // Check dev dependencies
      const oldDevDeps = oldPackage.devDependencies || {};
      const newDevDeps = newPackage.devDependencies || {};
      
      for (const [pkg, version] of Object.entries(newDevDeps)) {
        if (!oldDevDeps[pkg] || oldDevDeps[pkg] !== version) {
          this.logger(`Dev dependency change detected: ${pkg}@${version}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger(`Error checking dependencies: ${error.message}`);
      // If there's an error, assume dependencies need updating to be safe
      return true;
    }
  }
}

module.exports = DependencyManager;
