import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const skipButton = document.getElementById('skip-button');
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    
    // Randomly select a tip
    function setRandomTip() {
        const randomIndex = Math.floor(Math.random() * config.loadingTips.length);
        tipText.textContent = config.loadingTips[randomIndex];
    }
    
    // Set initial random tip
    setRandomTip();
    
    // Change tip every 3 seconds
    setInterval(setRandomTip, 3000);
    
    // Function to complete loading and show game
    function completeLoading() {
        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
    }
    
    // Skip button click handler
    skipButton.addEventListener('click', () => {
        clearInterval(loadingInterval);
        completeLoading();
    });
    
    // Simulate loading progress
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / config.loadingTime) * 100;
    
    const loadingInterval = setInterval(() => {
        progress += increment;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Show the game after a short delay
            setTimeout(completeLoading, 1000);
        }
        
        loadingBar.style.width = `${progress}%`;
        loadingPercentage.textContent = `${Math.round(progress)}%`;
    }, interval);
});