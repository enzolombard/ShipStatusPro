/**
 * Loading Animation Module
 * Handles the loading screen animations and transitions
 */

// Function to create animated background particles for loading screen
function createLoadingParticles() {
  const particlesContainer = document.getElementById('loading-particles');
  // Clear existing particles
  if (particlesContainer) {
    particlesContainer.innerHTML = '';
    
    // Create random particles
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.classList.add('loading-bg-particle');
      
      // Random size
      const size = Math.floor(Math.random() * 60) + 30; // 30-90px
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random position
      const posX = Math.floor(Math.random() * 100);
      const posY = Math.floor(Math.random() * 100);
      particle.style.left = `${posX}%`;
      particle.style.bottom = `${-posY}px`;
      
      // Random animation duration and delay
      const duration = Math.floor(Math.random() * 15) + 15; // 15-30s
      const delay = Math.floor(Math.random() * 5);
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      
      particlesContainer.appendChild(particle);
    }
    
    // Add glowing particles
    const glowCount = 6;
    for (let i = 0; i < glowCount; i++) {
      const glowParticle = document.createElement('div');
      glowParticle.classList.add('loading-glow-particle');
      
      // Random size
      const size = Math.floor(Math.random() * 100) + 100; // 100-200px
      glowParticle.style.width = `${size}px`;
      glowParticle.style.height = `${size}px`;
      
      // Random position around the center area
      const centerX = 50;
      const centerY = 50;
      const radius = 20;
      const angle = Math.random() * Math.PI * 2;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      
      glowParticle.style.left = `calc(${centerX + offsetX}% - ${size/2}px)`;
      glowParticle.style.top = `calc(${centerY + offsetY}% - ${size/2}px)`;
      
      // Random animation duration and delay
      const duration = Math.floor(Math.random() * 4) + 3; // 3-7s
      const delay = Math.floor(Math.random() * 2);
      glowParticle.style.animationDuration = `${duration}s`;
      glowParticle.style.animationDelay = `${delay}s`;
      
      particlesContainer.appendChild(glowParticle);
    }
  }
}

// Function to simulate progress updates for the loading bar
function simulateProgress() {
  const progressBar = document.getElementById('loading-progress');
  if (progressBar) {
    // Progress is handled via CSS animation, but we could manually update it here if needed
    // This function is left as a hook for future enhancements if we want more controlled progress
  }
}

// Function to create animated background particles for login screen
function createLoginParticles() {
  const particlesContainer = document.getElementById('login-particles');
  // Clear existing particles
  particlesContainer.innerHTML = '';
  
  // Create random particles
  const particleCount = 15;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('login-bg-particle');
    
    // Random size
    const size = Math.floor(Math.random() * 60) + 20; // 20-80px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random position
    const posX = Math.floor(Math.random() * 100);
    const posY = Math.floor(Math.random() * 100) + 100; // Start below the viewport
    particle.style.left = `${posX}%`;
    particle.style.bottom = `${-posY}px`;
    
    // Random animation duration and delay
    const duration = Math.floor(Math.random() * 20) + 15; // 15-35s
    const delay = Math.floor(Math.random() * 10);
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(particle);
  }
  
  // Add glowing particles
  const glowCount = 6;
  for (let i = 0; i < glowCount; i++) {
    const glowParticle = document.createElement('div');
    glowParticle.classList.add('login-glow-particle');
    
    // Random size
    const size = Math.floor(Math.random() * 100) + 100; // 100-200px
    glowParticle.style.width = `${size}px`;
    glowParticle.style.height = `${size}px`;
    
    // Random position around the center area
    const centerX = 50;
    const centerY = 50;
    const radius = 20;
    const angle = Math.random() * Math.PI * 2;
    const offsetX = Math.cos(angle) * radius;
    const offsetY = Math.sin(angle) * radius;
    
    glowParticle.style.left = `calc(${centerX + offsetX}% - ${size/2}px)`;
    glowParticle.style.top = `calc(${centerY + offsetY}% - ${size/2}px)`;
    
    // Random animation duration and delay
    const duration = Math.floor(Math.random() * 4) + 3; // 3-7s
    const delay = Math.floor(Math.random() * 2);
    glowParticle.style.animationDuration = `${duration}s`;
    glowParticle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(glowParticle);
  }
}

// Initialize loading animation when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Create loading screen particles
  createLoadingParticles();
  
  // Initialize the lottie animation
  const anim = lottie.loadAnimation({
    container: document.getElementById('lottie-animation'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: '../../public/animations/loading.json'
  });
  
  // Simulate progress bar updates
  simulateProgress();
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createLoadingParticles,
    simulateProgress,
    createLoginParticles
  };
} else {
  window.loadingAnimation = {
    createLoadingParticles,
    simulateProgress,
    createLoginParticles
  };
}
