/**
 * Sidebar Animation
 * Implements the Lottie animation for the sidebar logo with hover effects
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the sidebar animation
  initSidebarAnimation();
});

function initSidebarAnimation() {
  // Get the sidebar animation container
  const sidebarAnimContainer = document.getElementById('sidebar-lottie-animation');
  
  if (!sidebarAnimContainer) return;
  
  // Initialize the Lottie animation
  const sidebarAnimation = lottie.loadAnimation({
    container: sidebarAnimContainer,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: '../../public/animations/wire-sidebar.json'
  });
  
  // Default animation speed (1 = normal speed)
  let defaultSpeed = 0.5;
  let hoverSpeed = 1.2;
  
  // Set initial animation speed
  sidebarAnimation.setSpeed(defaultSpeed);
  
  // Add hover effects
  sidebarAnimContainer.addEventListener('mouseenter', function() {
    // Speed up animation on hover
    sidebarAnimation.setSpeed(hoverSpeed);
    
    // Add glow effect
    this.classList.add('animation-hover');
  });
  
  sidebarAnimContainer.addEventListener('mouseleave', function() {
    // Return to normal speed
    sidebarAnimation.setSpeed(defaultSpeed);
    
    // Remove glow effect
    this.classList.remove('animation-hover');
  });
}
