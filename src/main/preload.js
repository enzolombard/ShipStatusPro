/**
 * Preload Script for Electron
 * This script runs in the renderer process before the web page is loaded.
 * It provides a secure bridge between the renderer process and the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    ipcRenderer: {
      // Send a message to the main process
      send: (channel, data) => {
        // Whitelist channels
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      },
      // Invoke a method in the main process and get a promise for the result
      invoke: (channel, ...args) => {
        // Whitelist channels
        const validChannels = [
          'open-folder-dialog', 
          'show-message-dialog',
          // Authentication API endpoints
          'login',
          // Auto-updater endpoints
          'auto-check-for-updates',
          'auto-start-update',
          // Shipment API endpoints
          'get-shipments',
          'get-filtered-shipments',
          'update-shipment-status',
          'update-shipment-classification',
          'update-order-type',
          'update-order-comment',
          'get-order-comments',
          'submit-job-to-new',
          // New Jobs API endpoints
          'get-new-jobs',
          'get-filtered-new-jobs',
          // Dashboard API endpoints
          'get-dashboard-stats',
          'get-overdue-orders',
          // Activity Log API endpoints
          'get-recent-activity',
          'log-activity'
        ];
        if (validChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, ...args);
        }
        return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
      },
      // Receive a message from the main process
      on: (channel, func) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender` 
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
      },
      // Remove a listener
      removeListener: (channel, func) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
          ipcRenderer.removeListener(channel, func);
        }
      }
    }
  }
);
