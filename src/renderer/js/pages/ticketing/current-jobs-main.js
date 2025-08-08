/**
 * Ticketing Module - Handles the ticketing screen functionality
 * Migrated from the old Ship Status Pro app's orders page
 */

// Allow re-loading by using window assignment instead of const
window.ticketingModule = (function() {
  // Private variables
  let ticketingContainer = null;
  let commentDialog = null;
  let currentOrderId = null;
  
  /**
   * Initialize the ticketing module
   * @param {HTMLElement} container - The ticketing container element
   */
  function initialize(container) {
    ticketingContainer = container;
    
    // Clear any existing content
    ticketingContainer.innerHTML = '';
    
    // Create and append the ticketing content with inline filters
    const content = `
      <div class="orders-page new-jobs-enhanced">
        <div class="new-jobs-container">
          <!-- Page Header -->
          <div class="new-jobs-page-header">
            <h1>Current Jobs</h1>
            <div class="new-jobs-header-actions">
              <!-- Search Container -->
              <div class="search-container" id="searchContainer">
                <i class="fas fa-search"></i>
                <input type="text" id="quickSearch" placeholder="Search orders...">
              </div>
              
              <!-- Inline Filter Panel (appears in same row as search) -->
              <div class="new-jobs-inline-filter-panel" id="inlineFilterPanel">
                <div class="new-jobs-filter-group">
                  <input type="text" class="new-jobs-filter-input" id="customerFilter" placeholder="Customer">
                </div>
                
                <div class="new-jobs-filter-group">
                  <select class="new-jobs-order-type-select" id="orderTypeFilter">
                    <option value="recent" selected>Recent Orders</option>
                    <option value="1">Traffic Cabinet</option>
                    <option value="2">UPS/Misc. Cabinet</option>
                    <option value="3">Standard Items</option>
                    <option value="4">Misc. Items</option>
                    <option value="5">Repair/RMA</option>
                  </select>
                </div>
                
                <div class="new-jobs-date-range">
                  <input type="date" class="new-jobs-filter-input" id="startDate">
                  <span>to</span>
                  <input type="date" class="new-jobs-filter-input" id="endDate">
                </div>
                
                <button class="new-jobs-primary-button" id="applyFilters">Apply</button>
                <button class="new-jobs-secondary-button" id="clearFilters">Clear</button>
              </div>
              
              <!-- Date/Time Info -->
              <div class="date-time" style="display: flex; align-items: center; gap: 10px; color: #666; font-size: 14px; margin-right: 15px;">
                <span id="currentDate"></span>
                <span id="currentTime"></span>
              </div>
              
              <!-- Action Buttons -->
              <button class="new-jobs-action-button new-jobs-refresh-button" id="refreshButton" title="Refresh">
                <i class="fas fa-sync-alt"></i>
              </button>
              
              <button class="new-jobs-action-button new-jobs-filter-button" id="filterToggle">
                <i class="fas fa-filter"></i>
                <span>Filters</span>
              </button>
              
              <!-- Reset Filters Button -->
              <button class="new-jobs-reset-filters" id="resetFilters" title="Reset Filters" style="display: none;">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        
        <div class="orders-container">
          <div class="table-container">
            <table id="ordersTable">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Ship Name</th>
                  <th>Salesperson</th>
                  <th>Order Date</th>
                  <th>Exp Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Order Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="ordersBody">
                <tr>
                  <td colspan="10" class="loading-message">Loading orders...</td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </div>

      <!-- Comment Dialog -->
      <div id="commentDialog" class="dialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>Add Comment</h2>
            <span class="close-dialog">&times;</span>
          </div>
          <div class="dialog-body">
            <div class="order-info">
              <p>Order: <span id="commentOrderId"></span></p>
              <p>Customer: <span id="commentCustomer"></span></p>
            </div>
            <div class="comment-form">
              <label for="commentText">Comment:</label>
              <textarea id="commentText" rows="4" placeholder="Enter your comment here"></textarea>
            </div>
          </div>
          <div class="dialog-footer">
            <button id="saveComment" class="primary-btn">Save Comment</button>
            <button id="cancelComment" class="secondary-btn">Cancel</button>
          </div>
        </div>
      </div>


      </div>
    `;
    
    // Set the content
    ticketingContainer.innerHTML = content;
    
    // Make the container visible
    ticketingContainer.style.display = 'block';
    
    // Initialize date and time display
    if (window.updateDateTime) {
      window.updateDateTime();
    } else {
      updateDateTime();
      setInterval(updateDateTime, 1000);
    }
    
    // User info is displayed in the sidebar, no need to show it here
    
    // Initialize dialogs
    commentDialog = document.getElementById('commentDialog');

    // Add event listeners
    attachEventListeners();
    
    // Add refresh listener for new jobs updates
    addRefreshListener();
    
    // Load orders data
    loadOrders();
    
    console.log('Ticketing module initialized');
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
   * Attach event listeners to elements
   */
  // Event Handler Functions
  const handleOrderTypeChange = async (event) => {
    const type = event.target.value;
    if (type === 'recent') {
      await loadOrders();
    } else {
      const orders = await getFilteredOrders({ orderType: type });
      populateOrdersTable(orders);
    }
  };

  const handleApplyFilters = async () => {
    const filters = {
      customer: document.getElementById('customerFilter').value.trim(),
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      startAck: document.getElementById('startAck').value.trim(),
      endAck: document.getElementById('endAck').value.trim()
    };
    await loadFilteredOrders(filters);
  };

  const handleClearFilters = () => {
    document.getElementById('customerFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('startAck').value = '';
    document.getElementById('endAck').value = '';
    loadOrders();
  };

  const handleCloseCommentDialog = () => {
    if (commentDialog) commentDialog.style.display = 'none';
  };

  const handleSaveComment = async () => {
    const commentText = document.getElementById('commentText').value.trim();
    if (commentText) {
      await saveComment(currentOrderId, commentText);
      handleCloseCommentDialog();
      loadOrders(); // Reload to show updated comments
    } else {
      notifications.warning('Please enter a comment before saving.');
    }
  };

  const handleTableClick = (event) => {
    console.log('Table click detected:', event.target);
    
    const commentTarget = event.target.closest('.comment-btn');
    if (commentTarget) {
      console.log('Comment button clicked:', commentTarget);
      const orderId = commentTarget.dataset.order;
      const customer = commentTarget.dataset.customer;
      openCommentDialog(orderId, customer);
      return;
    }
    
    const submitTarget = event.target.closest('.submit-job-btn');
    if (submitTarget) {
      console.log('Submit button clicked:', submitTarget);
      const orderId = submitTarget.dataset.order;
      const customer = submitTarget.dataset.customer;
      console.log('Calling handleSubmitJob with:', orderId, customer);
      handleSubmitJob(orderId, customer);
      return;
    }
    
    console.log('No matching button found for click');
  };

  const handleWindowClick = (event) => {
    if (event.target === commentDialog) {
      handleCloseCommentDialog();
    }
  };

  // New inline filter handlers
  const handleFilterToggle = () => {
    const filterPanel = document.getElementById('inlineFilterPanel');
    const searchContainer = document.getElementById('searchContainer');
    const resetButton = document.getElementById('resetFilters');
    
    if (filterPanel && searchContainer) {
      const isActive = filterPanel.classList.contains('active');
      
      if (isActive) {
        // Hide filters
        filterPanel.classList.remove('active');
        searchContainer.classList.remove('compact');
        resetButton.style.display = 'none';
      } else {
        // Show filters
        filterPanel.classList.add('active');
        searchContainer.classList.add('compact');
        resetButton.style.display = 'flex';
      }
    }
  };

  const handleRefresh = () => {
    const refreshIcon = document.querySelector('#refreshButton i');
    if (refreshIcon) {
      refreshIcon.classList.add('rotating');
      setTimeout(() => {
        refreshIcon.classList.remove('rotating');
      }, 1000);
    }
    
    // Show notification
    showNotification('Refreshing orders...', 'success');
    
    // Reload orders
    loadOrders();
  };

  const handleQuickSearch = (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    const tableRows = document.querySelectorAll('#ordersBody tr');
    
    tableRows.forEach(row => {
      if (row.classList.contains('loading-message') || row.classList.contains('error-message')) {
        return;
      }
      
      const text = row.textContent.toLowerCase();
      const shouldShow = searchTerm === '' || text.includes(searchTerm);
      row.style.display = shouldShow ? '' : 'none';
    });
  };

  // handleApplyFilters and handleClearFilters are defined above

  const handleResetFilters = () => {
    // Clear all filter inputs
    const customerFilter = document.getElementById('customerFilter');
    const orderTypeFilter = document.getElementById('orderTypeFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const quickSearch = document.getElementById('quickSearch');
    
    if (customerFilter) customerFilter.value = '';
    if (orderTypeFilter) orderTypeFilter.value = 'recent';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    if (quickSearch) quickSearch.value = '';
    
    // Hide filter panel
    const filterPanel = document.getElementById('inlineFilterPanel');
    const searchContainer = document.getElementById('searchContainer');
    const resetButton = document.getElementById('resetFilters');
    
    if (filterPanel && searchContainer) {
      filterPanel.classList.remove('active');
      searchContainer.classList.remove('compact');
      resetButton.style.display = 'none';
    }
    
    // Show notification
    showNotification('Filters cleared', 'success');
    
    // Reload orders
    loadOrders();
  };

  // Notification system
  const showNotification = (message, type = 'success') => {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.new-jobs-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `new-jobs-notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 3000);
  };

  function attachEventListeners() {
    // Original event listeners
    document.getElementById('orderTypeFilter')?.addEventListener('change', handleOrderTypeChange);
    document.getElementById('applyFilters')?.addEventListener('click', handleApplyFilters);
    document.getElementById('clearFilters')?.addEventListener('click', handleClearFilters);
    commentDialog?.querySelector('.close-dialog')?.addEventListener('click', handleCloseCommentDialog);
    document.getElementById('saveComment')?.addEventListener('click', handleSaveComment);
    document.getElementById('cancelComment')?.addEventListener('click', handleCloseCommentDialog);
    document.getElementById('ordersBody')?.addEventListener('click', handleTableClick);
    window.addEventListener('click', handleWindowClick);
    
    // New inline filter event listeners
    document.getElementById('filterToggle')?.addEventListener('click', handleFilterToggle);
    document.getElementById('refreshButton')?.addEventListener('click', handleRefresh);
    document.getElementById('quickSearch')?.addEventListener('input', handleQuickSearch);
    document.getElementById('resetFilters')?.addEventListener('click', handleResetFilters);
  }
  
  /**
   * Load orders data
   */
  async function loadOrders() {
    try {
      const orders = await getOrders();
      populateOrdersTable(orders);
    } catch (error) {
      console.error('Error loading orders:', error);
      const tbody = document.getElementById('ordersBody');
      tbody.innerHTML = '<tr><td colspan="9" class="error-message">Error loading orders: ' + error.message + '</td></tr>';
    }
  }
  
  /**
   * Load filtered orders
   * @param {Object} filters - Filter criteria
   */
  async function loadFilteredOrders(filters) {
    try {
      const orders = await getFilteredOrders(filters);
      populateOrdersTable(orders);
    } catch (error) {
      console.error('Error loading filtered orders:', error);
      const tbody = document.getElementById('ordersBody');
      tbody.innerHTML = '<tr><td colspan="9" class="error-message">Error loading filtered orders: ' + error.message + '</td></tr>';
    }
  }
  
  /**
   * Get orders data from the new_jobs table
   * @returns {Promise<Array>} Array of order objects
   */
  async function getOrders() {
    try {
      console.log('Fetching new jobs data from database...');
      
      // Call the API to get new jobs data
      const response = await window.electron.ipcRenderer.invoke('get-new-jobs', {
        page: 1,
        pageSize: 50
      });
      
      if (response.success) {
        console.log(`Successfully fetched ${response.data.length} new jobs`);
        return response.data;
      } else {
        console.error('Failed to fetch new jobs:', response.error);
        // Return empty array if API fails
        return [];
      }
    } catch (error) {
      console.error('Error fetching new jobs:', error);
      // Return empty array if there's an error
      return [];
    }
  }
  
  /**
   * Get filtered orders data from the new_jobs table
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of filtered order objects
   */
  async function getFilteredOrders(filters) {
    try {
      console.log('Fetching filtered new jobs data from database...', filters);
      
      // Call the API to get filtered new jobs data
      const response = await window.electron.ipcRenderer.invoke('get-filtered-new-jobs', {
        filters: {
          orderType: filters.orderType,
          customer: filters.customer,
          startDate: filters.startDate,
          endDate: filters.endDate,
          startAck: filters.startAck,
          endAck: filters.endAck
        },
        page: 1,
        pageSize: 50
      });
      
      if (response.success) {
        console.log(`Successfully fetched ${response.data.length} filtered new jobs`);
        return response.data;
      } else {
        console.error('Failed to fetch filtered new jobs:', response.error);
        // Return empty array if API fails
        return [];
      }
    } catch (error) {
      console.error('Error fetching filtered new jobs:', error);
      // Return empty array if there's an error
      return [];
    }
  }
  
  /**
   * Update order type
   * @param {string} ackNumber - Order acknowledgment number
   * @param {number} type - Order type
   * @param {Object} orderData - Full order data
   * @returns {Promise<Object>} Update result
   */
  async function updateOrderType(ackNumber, type, orderData) {
    // In a real app, this would call the API to update the order type
    // For now, we'll simulate the update
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`Updating order ${ackNumber} to type ${type}`);
    
    // Create a new order for the Current Jobs list (RMA)
    const currentJobOrder = {
      ORDNUMBER: orderData.ORDNUMBER,
      CUSTOMER: orderData.CUSTOMER || '',
      SHPNAME: orderData.SHPNAME || '',
      SALESPER1: orderData.SALESPER1 || '',
      ORDDATE: orderData.ORDDATE || '',
      EXPDATE: orderData.EXPDATE || '',
      LOCATION: orderData.LOCATION || '',
      SHIP_STATUS: 'pending',
      COMMENTS: `Transferred from New Jobs. Order type: ${getOrderTypeName(type)}`
    };
    
    // Add the order to the shared data store for Current Jobs
    if (window.dataStore) {
      window.dataStore.addTransferredOrder(currentJobOrder);
    }
    
    // Return success response
    return { success: true, message: 'Order type updated successfully and moved to Current Jobs' };
  }
  
  /**
   * Get order type name from type ID
   * @param {number} typeId - Order type ID
   * @returns {string} Order type name
   */
  function getOrderTypeName(typeId) {
    const types = {
      1: 'Traffic Cabinet',
      2: 'UPS/Misc. Cabinet',
      3: 'Standard Items',
      4: 'Misc. Items',
      5: 'Repair/RMA'
    };
    return types[typeId] || 'Unknown';
  }
  
  /**
   * Get order type display name for New Jobs table (read-only)
   * @param {string|number} orderType - Order type from database
   * @returns {string} Display name for order type
   */
  function getOrderTypeDisplayName(orderType) {
    if (!orderType) {
      return 'Not Set';
    }
    
    // Handle string order types from database (from RMA module)
    if (typeof orderType === 'string') {
      switch (orderType.toLowerCase()) {
        case 'standard':
          return 'Standard';
        case 'rush':
          return 'Rush';
        case 'emergency':
          return 'Emergency';
        case 'warranty':
          return 'Warranty';
        case 'return':
          return 'Return';
        default:
          return orderType; // Return as-is if it's a custom type
      }
    }
    
    // Handle numeric order types (legacy)
    switch (parseInt(orderType)) {
      case 1:
        return 'Traffic Cabinet';
      case 2:
        return 'UPS/Misc. Cabinet';
      case 3:
        return 'Standard Items';
      case 4:
        return 'Misc. Items';
      case 5:
        return 'Repair/RMA';
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Get CSS class for order type styling
   * @param {string|number} orderType - Order type from database
   * @returns {string} CSS class name
   */
  function getOrderTypeCSSClass(orderType) {
    if (!orderType) {
      return 'order-type-not-set';
    }
    
    // Handle string order types from database (from RMA module)
    if (typeof orderType === 'string') {
      switch (orderType.toLowerCase()) {
        case 'standard':
          return 'order-type-standard';
        case 'rush':
          return 'order-type-rush';
        case 'emergency':
          return 'order-type-emergency';
        case 'warranty':
          return 'order-type-warranty';
        case 'return':
          return 'order-type-return';
        default:
          return 'order-type-custom';
      }
    }
    
    // Handle numeric order types (legacy)
    switch (parseInt(orderType)) {
      case 1:
        return 'order-type-traffic-cabinet';
      case 2:
        return 'order-type-ups-cabinet';
      case 3:
        return 'order-type-standard-items';
      case 4:
        return 'order-type-misc-items';
      case 5:
        return 'order-type-repair-rma';
      default:
        return 'order-type-unknown';
    }
  }
  
  /**
   * Populate the orders table with data
   * @param {Array} orders - Array of order objects
   */
  function populateOrdersTable(orders) {
    const tbody = document.getElementById('ordersBody');
    tbody.innerHTML = '';

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data-message">No orders found</td></tr>';
      return;
    }

    orders.forEach(order => {
      // Safely extract acknowledgment number without null
      const ackRaw = order.ORDNUMBER || '';
      const ack = ackRaw.trim();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${order.ORDNUMBER}</td>
        <td>${order.CUSTOMER || ''}</td>
        <td>${order.SHPNAME || ''}</td>
        <td>${order.SALESPER1 || ''}</td>
        <td>${formatDate(order.ORDDATE)}</td>
        <td>${calculateExpectedDate(order.ORDDATE)}</td>
        <td>${order.LOCATION || ''}</td>
        <td>
          <div class="ship-status-container">
            <div class="classification-display">
              <span class="classification-badge ${(order.classification || order.status || 'no-classification').toLowerCase().replace(/\s+/g, '-')}">
                ${order.classification || order.status || 'No Classification'}
              </span>
            </div>
            <div class="status-comment">
              <span class="comment-text">${order.comments || 'No comments'}</span>
              <button class="comment-btn" data-order="${order.ORDNUMBER}" data-customer="${order.CUSTOMER}">
                <i class="fas fa-comment"></i>
              </button>
            </div>
          </div>
        </td>
        <td>
          <span class="order-type-display ${getOrderTypeCSSClass(order.ORDER_TYPE)}">
            ${getOrderTypeDisplayName(order.ORDER_TYPE)}
          </span>
        </td>
        <td>
          <button class="submit-job-btn" data-order="${order.ORDNUMBER}" data-customer="${order.CUSTOMER}" title="Submit Job">
            <i class="fas fa-arrow-right"></i>
          </button>
        </td>
      `;

      // Event listeners are handled by event delegation in attachEventListeners
      // No individual listeners needed here to prevent duplicates

      tbody.appendChild(row);
    });
  }
  
  /**
   * Format date from YYYYMMDD string to readable format
   * @param {string} dateString - Date in YYYYMMDD format or standard format
   * @returns {string} Formatted date string
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    // Handle OEORDH date format (YYYYMMDD string like "20250730")
    if (typeof dateString === 'string' && dateString.length === 8 && /^\d{8}$/.test(dateString)) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString();
    }
    
    // Handle standard date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString();
  }
  
  /**
   * Calculate expected delivery date (14 days after order date)
   * @param {string} dateString - Database timestamp or YYYYMMDD format
   * @returns {string} Formatted expected date
   */
  function calculateExpectedDate(dateString) {
    if (!dateString) return 'N/A';
    
    let date;
    
    // Handle OEORDH date format (YYYYMMDD string like "20250730")
    if (typeof dateString === 'string' && dateString.length === 8 && /^\d{8}$/.test(dateString)) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      // Handle standard date formats
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    date.setDate(date.getDate() + 14); // Add 14 days
    return date.toLocaleDateString();
  }
  
  /**
   * Add refresh listener for new jobs updates
   */
  function addRefreshListener() {
    // Listen for new jobs updates from other modules (like RMA)
    document.addEventListener('new-jobs-updated', (event) => {
      console.log('New Jobs table received update event:', event.detail);
      
      // Refresh the orders table to show the new job
      setTimeout(() => {
        console.log('Refreshing New Jobs table after job submission...');
        loadOrders();
      }, 500); // Small delay to ensure database update is complete
    });
    
    console.log('New Jobs refresh listener added');
  }

  /**
   * Remove existing event listeners to prevent duplicates
   */
  function removeEventListeners() {
    // Only remove specific event listeners that we know about
    // Don't clone elements as it breaks module reloading
    
    // Remove window event listener
    window.removeEventListener('click', handleWindowClick);
    
    // Remove table event listener
    const ordersBody = document.getElementById('ordersBody');
    if (ordersBody) {
      ordersBody.removeEventListener('click', handleTableClick);
    }
    
    console.log('Removed existing event listeners for New Jobs module');
  }
  
  /**
   * Attach event listeners to elements
   */
  function attachEventListeners() {
    console.log('Attaching event listeners for Current Jobs module');
    
    // Comment dialog event listeners
    const closeDialogBtn = commentDialog?.querySelector('.close-dialog');
    const saveCommentBtn = document.getElementById('saveComment');
    const cancelCommentBtn = document.getElementById('cancelComment');
    const ordersBody = document.getElementById('ordersBody');
    
    if (closeDialogBtn) {
      closeDialogBtn.addEventListener('click', handleCloseCommentDialog);
    }
    
    if (saveCommentBtn) {
      saveCommentBtn.addEventListener('click', handleSaveComment);
    }
    
    if (cancelCommentBtn) {
      cancelCommentBtn.addEventListener('click', handleCloseCommentDialog);
    }
    
    if (ordersBody) {
      ordersBody.addEventListener('click', handleTableClick);
    }
    
    // Window click listener for closing dialog
    window.addEventListener('click', handleWindowClick);
    
    // Filter event listeners
    const orderTypeFilter = document.getElementById('orderTypeFilter');
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    const filterToggle = document.getElementById('filterToggle');
    const refreshButton = document.getElementById('refreshButton');
    const quickSearch = document.getElementById('quickSearch');
    const resetFilters = document.getElementById('resetFilters');
    
    if (orderTypeFilter) {
      orderTypeFilter.addEventListener('change', handleOrderTypeChange);
    }
    
    if (applyFilters) {
      applyFilters.addEventListener('click', handleApplyFilters);
    }
    
    if (clearFilters) {
      clearFilters.addEventListener('click', handleClearFilters);
    }
    
    if (filterToggle) {
      filterToggle.addEventListener('click', handleFilterToggle);
    }
    
    if (refreshButton) {
      refreshButton.addEventListener('click', handleRefresh);
    }
    
    if (quickSearch) {
      quickSearch.addEventListener('input', handleQuickSearch);
    }
    
    if (resetFilters) {
      resetFilters.addEventListener('click', handleResetFilters);
    }
    
    console.log('Event listeners attached successfully');
  }

  /**
 * Save comment for an order
 * @param {string} orderId - Order ID
 * @param {string} comment - Comment text
 * @returns {Promise<Object>} Update result
 */
  async function saveComment(orderId, comment) {
    try {
      console.log(`Saving comment for order ${orderId}: ${comment}`);
      const result = await window.electron.ipcRenderer.invoke('update-order-comment', {
        ackNumber: orderId,
        comment: comment
      });
      
      if (result.success) {
        console.log('Comment saved successfully:', result);
        notifications.success('Comment saved successfully!');
        return result;
      } else {
        console.error('Failed to save comment:', result.error);
        notifications.error('Failed to save comment: ' + (result.error || 'Unknown error'));
        throw new Error(result.error || 'Failed to save comment');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      notifications.error('Error saving comment: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }

  /**
   * Handle submit job button click
   * @param {string} orderId - Order ID
   * @param {string} customer - Customer name
   */
  async function handleSubmitJob(orderId, customer) {
    try {
      console.log('=== HANDLE SUBMIT JOB CALLED ===');
      console.log(`Submitting job ${orderId} for customer ${customer}`);
      
      // Get the submit button to show loading state
      const submitBtn = document.querySelector(`.submit-job-btn[data-order="${orderId}"]`);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        submitBtn.title = 'Submitting...';
      }
      
      // Get order type from the table row
      const row = submitBtn?.closest('tr');
      let orderType = 'Standard';
      if (row) {
        const orderTypeElement = row.querySelector('.order-type-display');
        if (orderTypeElement) {
          orderType = orderTypeElement.textContent.trim();
        }
      }
      
      // Call the API to submit the job
      const response = await window.electron.ipcRenderer.invoke('submit-current-job', {
        ackNumber: orderId,
        customer: customer,
        orderType: orderType
      });
      
      if (response && response.success) {
        console.log(`Job ${orderId} submitted successfully`);
        
        // Show success message
        showNotification(`Job ${orderId} for ${customer} has been completed and moved to completed jobs.`, 'success');
        
        // Remove the row from the table with animation
        if (row) {
          row.style.transition = 'all 0.5s ease-out';
          row.style.opacity = '0';
          row.style.transform = 'translateX(100%)';
          row.style.backgroundColor = '#d4edda';
          
          setTimeout(() => {
            row.remove();
            
            // Check if table is now empty
            const tbody = document.getElementById('ordersBody');
            if (tbody && tbody.children.length === 0) {
              tbody.innerHTML = '<tr><td colspan="10" class="no-data-message">No orders found</td></tr>';
            }
          }, 500);
        }
        
        // Dispatch event to refresh other modules if needed
        const refreshEvent = new CustomEvent('job-completed', {
          detail: {
            jobId: orderId,
            customer: customer,
            orderType: orderType,
            timestamp: new Date().toISOString()
          },
          bubbles: true
        });
        document.dispatchEvent(refreshEvent);
        
      } else {
        console.error(`Error submitting job ${orderId}:`, response?.error || 'Unknown error');
        showNotification(`Error submitting job: ${response?.error || 'Unknown error'}`, 'error');
        
        // Reset button on error
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
          submitBtn.title = 'Submit Job';
        }
      }
    } catch (error) {
      console.error('Error in handleSubmitJob:', error);
      showNotification(`Error submitting job: ${error.message || 'Unknown error'}`, 'error');
      
      // Reset button on error
      const submitBtn = document.querySelector(`.submit-job-btn[data-order="${orderId}"]`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        submitBtn.title = 'Submit Job';
      }
    }
  }

  /**
   * Open comment dialog for an order
   * @param {string} orderId - Order ID
   * @param {string} customer - Customer name
   */
  function openCommentDialog(orderId, customer) {
    currentOrderId = orderId;
    document.getElementById('commentOrderId').textContent = orderId;
    document.getElementById('commentCustomer').textContent = customer;
    document.getElementById('commentText').value = '';
    commentDialog.style.display = 'block';
  }

  /**
   * Cleanup function to remove event listeners and reset state.
   */
  function cleanup() {
    console.log('Cleaning up Ticketing module');

    // Remove original event listeners
    document.getElementById('orderTypeFilter')?.removeEventListener('change', handleOrderTypeChange);
    document.getElementById('applyFilters')?.removeEventListener('click', handleApplyFilters);
    document.getElementById('clearFilters')?.removeEventListener('click', handleClearFilters);
    commentDialog?.querySelector('.close-dialog')?.removeEventListener('click', handleCloseCommentDialog);
    document.getElementById('saveComment')?.removeEventListener('click', handleSaveComment);
    document.getElementById('cancelComment')?.removeEventListener('click', handleCloseCommentDialog);
    document.getElementById('ordersBody')?.removeEventListener('click', handleTableClick);
    window.removeEventListener('click', handleWindowClick);
    
    // Remove inline filter event listeners
    document.getElementById('filterToggle')?.removeEventListener('click', handleFilterToggle);
    document.getElementById('refreshButton')?.removeEventListener('click', handleRefresh);
    document.getElementById('quickSearch')?.removeEventListener('input', handleQuickSearch);
    document.getElementById('resetFilters')?.removeEventListener('click', handleResetFilters);
    
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.new-jobs-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Reset state
    ticketingContainer = null;
    commentDialog = null;
    currentOrderId = null;
    window.ticketingModule = null; // Allow for garbage collection
  }

  // Public API
  return {
    initialize,
    cleanup
  };
})();
