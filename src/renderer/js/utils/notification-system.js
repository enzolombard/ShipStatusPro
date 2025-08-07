/**
 * Modern Notification System
 * Replaces alert() dialogs with modern toast notifications
 */

class NotificationSystem {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.init();
  }

  init() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('notification-container');
    }
  }

  /**
   * Show a notification
   * @param {string} message - The message to display
   * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds (0 for persistent)
   * @param {boolean} closable - Whether the notification can be closed manually
   */
  show(message, type = 'info', duration = 5000, closable = true) {
    const notification = this.createNotification(message, type, closable);
    this.container.appendChild(notification);
    this.notifications.push(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * Show success notification
   */
  success(message, duration = 4000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error notification
   */
  error(message, duration = 6000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show warning notification
   */
  warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show info notification
   */
  info(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Create notification element
   */
  createNotification(message, type, closable) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Get icon based on type
    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>'
    };

    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-message">${message}</div>
        ${closable ? '<button class="notification-close" aria-label="Close"><i class="fas fa-times"></i></button>' : ''}
      </div>
    `;

    // Add close functionality
    if (closable) {
      const closeBtn = notification.querySelector('.notification-close');
      closeBtn.addEventListener('click', () => {
        this.remove(notification);
      });
    }

    return notification;
  }

  /**
   * Remove notification
   */
  remove(notification) {
    if (!notification || !notification.parentNode) return;

    notification.classList.add('hide');
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      
      // Remove from notifications array
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach(notification => {
      this.remove(notification);
    });
  }

  /**
   * Show confirmation dialog (replacement for confirm())
   * @param {string} message - The confirmation message
   * @param {string} title - Optional title
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  confirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'notification-modal-overlay';
      
      modal.innerHTML = `
        <div class="notification-modal">
          <div class="notification-modal-header">
            <h3>${title}</h3>
          </div>
          <div class="notification-modal-body">
            <p>${message}</p>
          </div>
          <div class="notification-modal-footer">
            <button class="btn btn-secondary modal-cancel">Cancel</button>
            <button class="btn btn-primary modal-confirm">Confirm</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Add event listeners
      const cancelBtn = modal.querySelector('.modal-cancel');
      const confirmBtn = modal.querySelector('.modal-confirm');

      const cleanup = () => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });

      // Focus confirm button
      setTimeout(() => {
        confirmBtn.focus();
      }, 100);
    });
  }

  /**
   * Show input dialog (replacement for prompt())
   * @param {string} message - The prompt message
   * @param {string} defaultValue - Default input value
   * @param {string} title - Optional title
   * @returns {Promise<string|null>} - Resolves to input value or null if cancelled
   */
  prompt(message, defaultValue = '', title = 'Input Required') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'notification-modal-overlay';
      
      modal.innerHTML = `
        <div class="notification-modal">
          <div class="notification-modal-header">
            <h3>${title}</h3>
          </div>
          <div class="notification-modal-body">
            <p>${message}</p>
            <input type="text" class="modal-input" value="${defaultValue}" />
          </div>
          <div class="notification-modal-footer">
            <button class="btn btn-secondary modal-cancel">Cancel</button>
            <button class="btn btn-primary modal-confirm">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector('.modal-input');
      const cancelBtn = modal.querySelector('.modal-cancel');
      const confirmBtn = modal.querySelector('.modal-confirm');

      const cleanup = () => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      confirmBtn.addEventListener('click', () => {
        const value = input.value.trim();
        cleanup();
        resolve(value);
      });

      // Submit on Enter
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          cleanup();
          resolve(value);
        }
      });

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      });

      // Focus input
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);
    });
  }
}

// Create global instance
const notifications = new NotificationSystem();

// Make it available globally
window.notifications = notifications;

// Legacy compatibility - replace alert with notification
window.showNotification = (message, type = 'info') => {
  return notifications.show(message, type);
};

// Override native alert, confirm, and prompt with modern alternatives
window.alert = (message) => {
  return notifications.info(message);
};

window.confirm = (message) => {
  return notifications.confirm(message);
};

window.prompt = (message, defaultValue) => {
  return notifications.prompt(message, defaultValue);
};

// Additional helper functions for common notification patterns
window.showSuccess = (message) => notifications.success(message);
window.showError = (message) => notifications.error(message);
window.showWarning = (message) => notifications.warning(message);
window.showInfo = (message) => notifications.info(message);

// Quick notification for form validation
window.showValidationError = (message) => {
  return notifications.warning(message, 4000);
};

// Quick notification for API responses
window.showApiSuccess = (message) => {
  return notifications.success(message, 3000);
};

window.showApiError = (message) => {
  return notifications.error(message, 6000);
};

// Console log for debugging
console.log('🔔 Modern Notification System loaded - native alert/confirm/prompt overridden');

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}
