/**
 * RMA Module - Handles the RMA screen functionality
 * Migrated from the old Ship Status Pro app's orders2025 page
 */

// Allow re-loading by using window assignment instead of const
window.rmaModule = (function() {
  // Private variables
  let rmaContainer = null;

  let shipStatusDialog = null;
  let commentDialog = null;
  let currentOrderId = null;
  let isInitializing = false;
  
  /**
   * Reset module state without nullifying the module reference
   */
  function resetState() {
    console.log('Resetting RMA module state');

    // Remove event listeners
    document.getElementById('rmaApplyFilters')?.removeEventListener('click', handleApplyFilters);
    document.getElementById('rmaClearFilters')?.removeEventListener('click', handleClearFilters);
    shipStatusDialog?.querySelector('.close-dialog')?.removeEventListener('click', handleCloseStatusDialog);
    document.getElementById('saveStatus')?.removeEventListener('click', handleSaveStatus);
    document.getElementById('cancelStatus')?.removeEventListener('click', handleCloseStatusDialog);
    window.removeEventListener('click', handleWindowClick);

    // Reset state variables (but keep module reference intact)
    shipStatusDialog = null;
    commentDialog = null;
    currentOrderId = null;
    isInitializing = false;
  }
  
  /**
   * Initialize the RMA module
   * @param {HTMLElement} container - The RMA container element
   */
  function initialize(container) {
    console.log('RMA module initialize called');
    
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      console.log('Already initializing, skipping');
      return;
    }
    isInitializing = true;
    
    // Reset any existing state
    resetState();
    
    rmaContainer = container;
    
    // Clear any existing content
    rmaContainer.innerHTML = '';
    
    // Create and append the RMA content
    const content = `
      <div class="orders2025-page">
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
            <h1>New Jobs</h1>
          </div>
        </header>
        
        <div class="filters-container">
          <div class="filter-group">
            <label for="rmaCustomerFilter">Customer:</label>
            <input type="text" id="rmaCustomerFilter" placeholder="Filter by customer name">
          </div>
          <div class="filter-group">
            <label for="dateRange">Date Range:</label>
            <input type="date" id="rmaStartDate">
            <span>to</span>
            <input type="date" id="rmaEndDate">
          </div>
          <div class="filter-group">
            <label for="ackRange">Order Number Range:</label>
            <input type="text" id="rmaStartAck" placeholder="Start Order Number">
            <span>to</span>
            <input type="text" id="rmaEndAck" placeholder="End Order Number">
          </div>
          <div class="filter-actions">
            <button id="rmaApplyFilters" class="primary-btn">Apply Filters</button>
            <button id="rmaClearFilters" class="secondary-btn">Clear Filters</button>
          </div>
        </div>
        
        <div class="orders-container">
          <div class="table-container">
            <table id="rmaOrdersTable">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Ship Name</th>
                  <th>Salesperson</th>
                  <th>Order Date</th>
                  <th>Exp Date</th>
                  <th>Location</th>
                  <th>Order Type</th>
                  <th>Ship Status</th>
                  <th>Submit</th>
                </tr>
              </thead>
              <tbody id="rmaOrdersBody">
                <tr>
                  <td colspan="10" class="loading-message">Loading orders...</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination Controls -->
          <div id="paginationContainer" class="pagination-container">
            <!-- Pagination will be dynamically inserted here -->
          </div>
        </div>
      </div>
      

      <!-- Ship Status Dialog -->
      <div id="shipStatusDialog" class="dialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>Update Ship Status</h2>
            <span class="close-dialog">&times;</span>
          </div>
          <div class="dialog-body">
            <div class="order-info">
              <p>Order: <span id="statusOrderId"></span></p>
              <p>Customer: <span id="statusCustomer"></span></p>
            </div>
            <div class="status-form">
              <label for="shipStatus">Ship Status:</label>
              <select id="shipStatus">
                <option value="">Select Status</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="RETURNED">Returned</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div class="dialog-footer">
            <button id="saveStatus" class="primary-btn">Save Status</button>
            <button id="cancelStatus" class="secondary-btn">Cancel</button>
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
    `;
    
    // Set the content
    rmaContainer.innerHTML = content;
    
    // Make the container visible
    rmaContainer.style.display = 'block';
    
    // Initialize date and time display
    if (window.updateDateTime) {
      window.updateDateTime();
    } else {
      updateDateTime();
      setInterval(updateDateTime, 1000);
    }
    
    // Get logged in user info
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('currentUser'));
      if (userInfo) {
        document.getElementById('username').textContent = userInfo.username;
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
    
    // Initialize dialogs
    shipStatusDialog = document.getElementById('shipStatusDialog');
    commentDialog = document.getElementById('commentDialog');
    
    // Initialize comment dialog if it doesn't exist
    if (!commentDialog) {
      initializeCommentDialog();
    }
    
    // Add event listeners
    attachEventListeners();
    
    // Load orders data with a small delay to ensure DOM is ready
    setTimeout(() => {
      console.log('Checking for required DOM elements');
      const ordersBody = document.getElementById('rmaOrdersBody');
      const paginationContainer = document.getElementById('paginationContainer');
      
      console.log('ordersBody found:', !!ordersBody);
      console.log('paginationContainer found:', !!paginationContainer);
      
      if (ordersBody) {
        console.log('DOM ready, loading orders');
        loadOrders();
      } else {
        console.error('ordersBody element not found - DOM may not be ready');
      }
    }, 200);
    
    console.log('RMA module initialized');
    isInitializing = false;
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
   * Remove existing event listeners to prevent duplicates
   */
  function removeEventListeners() {
    // Only remove specific event listeners that we know about
    // Don't clone elements as it breaks module reloading
    
    // Remove window event listener
    window.removeEventListener('click', handleWindowClick);
    
    // Remove table event listener
    const ordersBody = document.getElementById('rmaOrdersBody');
    if (ordersBody) {
      ordersBody.removeEventListener('click', handleTableClick);
    }
    
    console.log('Removed existing event listeners for RMA module');
  }
  
  /**
   * Attach event listeners to elements
   */
  // Event handler functions
  const handleApplyFilters = async () => {
    const filters = {
      customer: document.getElementById('rmaCustomerFilter').value.trim(),
      startDate: document.getElementById('rmaStartDate').value,
      endDate: document.getElementById('rmaEndDate').value,
      startAck: document.getElementById('rmaStartAck').value.trim(),
      endAck: document.getElementById('rmaEndAck').value.trim()
    };
    await loadFilteredOrders(filters);
  };

  const handleClearFilters = () => {
    document.getElementById('rmaCustomerFilter').value = '';
    document.getElementById('rmaStartDate').value = '';
    document.getElementById('rmaEndDate').value = '';
    document.getElementById('rmaStartAck').value = '';
    document.getElementById('rmaEndAck').value = '';
    loadOrders();
  };

  const handleCloseStatusDialog = () => {
    if (shipStatusDialog) shipStatusDialog.style.display = 'none';
  };

  const handleSaveStatus = async () => {
    const status = document.getElementById('shipStatus').value;
    if (status) {
      await updateShipStatus(currentOrderId, status);
      handleCloseStatusDialog();
      loadOrders(); // Reload to show updated status
    } else {
      notifications.warning('Please select a status before saving.');
    }
  };

  const handleCloseCommentDialog = () => {
    closeCommentDialog();
  };

  const handleSaveComment = async () => {
    const commentText = document.getElementById('commentText').value.trim();
    
    if (!commentText) {
      notifications.error('Please enter a comment before saving.');
      return;
    }
    
    const orderIdToUse = currentCommentOrderId || currentOrderId;
    if (!orderIdToUse) {
      notifications.error('No order selected for comment.');
      return;
    }
    
    try {
      await saveComment(orderIdToUse, commentText);
      closeCommentDialog();
      // Table refresh is handled in saveComment function
    } catch (error) {
      console.error('Error saving comment:', error);
      // Error notification is already shown in saveComment function
    }
  };

  const handleTableClick = (event) => {
    const target = event.target.closest('.comment-btn');
    if (target) {
      const orderId = target.dataset.order;
      const customer = target.dataset.customer;
      openCommentDialog(orderId, customer);
    }
  };

  const handleWindowClick = (event) => {
    if (event.target === shipStatusDialog) {
      handleCloseStatusDialog();
    }
    if (event.target === commentDialog) {
      handleCloseCommentDialog();
    }
  };

  function attachEventListeners() {
    document.getElementById('rmaApplyFilters')?.addEventListener('click', handleApplyFilters);
    document.getElementById('rmaClearFilters')?.addEventListener('click', handleClearFilters);
    shipStatusDialog?.querySelector('.close-dialog')?.addEventListener('click', handleCloseStatusDialog);
    document.getElementById('saveStatus')?.addEventListener('click', handleSaveStatus);
    document.getElementById('cancelStatus')?.addEventListener('click', handleCloseStatusDialog);
    
    // Comment dialog event listeners
    commentDialog?.querySelector('.close-dialog')?.addEventListener('click', handleCloseCommentDialog);
    document.getElementById('saveComment')?.addEventListener('click', handleSaveComment);
    document.getElementById('cancelComment')?.addEventListener('click', handleCloseCommentDialog);
    document.getElementById('rmaOrdersBody')?.addEventListener('click', handleTableClick);
    
    window.addEventListener('click', handleWindowClick);
  }
  
  // Current page state
  let currentPage = 1;
  let pageSize = 50;
  let totalPages = 1;
  let isLoading = false; // Prevent multiple simultaneous loads
  let lastLoadTime = 0; // Track last load time to prevent rapid calls
  let hasLoadedOnce = false; // Track if we've successfully loaded once
  let sessionId = Date.now(); // Unique session ID to track navigation
  let currentFilters = null;
  
  /**
   * Load orders data with pagination
   * @param {number} page - Page number to load
   * @param {Event} [event] - Optional event object to detect user clicks
   */
  async function loadOrders(page = 1, event = null) {
    console.log(`[RMA SESSION ${sessionId}] loadOrders called with page ${page}`);
    
    // Prevent multiple simultaneous loads
    if (isLoading) {
      console.log(`Already loading, skipping duplicate call`);
      return;
    }
    
    // Only skip automatic page 1 loads, not explicit user clicks
    if (page === 1 && hasLoadedOnce && !event) {
      console.log(`Automatic page 1 load skipped, but user clicks are allowed`);
      return;
    }
    
    // Prevent rapid successive calls (throttling) - but allow first load
    const now = Date.now();
    if (lastLoadTime && (now - lastLoadTime) < 300) {
      console.log(`Throttling: Last load was ${now - lastLoadTime}ms ago, skipping`);
      return;
    }
    
    // Only throttle automatic reloads, not explicit user clicks
    if (hasLoadedOnce && page === 1 && lastLoadTime && (now - lastLoadTime) < 2000 && !event) {
      console.log('Automatic page 1 reload throttled, but user clicks are allowed');
      return;
    }
    
    lastLoadTime = now;
    
    // Check if DOM elements exist
    const ordersBody = document.getElementById('rmaOrdersBody');
    if (!ordersBody) {
      console.error('ordersBody element not found - DOM may not be ready');
      return;
    }
    
    isLoading = true;
    
    // Update current page
    currentPage = page;
    
    // Show loading message
    ordersBody.innerHTML = '<tr><td colspan="9" class="loading-message">Loading orders...</td></tr>';
    
    // Get orders data with pagination
    getOrders(page, pageSize)
      .then(response => {
        console.log('Orders loaded with pagination:', response);
        
        // Update pagination state
        currentPage = response.pagination.page;
        totalPages = response.pagination.totalPages;
        
        // Populate the table with orders data
        populateOrdersTable(response.orders);
        
        // Update pagination controls
        updatePaginationControls(response.pagination);
        
        // Mark as successfully loaded
        hasLoadedOnce = true;
        
        // Reset loading state
        isLoading = false;
      })
      .catch(error => {
        console.error('Error loading orders:', error);
        const tbody = document.getElementById('ordersBody');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="9" class="error-message">Error loading orders. Please try refreshing the page.</td></tr>';
        }
        
        // Reset loading state
        isLoading = false;
      });
  }
  
  /**
   * Load filtered orders with pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number to load
   * @param {Event} [event] - Optional event object to detect user clicks
   */
  function loadFilteredOrders(filters, page = 1, event = null) {
    // Update current page and filters
    currentPage = page;
    currentFilters = filters;
    
    // Show loading message
    document.getElementById('ordersBody').innerHTML = '<tr><td colspan="9" class="loading-message">Loading filtered orders...</td></tr>';
    
    // Get filtered orders data with pagination
    getFilteredOrders(filters, page, pageSize)
      .then(response => {
        console.log('Filtered orders loaded with pagination:', response);
        
        // Update pagination state
        currentPage = response.pagination.page;
        totalPages = response.pagination.totalPages;
        
        // Populate the table with orders data
        populateOrdersTable(response.orders);
        
        // Update pagination controls
        updatePaginationControls(response.pagination);
      })
      .catch(error => {
        console.error('Error loading filtered orders:', error);
        document.getElementById('ordersBody').innerHTML = '<tr><td colspan="9" class="error-message">Error loading filtered orders: ' + error.message + '</td></tr>';
      });
  }
  
  /**
   * Get orders data with pagination
   * @param {number} page - Page number to load
   * @param {number} pageSize - Number of records per page
   * @returns {Promise<Object>} Object containing orders array and pagination info
   */
  async function getOrders(page = 1, pageSize = 50) {
    try {
      console.log(`Calling get-shipments IPC handler for page ${page}, pageSize ${pageSize}...`);
      // Call the IPC handler to get shipments from the database with pagination
      const response = await window.electron.ipcRenderer.invoke('get-shipments', { page, pageSize });
      
      console.log('Got response from get-shipments:', response);
      
      if (response.success) {
        console.log(`Processing ${response.data.length} shipments from classification table (page ${page} of ${response.pagination.totalPages})`);
        
        // Map the database fields to the expected format (now from JOIN with OEORDH)
        const orders = await Promise.all(response.data.map(async (order) => {
          
          // Load comments for this order
          let comments = '';
          try {
            const commentsResponse = await window.electron.ipcRenderer.invoke('get-order-comments', {
              ackNumber: order.ack_number
            });
            
            if (commentsResponse.success && commentsResponse.comments && commentsResponse.comments.length > 0) {
              // Get the most recent comment
              comments = commentsResponse.comments[0].comment_text || '';
              console.log(`Loaded comment for ${order.ack_number}:`, comments);
            }
          } catch (commentError) {
            console.warn(`Failed to load comments for ${order.ack_number}:`, commentError);
          }
          
          const mappedOrder = {
            ack_number: order.ack_number || 'Unknown',
            ORDNUMBER: order.ack_number || 'Unknown',
            CUSTOMER: order.CUSTOMER || 'Unknown Customer',
            SHPNAME: order.SHPNAME || 'Unknown Ship Name',
            SALESPER1: order.SALESPER1 || 'N/A',
            ORDDATE: order.ORDDATE, // Keep raw date for formatDate function
            EXPDATE: order.EXPDATE, // Keep raw date for formatDate function
            LOCATION: order.LOCATION || 'Unknown',
            classification: order.classification || order.status || 'No Classification',
            status: order.status || order.classification || 'No Classification',
            comments: comments, // Load actual comments from database
            COMMENTS: comments, // Legacy field for user comments
            order_type: order.order_type // Use database value (can be NULL)
          };
          
          return mappedOrder;
        }));
        
        return {
          orders,
          pagination: response.pagination
        };
      } else {
        console.error('Error fetching orders:', response.error);
        return { orders: [], pagination: { page, pageSize, totalCount: 0, totalPages: 0 } };
      }
    } catch (error) {
      console.error('Error in getOrders:', error);
      return { orders: [], pagination: { page, pageSize, totalCount: 0, totalPages: 0 } };
    }
  }
  
  /**
   * Get filtered orders data with pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number to load
   * @param {number} pageSize - Number of records per page
   * @returns {Promise<Object>} Object containing orders array and pagination info
   */
  async function getFilteredOrders(filters, page = 1, pageSize = 50) {
    try {
      console.log(`Getting filtered orders for page ${page}, pageSize ${pageSize}`);
      
      // Prepare filter data for the IPC call
      const filterData = {
        status: filters.status || null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null
      };
      
      // Call the IPC handler to get filtered shipments with pagination
      const response = await window.electron.ipcRenderer.invoke('get-filtered-shipments', {
        filters: filterData,
        page,
        pageSize
      });
      
      if (response.success) {
        console.log(`Processing ${response.data.length} filtered shipments (page ${page} of ${response.pagination.totalPages})`);
        
        // Map the database fields to the expected format (now from JOIN with OEORDH)
        const orders = response.data.map(order => {
          console.log('Mapping filtered order from JOIN:', order.ack_number, 'Customer:', order.CUSTOMER);
          
          return {
            ack_number: order.ack_number || 'Unknown',
            ORDNUMBER: order.ack_number || 'Unknown',
            CUSTOMER: order.CUSTOMER || 'Unknown Customer',
            SHPNAME: order.SHPNAME || 'Unknown Ship Name',
            SALESPER1: order.SALESPER1 || 'N/A',
            ORDDATE: order.ORDDATE, // Keep raw date for formatDate function
            EXPDATE: order.EXPDATE, // Keep raw date for formatDate function
            LOCATION: order.LOCATION || 'Unknown',
            classification: order.classification || order.status || 'No Classification',
            status: order.status || order.classification || 'No Classification',
            comments: '', // Separate field for user comments
            COMMENTS: '', // Legacy field for user comments
            order_type: order.order_type // Use database value (can be NULL)
          };
        });
        
        // Additional client-side filtering for customer name (if provided)
        if (filters.customer) {
          orders = orders.filter(order => 
            order.CUSTOMER.toLowerCase().includes(filters.customer.toLowerCase())
          );
        }
        
        return {
          orders,
          pagination: response.pagination
        };
      } else {
        console.error('Error fetching filtered orders:', response.error);
        return { orders: [], pagination: { page, pageSize, totalCount: 0, totalPages: 0 } };
      }
    } catch (error) {
      console.error('Error in getFilteredOrders:', error);
      return { orders: [], pagination: { page, pageSize, totalCount: 0, totalPages: 0 } };
    }
  }
  
  /**
   * Save the shipment status
   * @param {string} ackNumber - The ACK number
   * @param {string} status - The new status
   */
  async function saveShipmentStatus(ackNumber, status) {
    try {
      console.log(`Saving status for ${ackNumber}: ${status}`);
      const response = await window.electron.ipcRenderer.invoke('update-shipment-status', {
        ackNumber,
        status
      });
      
      if (response.success) {
        console.log(`Status updated for ${ackNumber}: ${status}`);
        // Refresh the orders list
        await loadOrders();
      } else {
        console.error('Error updating status:', response.error);
        notifications.error('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error in saveShipmentStatus:', error);
      notifications.error('An error occurred while updating the status.');
    }
  }
  
  /**
   * Save comment for an order (updates classification in shipment_classification table)
   * @param {string} orderId - Order ID (ack_number)
   * @param {string} comment - Comment text (classification)
   * @returns {Promise<Object>} Update result
   */
  async function saveShipmentClassification(orderId, comment) {
    try {
      console.log(`Saving comment for ${orderId}: ${comment}`);
      const response = await window.electron.ipcRenderer.invoke('update-order-comment', {
        ackNumber: orderId,
        comment: comment
      });
      
      if (response.success) {
        console.log(`Comment updated for ${orderId}: ${comment}`);
        // Refresh the orders list
        await loadOrders();
      } else {
        console.error('Error updating comment:', response.error);
        notifications.error('Failed to update comment. Please try again.');
      }
    } catch (error) {
      console.error('Error in saveShipmentClassification:', error);
      notifications.error('An error occurred while updating the comment.');
    }
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
        
        // Refresh the table to show the updated comment
        console.log('Refreshing table to show updated comment...');
        await loadOrders(currentPage);
        
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
   * Open comment dialog for an order
   * @param {string} orderId - Order ID
   * @param {string} customer - Customer name
   */
  function openCommentDialog(orderId, customer) {
    console.log('Opening comment dialog for order:', orderId, 'customer:', customer);
    
    // Initialize comment dialog if it doesn't exist
    if (!commentDialog) {
      initializeCommentDialog();
    }
    
    currentOrderId = orderId;
    currentCommentOrderId = orderId;
    document.getElementById('commentOrderId').textContent = orderId;
    document.getElementById('commentCustomer').textContent = customer;
    document.getElementById('commentText').value = '';
    commentDialog.style.display = 'block';
    document.getElementById('commentText').focus();
  }
  
  // saveOrderType function is defined later in the file
  
  /**
   * Open ship status dialog for an order
   * @param {string} orderId - Order ID
   * @param {string} customer - Customer name
   * @param {string} currentStatus - Current ship status
   */
  function openShipStatusDialog(orderId, customer, currentStatus) {
    currentOrderId = orderId;
    document.getElementById('statusOrderId').textContent = orderId;
    document.getElementById('statusCustomer').textContent = customer;
    document.getElementById('shipStatus').value = currentStatus || '';
    shipStatusDialog.style.display = 'block';
  }
  
  /**
   * Update pagination controls based on pagination data
   * @param {Object} pagination - Pagination information
   */
  function updatePaginationControls(pagination) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) {
      console.error('Pagination container not found');
      return;
    }
    
    // Clear existing pagination controls
    paginationContainer.innerHTML = '';
    
    // Create pagination info text
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.totalCount} total records)`;
    paginationContainer.appendChild(paginationInfo);
    
    // Create pagination buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'pagination-buttons';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.textContent = '← Previous';
    prevButton.disabled = pagination.page <= 1;
    prevButton.addEventListener('click', (event) => {
      if (currentFilters) {
        loadFilteredOrders(currentFilters, currentPage - 1, event);
      } else {
        loadOrders(currentPage - 1, event);
      }
    });
    buttonsContainer.appendChild(prevButton);
    
    // Page number buttons (show up to 5 pages)
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `pagination-btn ${i === pagination.page ? 'active' : ''}`;
      pageButton.textContent = i.toString();
      pageButton.addEventListener('click', (event) => {
        if (currentFilters) {
          loadFilteredOrders(currentFilters, i, event);
        } else {
          loadOrders(i, event);
        }
      });
      buttonsContainer.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.textContent = 'Next →';
    nextButton.disabled = pagination.page >= pagination.totalPages;
    nextButton.addEventListener('click', (event) => {
      if (currentFilters) {
        loadFilteredOrders(currentFilters, currentPage + 1, event);
      } else {
        loadOrders(currentPage + 1, event);
      }
    });
    buttonsContainer.appendChild(nextButton);
    
    paginationContainer.appendChild(buttonsContainer);
  }
  
  /**
   * Populate the orders table with data
   * @param {Array} orders - Array of order objects
   */
  function populateOrdersTable(orders) {
    console.log('populateOrdersTable called with', orders?.length, 'orders');
    
    const tbody = document.getElementById('rmaOrdersBody');
    if (!tbody) {
      console.error('rmaOrdersBody element not found');
      return;
    }
    
    tbody.innerHTML = '';

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data-message">No orders found</td></tr>';
      return;
    }

    orders.forEach((order, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${order.ack_number || order.ORDNUMBER}</td>
        <td>${order.CUSTOMER || ''}</td>
        <td>${order.SHPNAME || ''}</td>
        <td>${order.SALESPER1 || ''}</td>
        <td>${formatDate(order.ORDDATE)}</td>
        <td>${formatDate(order.EXPDATE)}</td>
        <td>${(() => {
          console.log('Location value for order', order.ack_number, ':', order.LOCATION, 'Type:', typeof order.LOCATION);
          if (order.LOCATION === '1' || order.LOCATION === 1) return 'Ontario';
          if (order.LOCATION === '3' || order.LOCATION === 3) return 'Quebec';
          return order.LOCATION || 'Unknown';
        })()}</td>
        <td>
          <select class="order-type-dropdown" data-order="${order.ack_number || order.ORDNUMBER}" data-previous-value="${order.order_type || ''}">
            <option value="" ${!order.order_type ? 'selected' : ''}>-- Select Type --</option>
            <option value="Standard Items" ${order.order_type === 'Standard Items' ? 'selected' : ''}>Standard Items</option>
            <option value="Traffic Cabinets" ${order.order_type === 'Traffic Cabinets' ? 'selected' : ''}>Traffic Cabinets</option>
            <option value="UPS/Misc. Cabinets" ${order.order_type === 'UPS/Misc. Cabinets' ? 'selected' : ''}>UPS/Misc. Cabinets</option>
            <option value="Misc. Items" ${order.order_type === 'Misc. Items' ? 'selected' : ''}>Misc. Items</option>
            <option value="Repair/RMA" ${order.order_type === 'Repair/RMA' ? 'selected' : ''}>Repair/RMA</option>
          </select>
        </td>
        <td>
          <div class="ship-status-container">
            <div class="classification-display">
              <span class="classification-badge ${(order.classification || order.status || 'no-classification').toLowerCase().replace(/\s+/g, '-')}">
                ${order.classification || order.status || 'No Classification'}
              </span>
            </div>
            <div class="status-comment">
              <div class="comment-text">${order.comments || 'No comments'}</div>
              <button class="comment-btn" data-order="${order.ack_number || order.ORDNUMBER}" data-customer="${order.CUSTOMER || ''}" title="Edit Comment">
                <i class="fas fa-pencil-alt"></i>
              </button>
            </div>
          </div>
        </td>
        <td>
          <button class="submit-job-btn" data-order="${order.ack_number || order.ORDNUMBER}" data-customer="${order.CUSTOMER || ''}" title="Submit to New Jobs">
            <i class="fas fa-arrow-right"></i>
          </button>
        </td>
      `;

      // Add event listeners for order type dropdown, submit button, and comment button
      const orderTypeDropdown = row.querySelector('.order-type-dropdown');
      const submitJobBtn = row.querySelector('.submit-job-btn');
      const commentBtn = row.querySelector('.comment-btn');
      
      orderTypeDropdown.addEventListener('change', () => {
        const orderId = orderTypeDropdown.dataset.order;
        const currentValue = orderTypeDropdown.value;
        
        // Get the previous value from the data attribute
        const previousValue = orderTypeDropdown.dataset.previousValue || '';
        
        // Update the previous value to the current value before saving
        orderTypeDropdown.dataset.previousValue = currentValue;
        
        // Save the new value
        saveOrderType(orderId, currentValue);
      });
      
      // Add event listener for submit button
      submitJobBtn.addEventListener('click', () => {
        const orderId = submitJobBtn.dataset.order;
        const customer = submitJobBtn.dataset.customer;
        submitJobToNewJobs(orderId, customer, order);
      });
      
      // Comment button event listener handled by event delegation in handleTableClick
      // No individual listener needed to prevent duplicates

      tbody.appendChild(row);
    });
    
    console.log('Table populated with', tbody.children.length, 'rows');
    
    // Simple CSS fix - force table visibility (RMA screen only)
    const rmaScreen = document.getElementById('rma-screen');
    if (rmaScreen && rmaScreen.style.display !== 'none') {
      const table = document.getElementById('rmaOrdersTable');
      const tableContainer = table?.parentElement;
      const ordersContainer = tableContainer?.parentElement;
      
      if (table && table.offsetHeight === 0) {
        console.log('Applying RMA-specific CSS fixes for table visibility');
        
        // Force all containers to be visible (only within RMA screen)
        if (ordersContainer && ordersContainer.closest('#rma-screen')) {
          ordersContainer.style.display = 'block';
          ordersContainer.style.minHeight = '500px';
        }
        if (tableContainer && tableContainer.closest('#rma-screen')) {
          tableContainer.style.display = 'block';
          tableContainer.style.minHeight = '400px';
        }
        if (table && table.closest('#rma-screen')) {
          table.style.display = 'table';
          table.style.width = '100%';
        }
      }
    }
  }
  
  /**
   * Get status label from status code
   * @param {string} status - Status code
   * @returns {string} Status label
   */
  function getStatusLabel(status) {
    switch (status) {
      case 'NEW':
        return 'New';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'SHIPPED':
        return 'Shipped';
      case 'DELIVERED':
        return 'Delivered';
      case 'RETURNED':
        return 'Returned';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'New';
    }
  }
  
  /**
   * Parse source tables string to extract customer info
   * @param {string} sourceTables - Source tables string
   * @returns {Object} Extracted customer info
   */
  function parseSourceTables(sourceTables) {
    if (!sourceTables) {
      return { customer: '', shipName: '', salesperson: '' };
    }
    
    // Extract table names from the source_tables field
    const tables = sourceTables.split(',').map(t => t.trim());
    
    // Default info
    const info = {
      customer: 'Customer ' + tables.join('-'),
      shipName: 'Ship to ' + tables[0],
      salesperson: 'Sales Rep'
    };
    
    // For OEORDH table, we would normally extract customer name
    if (tables.includes('OEORDH')) {
      info.customer = 'Customer from OEORDH';
      info.shipName = 'Ship to from OEORDH';
    }
    
    // For OESHID table, we would normally extract shipping info
    if (tables.includes('OESHID')) {
      info.shipName = 'Ship to from OESHID';
    }
    
    return info;
  }
  
  /**
   * Format date from database timestamp or OEORDH date string
   * @param {string} dateString - Database timestamp or YYYYMMDD format
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
   * Get location based on system status
   * @param {number} status - System status code
   * @returns {string} Location description
   */
  function getLocationFromStatus(status) {
    switch (status) {
      case 0:
        return 'Receiving';
      case 1:
        return 'Processing';
      case 2:
        return 'Assembly';
      case 3:
        return 'Testing';
      case 4:
        return 'Quality Control';
      case 5:
        return 'Shipping';
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Save order type to database
   * @param {string} orderId - Order ID (ack_number)
   * @param {string} orderType - New order type
   */
  async function saveOrderType(orderId, orderType) {
    try {
      if (!orderId) {
        console.error('Missing order ID in saveOrderType');
        notifications.error('Error: Missing order ID. Please try again.');
        return;
      }

      // Convert empty string to null for database storage
      const typeValue = orderType === '' ? null : orderType;
      console.log(`Saving order type for ${orderId}: ${typeValue === null ? 'NULL' : typeValue}`);
      
      // Show saving indicator
      const dropdown = document.querySelector(`.order-type-dropdown[data-order="${orderId}"]`);
      if (dropdown) {
        dropdown.disabled = true;
        dropdown.style.opacity = '0.7';
      }
      
      const response = await window.electron.ipcRenderer.invoke('update-order-type', {
        ackNumber: orderId,
        orderType: typeValue
      });
      
      // Re-enable dropdown
      if (dropdown) {
        dropdown.disabled = false;
        dropdown.style.opacity = '1';
      }
      
      if (response.success) {
        console.log(`Order type saved successfully for ${orderId}`);
        // Add visual feedback - highlight the row without changing status
        if (dropdown) {
          // Highlight the dropdown
          dropdown.style.backgroundColor = '#d4edda';
          setTimeout(() => {
            dropdown.style.backgroundColor = '';
          }, 1000);
          
          // Highlight the entire row
          const row = dropdown.closest('tr');
          if (row) {
            // Add a temporary highlight class
            row.classList.add('row-updated');
            setTimeout(() => {
              row.classList.remove('row-updated');
            }, 2000);
          }
        }
      } else {
        console.error('Failed to save order type:', response.error);
        notifications.error('Failed to update order type: ' + (response.error || 'Unknown error'));
        // Reset dropdown to previous value if we know it
        if (dropdown && dropdown.dataset.previousValue) {
          dropdown.value = dropdown.dataset.previousValue;
        }
      }
    } catch (error) {
      console.error('Error saving order type:', error);
      notifications.error('Error updating order type: ' + (error.message || 'Unknown error'));
    }
  }
  
  /**
   * Submit a job from RMA to New Jobs table
   * @param {string} orderId - Order ID (ack_number)
   * @param {string} customer - Customer name
   * @param {Object} orderData - Full order data object
   */
  async function submitJobToNewJobs(orderId, customer, orderData) {
    try {
      if (!orderId) {
        console.error('Missing order ID in submitJobToNewJobs');
        notifications.error('Error: Missing order ID. Please try again.');
        return;
      }
      
      // Show loading indicator on the button
      const submitBtn = document.querySelector(`.submit-job-btn[data-order="${orderId}"]`);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        submitBtn.title = 'Submitting...';
      }
      
      // Get the order type from the dropdown
      const orderTypeDropdown = document.querySelector(`.order-type-dropdown[data-order="${orderId}"]`);
      const orderType = orderTypeDropdown ? orderTypeDropdown.value : null;
      
      // Make sure order type is selected before submitting
      if (!orderType) {
        notifications.warning('Please select an Order Type before submitting this job.');
        
        // Reset button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
          submitBtn.title = 'Submit to New Jobs';
        }
        return;
      }
      
      console.log(`Submitting job ${orderId} to New Jobs table with order type: ${orderType}`);
      
      // Call the API to submit the job
      const response = await window.electron.ipcRenderer.invoke('submit-job-to-new', {
        ackNumber: orderId,
        orderType: orderType,
        customer: customer,
        // Include any other necessary data
        orderData: {
          classification: orderData.classification || orderData.status,
          comments: orderData.comments || orderData.COMMENTS,
          location: orderData.LOCATION
        }
      });
      
      // Reset button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        submitBtn.title = 'Submit to New Jobs';
      }
      
      if (response.success) {
        console.log(`Job ${orderId} submitted successfully to New Jobs`);
        
        // Show success message
        notifications.success(`Job ${orderId} for ${customer} has been successfully submitted to New Jobs.`);
        
        // Highlight the row to indicate submission but don't change the status
        const row = submitBtn?.closest('tr');
        if (row) {
          // Add a submitted class to the row for styling
          row.classList.add('row-submitted');
          
          // Add a visual indicator that it's been submitted without changing the status
          const submitCell = submitBtn.closest('td');
          if (submitCell) {
            // Add a small badge or indicator next to the submit button
            const indicator = document.createElement('span');
            indicator.className = 'submitted-indicator';
            indicator.innerHTML = '<i class="fas fa-check" style="color: green; margin-left: 5px;"></i>';
            submitCell.appendChild(indicator);
          }
        }
        
        // Dispatch a custom event to notify other modules (like New Jobs) to refresh their data
        const refreshEvent = new CustomEvent('new-jobs-updated', {
          detail: {
            jobId: orderId,
            orderType: orderType,
            customer: customer,
            timestamp: new Date().toISOString()
          },
          bubbles: true
        });
        document.dispatchEvent(refreshEvent);
        console.log('Dispatched new-jobs-updated event to trigger refresh in other modules');
      } else {
        console.error(`Error submitting job ${orderId}:`, response.error);
        notifications.error(`Error submitting job: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in submitJobToNewJobs:', error);
      notifications.error(`Error submitting job: ${error.message || 'Unknown error'}`);
      
      // Reset button on error
      const submitBtn = document.querySelector(`.submit-job-btn[data-order="${orderId}"]`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        submitBtn.title = 'Submit to New Jobs';
      }
    }
  }
  
  // Comment dialog variables
  let currentCommentOrderId = null;
  
  /**
   * Initialize comment dialog
   */
  function initializeCommentDialog() {
    // Create comment dialog HTML if it doesn't exist
    if (!document.getElementById('commentDialog')) {
      const dialogHTML = `
        <div id="commentDialog" class="dialog-overlay" style="display: none;">
          <div class="dialog-content">
            <div class="dialog-header">
              <h3>Add Comment</h3>
              <button class="close-dialog" id="closeCommentDialog">&times;</button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label>Order ID:</label>
                <span id="commentOrderId"></span>
              </div>
              <div class="form-group">
                <label>Customer:</label>
                <span id="commentCustomer"></span>
              </div>
              <div class="form-group">
                <label for="commentText">Comment:</label>
                <textarea id="commentText" rows="4" placeholder="Enter your comment here..."></textarea>
              </div>
            </div>
            <div class="dialog-footer">
              <button id="saveCommentBtn" class="btn btn-primary">Save Comment</button>
              <button id="cancelCommentBtn" class="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', dialogHTML);
    }
    
    commentDialog = document.getElementById('commentDialog');
    
    // Add event listeners for comment dialog
    document.getElementById('closeCommentDialog')?.addEventListener('click', closeCommentDialog);
    document.getElementById('saveCommentBtn')?.addEventListener('click', handleSaveComment);
    document.getElementById('cancelCommentBtn')?.addEventListener('click', closeCommentDialog);
    
    // Close dialog when clicking outside
    commentDialog?.addEventListener('click', (e) => {
      if (e.target === commentDialog) {
        closeCommentDialog();
      }
    });
  }
  
  /**
   * Close comment dialog
   */
  function closeCommentDialog() {
    if (commentDialog) {
      commentDialog.style.display = 'none';
    }
    currentCommentOrderId = null;
    document.getElementById('commentText').value = '';
  }
  
  /**
   * Cleanup function to remove event listeners and reset state
   */
  function cleanup() {
    console.log('Cleaning up RMA module');

    // Remove event listeners
    document.getElementById('rmaApplyFilters')?.removeEventListener('click', handleApplyFilters);
    document.getElementById('rmaClearFilters')?.removeEventListener('click', handleClearFilters);
    shipStatusDialog?.querySelector('.close-dialog')?.removeEventListener('click', handleCloseStatusDialog);
    document.getElementById('saveStatus')?.removeEventListener('click', handleSaveStatus);
    document.getElementById('cancelStatus')?.removeEventListener('click', handleCloseStatusDialog);
    window.removeEventListener('click', handleWindowClick);

    // Reset state variables
    rmaContainer = null;
    shipStatusDialog = null;
    commentDialog = null;
    currentOrderId = null;
    currentCommentOrderId = null;
    isInitializing = false;
    window.rmaModule = null; // Allow for garbage collection and re-loading
  }

  // Public API
  return {
    initialize,
    cleanup
  };
})();
