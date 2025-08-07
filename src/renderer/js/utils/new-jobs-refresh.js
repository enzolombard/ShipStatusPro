/**
 * New Jobs Refresh Utility
 * 
 * This utility provides functions to listen for job submission events
 * and refresh the New Jobs table when jobs are submitted from other modules.
 */

/**
 * Initialize the New Jobs refresh listener
 * @param {Function} refreshCallback - Function to call when a job is submitted
 * @returns {Function} Cleanup function to remove the event listener
 */
function initNewJobsRefreshListener(refreshCallback) {
  if (!refreshCallback || typeof refreshCallback !== 'function') {
    console.error('Invalid refresh callback provided to initNewJobsRefreshListener');
    return () => {}; // Return empty cleanup function
  }
  
  // Define the event handler
  const handleNewJobsUpdated = (event) => {
    console.log('New Jobs update event received:', event.detail);
    
    // Call the refresh callback with the event details
    refreshCallback(event.detail);
  };
  
  // Add the event listener
  document.addEventListener('new-jobs-updated', handleNewJobsUpdated);
  
  console.log('New Jobs refresh listener initialized');
  
  // Return a cleanup function
  return () => {
    document.removeEventListener('new-jobs-updated', handleNewJobsUpdated);
    console.log('New Jobs refresh listener removed');
  };
}

/**
 * Trigger a manual refresh of the New Jobs table
 * @param {Object} details - Optional details about the refresh trigger
 */
function triggerNewJobsRefresh(details = {}) {
  const refreshEvent = new CustomEvent('new-jobs-updated', {
    detail: {
      ...details,
      timestamp: new Date().toISOString(),
      manual: true
    },
    bubbles: true
  });
  
  document.dispatchEvent(refreshEvent);
  console.log('Manual New Jobs refresh triggered');
}

// Export the functions
module.exports = {
  initNewJobsRefreshListener,
  triggerNewJobsRefresh
};
