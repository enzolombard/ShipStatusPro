/**
 * Screen Controller Module
 * Handles navigation between different screens/pages in the application
 */

// Function to show different screens
let currentModule = null;
let currentScreenName = null;

function showScreen(screenName) {
  // Store the old screen name before updating
  const oldScreenName = currentScreenName;
  
  // If a module is currently active, call its cleanup function
  if (currentModule && typeof currentModule.cleanup === 'function') {
    console.log(`Cleaning up module: ${oldScreenName}`);
    currentModule.cleanup();
  }

  // Remove the old script tag to allow for re-loading
  if (oldScreenName) {
    const oldScript = document.getElementById(`${oldScreenName}-script`);
    if (oldScript) {
      console.log(`Removing old script: ${oldScreenName}-script`);
      oldScript.remove();
    }
  }

  // Also remove any scripts that might not have proper IDs
  const allScripts = document.querySelectorAll('script[src*="/pages/"]');
  allScripts.forEach(script => {
    if (script.src.includes('/pages/rma/') || script.src.includes('/pages/ticketing/')) {
      console.log(`Removing script: ${script.src}`);
      script.remove();
    }
  });

  // Cleanup current module before switching
  if (currentModule && typeof currentModule.cleanup === 'function') {
    console.log('Cleaning up current module before switching');
    currentModule.cleanup();
  }
  
  // Update the current screen name and reset the module
  currentScreenName = screenName;
  currentModule = null;

  console.log('Showing screen:', screenName);
  
  // Set active menu item
  setActiveMenuItem(screenName + '-menu');
  
  // Hide all screens first
  document.querySelectorAll('.dashboard-container').forEach(screen => {
    screen.style.display = 'none';
  });
  
  // Show the requested screen
  const currentScreen = document.getElementById(screenName + '-screen');
  if (currentScreen) {
    currentScreen.style.display = 'block';
  } else {
    // Fallback to dashboard if screen not found
    document.getElementById('dashboard-screen').style.display = 'block';
    screenName = 'dashboard';
  }
  
  // Check if sidebar is collapsed to apply the right class
  const sidebar = document.getElementById('sidebar');
  const isSidebarCollapsed = sidebar.classList.contains('collapsed');
  const appContainer = document.getElementById('app-container');
  
  // Ensure sidebar is visible and properly set
  sidebar.style.display = 'block';
  document.getElementById('sidebar-toggle').style.display = 'block';
  
  // Update all dashboard container classes based on sidebar state
  const currentContainer = document.getElementById(screenName + '-screen');
  const allDashboardContainers = document.querySelectorAll('.dashboard-container');
  
  if (isSidebarCollapsed) {
    // Apply sidebar-collapsed class to all dashboard containers
    allDashboardContainers.forEach(container => {
      container.classList.add('sidebar-collapsed');
    });
    appContainer.classList.remove('sidebar-open');
  } else {
    // Remove sidebar-collapsed class from all dashboard containers
    allDashboardContainers.forEach(container => {
      container.classList.remove('sidebar-collapsed');
    });
    appContainer.classList.add('sidebar-open');
  }
  
  // Clean up module-specific CSS when switching pages
  // This prevents CSS conflicts between different modules
  cleanupModuleCSS(screenName);
  
  console.log('About to initialize module:', screenName);
  
  // Initialize the appropriate module based on the screen name
  switch(screenName) {
    case 'dashboard':
      // Get the dashboard screen element
      const dashboardContainer = document.getElementById('dashboard-screen');
      if (window.dashboardModule) {
        currentModule = window.dashboardModule;
        window.dashboardModule.initialize(dashboardContainer);
        // Start auto-refresh for dashboard
        if (typeof window.dashboardModule.startAutoRefresh === 'function') {
          window.dashboardModule.startAutoRefresh();
        }
      } else {
        // Load the dashboard module script if not already loaded
        const dashboardScript = document.createElement('script');
        dashboardScript.src = './js/pages/dashboard/dashbord-main.js';
        dashboardScript.onload = function() {
          // Initialize the dashboard module once loaded
          if (window.dashboardModule) {
            currentModule = window.dashboardModule;
            window.dashboardModule.initialize(dashboardContainer);
            // Start auto-refresh for dashboard
            if (typeof window.dashboardModule.startAutoRefresh === 'function') {
              window.dashboardModule.startAutoRefresh();
            }
          } else {
            console.error('Dashboard module not loaded');
            dashboardContainer.innerHTML = '<div class="content-wrapper"><h1>Error: Dashboard module not loaded</h1></div>';
          }
        };
        document.head.appendChild(dashboardScript);
      }
      break;
    case 'ticketing':
      // Get the ticketing screen element
      const ticketingContainer = document.getElementById('ticketing-screen');
      // Always reload the ticketing module to ensure a fresh state
      const ticketingScript = document.createElement('script');
      ticketingScript.id = 'ticketing-script'; // Add an ID for easy removal
      ticketingScript.src = './js/pages/ticketing/current-jobs-main.js';
      ticketingScript.onload = function() {
        // Initialize the ticketing module once loaded
        if (window.ticketingModule) {
          currentModule = window.ticketingModule;
          window.ticketingModule.initialize(ticketingContainer);
        } else {
          console.error('Ticketing module not loaded');
          ticketingContainer.innerHTML = '<div class="content-wrapper"><h1>Error: Ticketing module not loaded</h1></div>';
        }
      };
      document.head.appendChild(ticketingScript);
      break;
    case 'rma':
      // Get the RMA screen element
      const rmaContainer = document.getElementById('rma-screen');
      // Always reload the RMA module to ensure a fresh state
      const rmaScript = document.createElement('script');
      rmaScript.id = 'rma-script'; // Add an ID for easy removal
      rmaScript.src = './js/pages/rma/new-jobs-main.js';
      rmaScript.onload = function() {
        // Initialize the RMA module once loaded
        if (window.rmaModule) {
          currentModule = window.rmaModule;
          window.rmaModule.initialize(rmaContainer);
        } else {
          console.error('RMA module not loaded');
          rmaContainer.innerHTML = '<div class="content-wrapper"><h1>Error: RMA module not loaded</h1></div>';
        }
      };
      document.head.appendChild(rmaScript);
      break;
    case 'tasks':
      const tasksContainer = document.getElementById('tasks-screen') || document.getElementById('dashboard-screen');
      window.tasksModule.initialize(tasksContainer);
      break;
    case 'chat':
      const chatContainer = document.getElementById('chat-screen') || document.getElementById('dashboard-screen');
      window.chatModule.initialize(chatContainer);
      break;
    case 'calendar':
      const calendarContainer = document.getElementById('calendar-screen') || document.getElementById('dashboard-screen');
      window.calendarModule.initialize(calendarContainer);
      break;
    case 'passwords':
      const passwordsContainer = document.getElementById('passwords-screen') || document.getElementById('dashboard-screen');
      window.passwordsModule.initialize(passwordsContainer);
      break;
    case 'time-tracking':
      const timeTrackingContainer = document.getElementById('time-tracking-screen') || document.getElementById('dashboard-screen');
      window.timeTrackingModule.initialize(timeTrackingContainer);
      break;
    case 'admin-tools':
      const adminToolsContainer = document.getElementById('admin-tools-screen') || document.getElementById('dashboard-screen');
      window.adminToolsModule.initialize(adminToolsContainer);
      break;
    case 'settings':
      const settingsContainer = document.getElementById('settings-screen') || document.getElementById('dashboard-screen');
      window.settingsModule.initialize(settingsContainer);
      break;
    case 'autos':
      const autosContainer = document.getElementById('autos-screen') || document.getElementById('dashboard-screen');
      // Check if the autos module script is already loaded
      if (!window.autosModule) {
        // Load the autos module script
        const script = document.createElement('script');
        script.src = './js/pages/autos/autos-main.js';
        script.onload = function() {
          // Initialize the autos module once loaded
          window.autosModule.initialize(autosContainer);
        };
        document.head.appendChild(script);
      } else {
        // Initialize the autos module if already loaded
        window.autosModule.initialize(autosContainer);
      }
      break;
    default:
      const defaultContainer = document.getElementById(screenName + '-screen') || document.getElementById('dashboard-screen');
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'content-wrapper';
      defaultContainer.innerHTML = '';
      defaultContainer.appendChild(contentWrapper);
      contentWrapper.innerHTML = `
        <h1>${screenName.charAt(0).toUpperCase() + screenName.slice(1).replace('-', ' ')}</h1>
        <p>This feature is coming soon.</p>
      `;
  }
}

// Function to set the active menu item
function setActiveMenuItem(menuId) {
  // Remove active class from all menu items
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to the selected menu item
  const selectedItem = document.getElementById(menuId);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }
}

// Function to clean up module-specific CSS when switching between pages
function cleanupModuleCSS(currentScreen) {
  // Remove any dynamically added stylesheets when switching pages
  const dynamicStylesheets = [
    './css/time-tracking.css',
    './css/passwords.css',
    './css/dashboard/dashboard.css',
    './css/dashboard/dashboard-tasks.css',
    './css/dashboard/dashboard-chat.css',
    './css/dashboard/dashboard-passwords.css',
    './css/dashboard/dashboard-time.css'
  ];
  
  // Remove any module-specific style elements
  const styleElements = document.querySelectorAll('style[id$="-styles"]');
  styleElements.forEach(element => {
    // Keep dashboard styles if navigating to dashboard
    if (currentScreen === 'dashboard' && element.id === 'dashboard-styles') {
      return;
    }
    // Otherwise remove all module-specific styles
    if (element.id !== 'dashboard-styles' || currentScreen !== 'dashboard') {
      element.remove();
    }
  });
  
  // Remove dynamic CSS links if not on their respective pages
  dynamicStylesheets.forEach(stylesheet => {
    // Handle dashboard CSS files
    if (stylesheet.includes('dashboard') && currentScreen !== 'dashboard') {
      const linkElement = document.querySelector(`link[href="${stylesheet}"]`);
      if (linkElement) linkElement.remove();
    }
    // Handle time-tracking CSS
    else if (stylesheet.includes('time-tracking') && currentScreen !== 'time-tracking') {
      const linkElement = document.querySelector(`link[href="${stylesheet}"]`);
      if (linkElement) linkElement.remove();
    }
    // Handle passwords CSS
    else if (stylesheet.includes('passwords') && currentScreen !== 'passwords') {
      const linkElement = document.querySelector(`link[href="${stylesheet}"]`);
      if (linkElement) linkElement.remove();
    }
  });  
  
  // List of module-specific CSS files that should be removed when not on their respective pages
  const moduleCSS = {
    'admin-tools': ['./css/admin-tools.css'],
    'autos': [] // Add any CSS files specific to the autos page if needed
    // Add other module-specific CSS files here as needed
  };
  
  // Remove all module-specific CSS except for the current screen
  Object.keys(moduleCSS).forEach(screen => {
    if (screen !== currentScreen) {
      moduleCSS[screen].forEach(cssPath => {
        const cssLink = document.querySelector(`link[href="${cssPath}"]`);
        if (cssLink) {
          cssLink.remove();
        }
      });
    }
  });
}

// Function to handle user logout
function logoutUser() {
  // Clear user session data
  sessionStorage.removeItem('currentUser');
  
  // Hide sidebar and dashboard
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('sidebar-toggle').style.display = 'none';
  
  // Hide all dashboard containers
  document.querySelectorAll('.dashboard-container').forEach(screen => {
    screen.style.display = 'none';
  });
  
  // Reset any active content
  document.getElementById('dashboard-screen').innerHTML = '';
  
  // Restore the login screen with proper styling
  const loginScreen = document.getElementById('login-screen');
  loginScreen.style.display = 'flex';
  loginScreen.className = 'login-container'; // Ensure the proper class is applied
  
  // Make sure login particles are visible
  const loginParticles = document.getElementById('login-particles');
  if (loginParticles) {
    loginParticles.style.display = 'block';
  }
  
  // Reinitialize login particles if the loading animation module is available
  if (window.loadingAnimation && window.loadingAnimation.createLoginParticles) {
    window.loadingAnimation.createLoginParticles();
  }
  
  // Reset login form
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  
  // Hide error message
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) {
    errorMessage.style.display = 'none';
    errorMessage.innerHTML = '';
  }
  
  // Reset login button
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.innerHTML = '<span>Sign In</span>';
    loginButton.disabled = false;
  }
  
  // Initialize the login module which will handle the logo animation
  // First clear any existing animations to prevent doubling
  // const loginLogoAnimation = document.getElementById('login-logo-animation');
  // if (loginLogoAnimation) {
  //   loginLogoAnimation.innerHTML = '';
  // }
  
  // // Let the login module handle the animation initialization
  // if (window.loginModule) {
  //   window.loginModule.initialize(loginScreen);
  // }
}

// Function to check if user is authenticated
function checkAuthentication() {
  // Check if user info exists in session storage
  const userInfo = sessionStorage.getItem('currentUser');
  
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      // Set the username in the sidebar
      const sidebarUsername = document.getElementById('sidebar-username');
      if (sidebarUsername) {
        sidebarUsername.textContent = user.username;
      }
      return true;
    } catch (error) {
      console.error('Error parsing user info:', error);
      sessionStorage.removeItem('currentUser');
      return false;
    }
  }
  
  return false;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Expose functions globally for use in other modules
  window.showScreen = showScreen;
  window.logoutUser = logoutUser;
  window.checkAuthentication = checkAuthentication;
  
  // Add event listener for logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logoutUser);
  }
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showScreen,
    setActiveMenuItem,
    cleanupModuleCSS,
    logoutUser,
    checkAuthentication
  };
} else {
  window.screenController = {
    showScreen,
    setActiveMenuItem,
    cleanupModuleCSS,
    logoutUser,
    checkAuthentication
  };
}
