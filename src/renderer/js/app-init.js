/**
 * Application Initialization Module
 * Handles the loading sequence and initial application setup
 */

// Function to update date and time in the sidebar
function updateDateTime() {
  const now = new Date();
  
  // Format date: DD/MM/YYYY
  const date = now.toLocaleDateString('en-GB');
  document.getElementById('current-date').textContent = date;
  
  // Format time: HH:MM:SS
  const time = now.toLocaleTimeString('en-US');
  document.getElementById('current-time').textContent = time;
}

// Function to load the application after the loading animation
function initializeApp() {
  // Set a timeout to show login screen
  setTimeout(function() {
    document.querySelector('.loading-screen p').textContent = 'Loading application...';
    
    // After a brief delay, hide the loading screen and show the appropriate screen
    setTimeout(function() {
      // Hide the loading screen
      document.getElementById('loading-screen').style.display = 'none';
      
      // Check if user is authenticated
      if (window.checkAuthentication && window.checkAuthentication()) {
        // Show sidebar and dashboard
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('sidebar-toggle').style.display = 'block';
        document.getElementById('dashboard-screen').style.display = 'block';
        
        // Initialize sidebar
        if (window.enhancedSidebar && window.enhancedSidebar.initializeSidebar) {
          window.enhancedSidebar.initializeSidebar();
        }
        
        // Start updating date and time
        updateDateTime();
        setInterval(updateDateTime, 1000);
        
        // Initialize the sidebar state
        const appContainer = document.getElementById('app-container');
        const sidebar = document.getElementById('sidebar');
        
        // Open the sidebar by default
        sidebar.classList.remove('collapsed');
        appContainer.classList.add('sidebar-open');
        
        // Load the dashboard page
        if (window.showScreen) {
          window.showScreen('dashboard');
        }
      } else {
        // Show the login screen and ensure proper styling
        const loginScreen = document.getElementById('login-screen');
        loginScreen.style.display = 'flex';
        loginScreen.className = 'login-container'; // Ensure the proper class is applied
        
        // Make sure login particles container is visible
        const loginParticles = document.getElementById('login-particles');
        if (loginParticles) {
          loginParticles.style.display = 'block';
        }
        
        // Create and add animated background particles
        if (window.loadingAnimation && window.loadingAnimation.createLoginParticles) {
          window.loadingAnimation.createLoginParticles();
        }
        
        // Initialize login logo animation with enhanced effects
        if (window.lottie) {
          const loginLogoAnimation = document.getElementById('login-logo-animation');
          if (loginLogoAnimation) {
            // Clear any existing animations
            loginLogoAnimation.innerHTML = '';
            
            // Initialize the animation with optimized settings for faster loading
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
    }, 1000);
  }, 1500);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Expose functions globally
  window.updateDateTime = updateDateTime;
  window.initializeApp = initializeApp;
  
  // Start the application initialization process
  initializeApp();
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateDateTime,
    initializeApp
  };
} else {
  window.appInit = {
    updateDateTime,
    initializeApp
  };
}
