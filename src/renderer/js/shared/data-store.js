/**
 * Shared Data Store - For transferring data between modules
 */
const dataStore = (function() {
  // Private variables
  let transferredOrders = [];
  
  /**
   * Add an order to the transferred orders list
   * @param {Object} order - The order to transfer
   */
  function addTransferredOrder(order) {
    transferredOrders.push(order);
    console.log('Order transferred to Current Jobs:', order);
  }
  
  /**
   * Get all transferred orders
   * @returns {Array} Array of transferred orders
   */
  function getTransferredOrders() {
    return [...transferredOrders];
  }
  
  /**
   * Clear transferred orders
   */
  function clearTransferredOrders() {
    transferredOrders = [];
  }
  
  // Public API
  return {
    addTransferredOrder,
    getTransferredOrders,
    clearTransferredOrders
  };
})();

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dataStore;
} else {
  window.dataStore = dataStore;
}
