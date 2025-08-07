/**
 * Activity Logger Utility
 * Provides centralized activity logging functionality for the application
 */

const ActivityLogger = {
  /**
   * Log an activity to the database
   * @param {string} type - Type of activity (status_change, comment_added, etc.)
   * @param {string} description - Human-readable description of the activity
   * @param {string} ackNumber - Order ACK number (optional)
   * @param {string} userName - User who performed the action (optional)
   * @param {string} oldValue - Previous value (optional)
   * @param {string} newValue - New value (optional)
   * @param {string} tableName - Database table affected (optional)
   */
  async log(type, description, ackNumber = null, userName = null, oldValue = null, newValue = null, tableName = null) {
    try {
      // Get current user from session storage or default to 'System'
      const currentUser = userName || sessionStorage.getItem('username') || 'System';
      
      await window.electron.ipcRenderer.invoke('log-activity', {
        type,
        description,
        ackNumber,
        userName: currentUser,
        oldValue,
        newValue,
        tableName
      });
      
      console.log(`Activity logged: ${type} - ${description}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  /**
   * Log a status change activity
   */
  async logStatusChange(ackNumber, oldStatus, newStatus, userName = null) {
    await this.log(
      'status_change',
      `Order status changed from "${oldStatus}" to "${newStatus}"`,
      ackNumber,
      userName,
      oldStatus,
      newStatus,
      'shipment_classification'
    );
  },

  /**
   * Log a comment addition activity
   */
  async logCommentAdded(ackNumber, comment, userName = null) {
    await this.log(
      'comment_added',
      `Comment added to order: "${comment}"`,
      ackNumber,
      userName,
      null,
      comment,
      'shipment_classification'
    );
  },

  /**
   * Log a new job submission activity
   */
  async logNewJobSubmitted(ackNumber, orderType, userName = null) {
    await this.log(
      'new_job_submitted',
      `New job submitted: ${orderType} order`,
      ackNumber,
      userName,
      null,
      orderType,
      'new_jobs'
    );
  },

  /**
   * Log an order type change activity
   */
  async logOrderTypeChanged(ackNumber, oldType, newType, userName = null) {
    await this.log(
      'order_type_changed',
      `Order type changed from "${oldType}" to "${newType}"`,
      ackNumber,
      userName,
      oldType,
      newType,
      'shipment_classification'
    );
  },

  /**
   * Log a job move activity (from new jobs to current jobs)
   */
  async logJobMoved(ackNumber, fromTable, toTable, userName = null) {
    await this.log(
      'job_moved',
      `Job moved from ${fromTable} to ${toTable}`,
      ackNumber,
      userName,
      fromTable,
      toTable,
      'system'
    );
  }
};

// Make ActivityLogger available globally
window.ActivityLogger = ActivityLogger;
