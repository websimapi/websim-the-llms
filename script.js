import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    
    // Randomly select a tip
    function setRandomTip() {
        const randomIndex = Math.floor(Math.random() * config.loadingTips.length);
        tipText.textContent = config.loadingTips[randomIndex];
    }
    
    // Set initial random tip
    setRandomTip();
    
    // Change tip every 3 seconds
    setInterval(setRandomTip, 3000);
    
    // Simulate loading progress
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / config.loadingTime) * 100;
    
    const loadingInterval = setInterval(() => {
        progress += increment;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // You could redirect to the main game here after a short delay
            setTimeout(() => {
                // Uncomment when you have a main game page
                // window.location.href = 'game.html';
                console.log('Loading complete! Ready to enter The LLMs world.');
            }, 1000);
        }
        
        loadingBar.style.width = `${progress}%`;
        loadingPercentage.textContent = `${Math.round(progress)}%`;
    }, interval);
});

