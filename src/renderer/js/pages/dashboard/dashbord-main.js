/**
 * Dashboard Module - Handles the dashboard screen functionality
 * Migrated from the old Ship Status Pro app
 */
const dashboardModule = (function() {
  // Private variables
  let dashboardContainer = null;
  
  /**
   * Initialize the dashboard module
   * @param {HTMLElement} container - The dashboard container element
   */
  function initialize(container) {
    dashboardContainer = container;
    
    // Clear any existing content
    dashboardContainer.innerHTML = '';
    
    // Create and append the dashboard content
    const content = `
      <div class="dashboard-content">
        <header>
          <div class="user-info">
            <div class="user-details">
              <span id="userInfo">User: <span id="username"></span></span>
            </div>
            <div class="date-time">
              <span id="currentDate"></span>
              <span id="currentTime"></span>
            </div>
          </div>
          <div class="header-buttons">
            <h1>Dashboard</h1>
            <button id="test-notifications-btn" class="btn btn-secondary" style="margin-left: 20px; padding: 8px 16px; font-size: 12px;">
              <i class="fas fa-bell"></i> Test Notifications
            </button>
          </div>
        </header>
        
        <div class="dashboard-summary">
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <div class="summary-info">
              <h3>New Jobs</h3>
              <p id="recentOrdersCount">Loading...</p>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-exchange-alt"></i>
            </div>
            <div class="summary-info">
              <h3>Current Jobs</h3>
              <p id="orders2025Count">Loading...</p>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="summary-info">
              <h3>Completed Orders</h3>
              <p id="completedOrdersCount">Loading...</p>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="summary-info">
              <h3>Pending Orders</h3>
              <p id="pendingOrdersCount">Loading...</p>
            </div>
          </div>
          
          <div class="summary-card overdue-card">
            <div class="summary-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="summary-info">
              <h3>Overdue Orders</h3>
              <p id="overdueOrdersCount">Loading...</p>
            </div>
          </div>
        </div>
        
        <div class="overdue-orders-section" id="overdueOrdersSection" style="display: none;">
          <h2>Overdue Orders <span class="overdue-count" id="overdueCountBadge">0</span></h2>
          <div class="overdue-orders-list" id="overdueOrdersList">
            <p class="loading-message">Loading overdue orders...</p>
          </div>
        </div>
        
        <div class="recent-activity">
          <h2>Recent Activity</h2>
          <div class="activity-list" id="activityList">
            <p class="loading-message">Loading recent activity...</p>
          </div>
        </div>
        
        <div class="quick-actions">
          <h2>Quick Actions</h2>
          <div class="action-buttons">
            <button class="action-button" onclick="showScreen('ticketing')">
              <i class="fas fa-ticket-alt"></i>
              <span>View New Jobs</span>
            </button>
            <button class="action-button" onclick="showScreen('rma')">
              <i class="fas fa-exchange-alt"></i>
              <span>View Current Jobs</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Set the content
    dashboardContainer.innerHTML = content;
    
    // Make the container visible
    dashboardContainer.style.display = 'block';
    
    // Initialize date and time display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Get logged in user info
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('currentUser'));
      if (userInfo) {
        document.getElementById('username').textContent = userInfo.username;
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
    
    // Load order statistics
    loadOrderStats();
    
    // Add test notification button event listener
    const testNotificationBtn = document.getElementById('test-notifications-btn');
    if (testNotificationBtn) {
      testNotificationBtn.addEventListener('click', () => {
        testNotifications();
      });
    }
    
    console.log('Dashboard module initialized');
  }
  
  /**
   * Update date and time display
   */
  function updateDateTime() {
    const currentDate = document.getElementById('currentDate');
    const currentTime = document.getElementById('currentTime');
    
    if (currentDate && currentTime) {
      const now = new Date();
      currentDate.textContent = now.toLocaleDateString();
      currentTime.textContent = now.toLocaleTimeString();
    }
  }
  
  /**
   * Load order statistics for the dashboard
   */
  async function loadOrderStats() {
    try {
      console.log('Loading dashboard statistics from backend...');
      
      // Get dashboard statistics from backend
      const statsResponse = await window.electron.ipcRenderer.invoke('get-dashboard-stats');
      
      if (statsResponse.success) {
        const stats = statsResponse.data;
        
        // Update order counts with real data
        document.getElementById('recentOrdersCount').textContent = stats.newJobs.toLocaleString();
        document.getElementById('orders2025Count').textContent = stats.currentJobs.toLocaleString();
        document.getElementById('completedOrdersCount').textContent = stats.completed.toLocaleString();
        document.getElementById('pendingOrdersCount').textContent = stats.pending.toLocaleString();
        
        console.log('Dashboard statistics loaded:', stats);
      } else {
        throw new Error(statsResponse.error || 'Failed to load statistics');
      }
      
      // Load overdue orders
      await loadOverdueOrders();
      
      // Load recent activity
      loadRecentActivity();
    } catch (error) {
      console.error('Error loading order statistics:', error);
      document.getElementById('recentOrdersCount').textContent = 'Error';
      document.getElementById('orders2025Count').textContent = 'Error';
      document.getElementById('completedOrdersCount').textContent = 'Error';
      document.getElementById('pendingOrdersCount').textContent = 'Error';
      document.getElementById('overdueOrdersCount').textContent = 'Error';
    }
  }
  
  /**
   * Load overdue orders from New Jobs table
   */
  async function loadOverdueOrders() {
    try {
      console.log('Loading overdue orders from backend...');
      
      const overdueResponse = await window.electron.ipcRenderer.invoke('get-overdue-orders');
      
      if (overdueResponse.success) {
        const overdueData = overdueResponse.data;
        const overdueCount = overdueData.count;
        const overdueOrders = overdueData.orders;
        
        // Update overdue count in summary card
        document.getElementById('overdueOrdersCount').textContent = overdueCount.toLocaleString();
        document.getElementById('overdueCountBadge').textContent = overdueCount;
        
        // Show/hide overdue orders section based on count
        const overdueSection = document.getElementById('overdueOrdersSection');
        if (overdueCount > 0) {
          overdueSection.style.display = 'block';
          
          // Populate overdue orders list
          const overdueList = document.getElementById('overdueOrdersList');
          if (overdueOrders.length > 0) {
            overdueList.innerHTML = overdueOrders.map(order => `
              <div class="overdue-order-item">
                <div class="order-header">
                  <span class="order-number">#${order.ack_number}</span>
                  <span class="days-overdue">${order.days_overdue} days overdue</span>
                </div>
                <div class="order-details">
                  <span class="customer">${order.customer}</span>
                  <span class="order-type">${order.order_type}</span>
                  <span class="ship-status status-${order.ship_status.toLowerCase().replace(/\s+/g, '-')}">${order.ship_status}</span>
                </div>
                <div class="order-meta">
                  <span class="salesperson">Sales: ${order.salesperson}</span>
                  <span class="expected-date">Expected: ${formatDate(order.expected_date)}</span>
                </div>
              </div>
            `).join('');
          } else {
            overdueList.innerHTML = '<p class="no-data">No overdue orders found.</p>';
          }
        } else {
          overdueSection.style.display = 'none';
        }
        
        console.log(`Loaded ${overdueCount} overdue orders`);
      } else {
        throw new Error(overdueResponse.error || 'Failed to load overdue orders');
      }
    } catch (error) {
      console.error('Error loading overdue orders:', error);
      document.getElementById('overdueOrdersCount').textContent = 'Error';
      document.getElementById('overdueCountBadge').textContent = '0';
      
      const overdueList = document.getElementById('overdueOrdersList');
      if (overdueList) {
        overdueList.innerHTML = '<p class="error-message">Error loading overdue orders</p>';
      }
    }
  }
  
  /**
   * Format date for display
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }
  
  /**
   * Load recent activity for the dashboard
   */
  async function loadRecentActivity() {
    try {
      const activityList = document.getElementById('activityList');
      
      // Call the API to get actual activity data
      const response = await window.electron.ipcRenderer.invoke('get-recent-activity', { limit: 10 });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load activity');
      }
      
      const activities = response.activities || [];
      
      // Clear loading message
      activityList.innerHTML = '';
      
      if (activities.length === 0) {
        activityList.innerHTML = '<p class="no-activity-message">No recent activity found</p>';
        return;
      }
      
      // Add activity items
      activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        // Set icon based on activity type
        let icon = '';
        let iconClass = '';
        switch (activity.type) {
          case 'status_change':
            icon = '<i class="fas fa-sync-alt"></i>';
            iconClass = 'status-change';
            break;
          case 'comment_added':
            icon = '<i class="fas fa-comment"></i>';
            iconClass = 'comment-added';
            break;
          case 'new_job_submitted':
            icon = '<i class="fas fa-plus-circle"></i>';
            iconClass = 'new-job';
            break;
          case 'order_type_changed':
            icon = '<i class="fas fa-tags"></i>';
            iconClass = 'order-type';
            break;
          case 'job_moved':
            icon = '<i class="fas fa-exchange-alt"></i>';
            iconClass = 'job-moved';
            break;
          case 'order_update':
            icon = '<i class="fas fa-edit"></i>';
            iconClass = 'order-update';
            break;
          default:
            icon = '<i class="fas fa-info-circle"></i>';
            iconClass = 'default';
        }
        
        activityItem.innerHTML = `
          <div class="activity-icon ${iconClass}">${icon}</div>
          <div class="activity-details">
            <p class="activity-message">${activity.message}</p>
            <div class="activity-meta">
              <span class="activity-time">${activity.timeAgo}</span>
              ${activity.ackNumber ? `<span class="activity-ack">Order: ${activity.ackNumber}</span>` : ''}
              ${activity.userName ? `<span class="activity-user">by ${activity.userName}</span>` : ''}
            </div>
          </div>
        `;
        
        activityList.appendChild(activityItem);
      });
    } catch (error) {
      console.error('Error loading recent activity:', error);
      const activityList = document.getElementById('activityList');
      activityList.innerHTML = '<p class="error-message">Error loading recent activity</p>';
    }
  }
  
  // Auto-refresh functionality
  let refreshInterval = null;
  
  /**
   * Start auto-refresh for dashboard data
   */
  function startAutoRefresh() {
    // Refresh every 30 seconds
    refreshInterval = setInterval(() => {
      loadRecentActivity();
      loadOrderStats();
      loadOverdueOrders();
    }, 30000);
  }
  
  /**
   * Stop auto-refresh
   */
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
  
  /**
   * Log activity to the database
   */
  async function logActivity(type, description, ackNumber = null, userName = null, oldValue = null, newValue = null, tableName = null) {
    try {
      await window.electron.ipcRenderer.invoke('log-activity', {
        type,
        description,
        ackNumber,
        userName,
        oldValue,
        newValue,
        tableName
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
  
  /**
   * Test notification system with different types
   */
  function testNotifications() {
    let counter = 0;
    
    // Test different notification types with delays
    setTimeout(() => {
      notifications.success('✅ Success notification - This is a success message!');
    }, counter++ * 800);
    
    setTimeout(() => {
      notifications.error('❌ Error notification - This is an error message!');
    }, counter++ * 800);
    
    setTimeout(() => {
      notifications.warning('⚠️ Warning notification - This is a warning message!');
    }, counter++ * 800);
    
    setTimeout(() => {
      notifications.info('ℹ️ Info notification - This is an info message!');
    }, counter++ * 800);
    
    // Test confirm dialog
    setTimeout(async () => {
      const confirmed = await notifications.confirm('Do you want to test the confirm dialog?', 'Confirm Test');
      if (confirmed) {
        notifications.success('You clicked Confirm!');
      } else {
        notifications.info('You clicked Cancel!');
      }
    }, counter++ * 800);
    
    // Test prompt dialog
    setTimeout(async () => {
      const result = await notifications.prompt('Enter your name:', 'John Doe', 'Prompt Test');
      if (result !== null) {
        notifications.success(`Hello, ${result}!`);
      } else {
        notifications.info('Prompt was cancelled!');
      }
    }, counter++ * 800);
  }
  
  /**
   * Cleanup function to stop auto-refresh when leaving dashboard
   */
  function cleanup() {
    stopAutoRefresh();
    console.log('Dashboard module cleaned up');
  }
  
  // Public API
  return {
    initialize,
    updateDateTime,
    startAutoRefresh,
    stopAutoRefresh,
    logActivity,
    cleanup
  };
})();

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dashboardModule;
} else {
  // For browser environments
  window.dashboardModule = dashboardModule;
}

// Make updateDateTime available globally for use in other modules
window.updateDateTime = dashboardModule.updateDateTime;
