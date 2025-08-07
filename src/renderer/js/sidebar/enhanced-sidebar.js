/**
 * Enhanced Sidebar Functionality
 * Provides dynamic animations and interactions for the WIRE-Scheduler sidebar
 */

const enhancedSidebar = {
    init: function() {
        // Initialize sidebar functionality
        this.setupEventListeners();
        this.updateUserInfo();
        this.setupMenuItemEffects();
        this.setupParticleAnimations();
        this.initializeSidebar();
    },
    
    // Function to initialize sidebar
    initializeSidebar: function() {
        // Set up sidebar toggle button
        const toggleButton = document.getElementById('sidebar-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', this.toggleSidebar);
        }
    },
    
    // Function to toggle sidebar visibility
    toggleSidebar: function() {
        const appContainer = document.getElementById('app-container');
        const sidebar = document.getElementById('sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        const toggleIcon = toggleButton.querySelector('i');
        
        // Get all dashboard containers (dashboard, ticketing, rma, etc.)
        const dashboardContainers = document.querySelectorAll('.dashboard-container');
        
        // Toggle classes for sidebar and app container
        sidebar.classList.toggle('collapsed');
        appContainer.classList.toggle('sidebar-open');
        
        // Toggle dashboard margin for all dashboard containers
        if (sidebar.classList.contains('collapsed')) {
            // Apply sidebar-collapsed class to all dashboard containers
            dashboardContainers.forEach(container => {
                container.classList.add('sidebar-collapsed');
            });
            
            // Change icon to point right (away from sidebar) when sidebar is closed
            toggleIcon.classList.remove('fa-chevron-left');
            toggleIcon.classList.add('fa-chevron-right');
        } else {
            // Remove sidebar-collapsed class from all dashboard containers
            dashboardContainers.forEach(container => {
                container.classList.remove('sidebar-collapsed');
            });
            
            // Change icon to point left (toward sidebar) when sidebar is open
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
        }
    },

    setupEventListeners: function() {
        // Menu item click handling with smooth transitions
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                // Remove active class from all menu items
                menuItems.forEach(mi => mi.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');
            });
        });

        // Settings button special effects
        const settingsButton = document.querySelector('.settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('mouseenter', function() {
                const icon = this.querySelector('i');
                icon.style.transform = 'rotate(30deg)';
            });
            
            settingsButton.addEventListener('mouseleave', function() {
                const icon = this.querySelector('i');
                icon.style.transform = 'rotate(0deg)';
            });
        }
        
        // Logout button special effects
        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('mouseenter', function() {
                const icon = this.querySelector('i');
                icon.style.transform = 'translateX(-3px)';
            });
            
            logoutButton.addEventListener('mouseleave', function() {
                const icon = this.querySelector('i');
                icon.style.transform = 'translateX(0)';
            });
        }
    },

    updateUserInfo: function() {
        // Get current date and time
        const updateDateTime = () => {
            const now = new Date();
            
            // Format date: Jun 25, 2025
            const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
            const formattedDate = now.toLocaleDateString('en-US', dateOptions);
            
            // Format time: 09:39 AM
            const timeOptions = { hour: '2-digit', minute: '2-digit' };
            const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
            
            // Update the DOM
            document.getElementById('current-date').textContent = formattedDate;
            document.getElementById('current-time').textContent = formattedTime;
        };
        
        // Update immediately and then every minute
        updateDateTime();
        setInterval(updateDateTime, 60000);
        
        // Set username (could be fetched from a settings object in a real app)
        const username = localStorage.getItem('username') || 'User';
        document.getElementById('sidebar-username').textContent = username;
    },

    setupMenuItemEffects: function() {
        // Add directional hover ripple effect to menu items
        const menuItems = document.querySelectorAll('.menu-item');
        
        // Track mouse position for each menu item
        const mousePositions = new Map();
        
        menuItems.forEach(item => {
            // Track mouse movement over the item
            item.addEventListener('mousemove', function(e) {
                mousePositions.set(this, {
                    x: e.clientX,
                    y: e.clientY
                });
            });
            
            // Handle mouse enter with directional animation
            item.addEventListener('mouseenter', function(e) {
                // Create ripple element
                const ripple = document.createElement('div');
                
                // Get item dimensions
                const rect = this.getBoundingClientRect();
                const itemHeight = rect.height;
                const itemMiddleY = itemHeight / 2;
                
                // Determine if mouse entered from top or bottom
                const entryY = e.clientY - rect.top;
                const fromTop = entryY <= itemMiddleY;
                
                // Set appropriate animation class
                ripple.className = fromTop ? 'ripple-effect ripple-top-down' : 'ripple-effect ripple-bottom-up';
                
                // Position the ripple - center it on the mouse X position
                const x = e.clientX - rect.left;
                const y = fromTop ? 0 : itemHeight; // Start from top or bottom
                
                // Center the ripple horizontally by offsetting by half its width
                ripple.style.left = `${x - 50}px`; // 50px is half of the ripple width (100px)
                ripple.style.top = `${y}px`;
                
                // Add to DOM
                this.appendChild(ripple);
                
                // Remove after animation completes
                setTimeout(() => {
                    ripple.remove();
                }, 800);
            });
            
            // Clean up when mouse leaves
            item.addEventListener('mouseleave', function() {
                mousePositions.delete(this);
            });
        });
    },

    setupParticleAnimations: function() {
        // Get particles container
        const particles = document.querySelectorAll('.particle');
        
        // Add random movement to particles
        particles.forEach(particle => {
            // Initial random position
            const randomX = Math.random() * 100;
            const randomY = Math.random() * 100;
            
            // Apply random position
            particle.style.left = `${randomX}%`;
            particle.style.top = `${randomY}%`;
        });
    }
};

// Add ripple effect styles
const addRippleStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.3);
            width: 100px;
            height: 100px;
            transform: scale(0);
            pointer-events: none;
        }
        
        .ripple-top-down {
            animation: rippleTopDown 0.8s ease-out;
            transform-origin: center top;
        }
        
        .ripple-bottom-up {
            animation: rippleBottomUp 0.8s ease-out;
            transform-origin: center bottom;
        }
        
        @keyframes rippleTopDown {
            0% {
                transform: scale(0) translateY(0);
                opacity: 0.7;
            }
            100% {
                transform: scale(2.5) translateY(20px);
                opacity: 0;
            }
        }
        
        @keyframes rippleBottomUp {
            0% {
                transform: scale(0) translateY(0);
                opacity: 0.7;
            }
            100% {
                transform: scale(2.5) translateY(-20px);
                opacity: 0;
            }
        }
        
        .menu-item {
            position: relative;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);
};

const setupToggleButtonEffect = () => {
    const toggleButton = document.querySelector('.sidebar-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', function(e) {
            // Create ripple element
            const ripple = document.createElement('div');
            ripple.className = 'ripple-effect ripple-top-down';
            
            // Position the ripple - center it on the mouse X position
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = 0; // Start from top
            
            // Center the ripple horizontally by offsetting by half its width
            ripple.style.left = `${x - 50}px`; // 50px is half of the ripple width (100px)
            ripple.style.top = `${y}px`;
            
            // Add to DOM
            this.appendChild(ripple);
            
            // Remove after animation completes
            setTimeout(() => {
                ripple.remove();
            }, 800);
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar enhancements
    enhancedSidebar.init();
    
    // Add ripple effect styles
    addRippleStyles();
    
    // Setup toggle button ripple effect
    setupToggleButtonEffect();
    
    // Expose toggleSidebar globally for use in other modules
    window.toggleSidebar = enhancedSidebar.toggleSidebar;
});
