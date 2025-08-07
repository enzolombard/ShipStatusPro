/**
 * Login Module
 * Handles user authentication and login form UI
 */

// Use an IIFE to encapsulate the module
const loginModule = (function() {
  // Module variables
  let isLoggingIn = false;
  
  /**
   * Initialize the login module
   * @param {HTMLElement} containerElement - The container element with the login form
   */
  function initialize(containerElement) {
    // We don't need to render the form since it already exists in the HTML
    // Just attach event listeners to the existing form
    attachEventListeners();
    
    // Ensure login container has the correct class
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.className = 'login-container';
    }
    
    // Make sure login particles container is visible
    const loginParticles = document.getElementById('login-particles');
    if (loginParticles) {
      loginParticles.style.display = 'block';
    }
    
    // Initialize login particles if the loading animation module is available
    if (window.loadingAnimation && window.loadingAnimation.createLoginParticles) {
      // Use setTimeout to ensure the DOM is fully ready
      setTimeout(() => {
        window.loadingAnimation.createLoginParticles();
      }, 100);
    }
    
    // Initialize login logo animation with enhanced effects - no delay for faster loading
    if (window.lottie) {
      const loginLogoAnimation = document.getElementById('login-logo-animation');
      if (loginLogoAnimation) {
        // Clear any existing animations
        loginLogoAnimation.innerHTML = '';
        
        // Initialize immediately for faster loading
        lottie.loadAnimation({
          container: loginLogoAnimation,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '../../public/animations/loading.json',
          rendererSettings: {
            progressiveLoad: false, // Load all at once for faster display
            preserveAspectRatio: 'xMidYMid meet'
          }
        });
      }
    }
  }

  /**
   * Attach event listeners to form elements
   */
  function attachEventListeners() {
    // Add submit event listener to the login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }
  }
  
  /**
   * Show an error message with animation
   * @param {string} type - The type of error (username-error, password-error, connection-error, etc.)
   * @param {string} message - The error message to display
   */
  function showErrorMessage(type, message) {
    // Get error message container
    const errorMsgElement = document.getElementById('error-message');
    if (!errorMsgElement) return;
    
    // Clear previous error message
    errorMsgElement.className = '';
    errorMsgElement.innerHTML = '';
    
    // Set appropriate icon and class based on error type
    let icon = '';
    if (type === 'username-error') {
      icon = '<i class="fas fa-user-slash"></i>';
      errorMsgElement.className = 'error-message username-error';
    } else if (type === 'password-error') {
      icon = '<i class="fas fa-lock"></i>';
      errorMsgElement.className = 'error-message password-error';
    } else if (type === 'connection-error') {
      icon = '<i class="fas fa-plug"></i>';
      errorMsgElement.className = 'error-message connection-error';
    } else {
      icon = '<i class="fas fa-exclamation-triangle"></i>';
      errorMsgElement.className = 'error-message';
    }
    
    // Set error message content
    errorMsgElement.innerHTML = icon + message;
    errorMsgElement.style.display = 'flex';
    
    // Add shake animation
    setTimeout(() => {
      errorMsgElement.classList.add('shake');
    }, 100);
    
    // Remove shake animation after it completes
    setTimeout(() => {
      errorMsgElement.classList.remove('shake');
    }, 600);
    
    // Add pulse animation for subtle highlighting
    setTimeout(() => {
      errorMsgElement.classList.add('pulse');
    }, 100);
    
    // Hide the error message after 5 seconds
    setTimeout(() => {
      errorMsgElement.style.display = 'none';
    }, 5000);
  }
  
  /**
   * Simple error message display (for backward compatibility)
   * @param {string} message - The error message to display
   */
  function showError(message) {
    showErrorMessage('both-error', message);
  }
  
  /**
   * Handle login form submission
   * @param {Event} event - The form submit event
   */
  async function handleLogin(event) {
    event.preventDefault();
    
    if (isLoggingIn) return;
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const errorMsg = document.getElementById('error-message');
    
    if (!usernameInput || !passwordInput || !loginButton) return;
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    // Validate inputs
    if (!username && !password) {
      showErrorMessage('both-error', 'Please enter both username and password');
      return;
    } else if (!username) {
      showErrorMessage('username-error', 'Please enter your username');
      return;
    } else if (!password) {
      showErrorMessage('password-error', 'Please enter your password');
      return;
    }
    
    // Clear any previous errors
    if (errorMsg) errorMsg.style.display = 'none';
    
    // Show loading state
    isLoggingIn = true;
    loginButton.innerHTML = '<span class="spinner"></span> Logging in...';
    loginButton.disabled = true;
    
    try {
      // Call the login API
      const result = await window.electron.ipcRenderer.invoke('login', { username, password });
      
      if (result.success) {
        // Store user info in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(result.data));
        
        // Hide login screen
        document.getElementById('login-screen').style.display = 'none';
        
        // Ensure sidebar elements are visible
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const dashboardScreen = document.getElementById('dashboard-screen');
        const appContainer = document.getElementById('app-container');
        
        sidebar.style.display = 'block';
        sidebarToggle.style.display = 'block';
        dashboardScreen.style.display = 'block';
        
        // Capitalize first letter of username if it's not already capitalized
        let displayUsername = username;
        if (displayUsername && displayUsername.length > 0) {
          displayUsername = displayUsername.charAt(0).toUpperCase() + displayUsername.slice(1);
        }
        
        // Set the username in the sidebar
        document.getElementById('sidebar-username').textContent = displayUsername;
        
        // Start updating date and time
        if (typeof window.updateDateTime === 'function') {
          window.updateDateTime();
          setInterval(window.updateDateTime, 1000);
        }
        
        // Make sure sidebar is open
        sidebar.classList.remove('collapsed');
        appContainer.classList.add('sidebar-open');
        
        console.log('Login successful, showing dashboard');
        
        // Show the dashboard screen
        if (typeof window.showScreen === 'function') {
          window.showScreen('dashboard');
        }
      } else {
        // Show specific error message based on error type
        if (result.errorType === 'username') {
          showErrorMessage('username-error', result.error || 'Username not found');
        } else if (result.errorType === 'password') {
          showErrorMessage('password-error', result.error || 'Incorrect password');
        } else {
          showErrorMessage('both-error', result.error || 'Login failed. Please try again.');
        }
        
        // Reset login button
        loginButton.innerHTML = 'Log In';
        loginButton.disabled = false;
      }
    } catch (error) {
      console.error('Login error:', error);
      // Show connection error message
      showErrorMessage('connection-error', 'Connection error. Please try again.');
      
      // Reset login button
      loginButton.innerHTML = 'Log In';
      loginButton.disabled = false;
    } finally {
      // Reset loading state
      isLoggingIn = false;
    }
  }

  // Public API
  return {
    initialize,
    showErrorMessage,
    handleLogin,
    showError
  };
})();

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = loginModule;
} else {
  // For browser environments
  window.loginModule = loginModule;
}

// Always expose the module to the window object for use in other scripts
window.loginModule = loginModule;

// Initialize the login module when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get the login container element
  const loginContainer = document.getElementById('login-screen');
  if (loginContainer) {
    // Initialize the login module
    loginModule.initialize(loginContainer);
  }
});
