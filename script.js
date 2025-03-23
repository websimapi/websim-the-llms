import { config } from './config.js';
import { cityData } from './cityData.js';

let bgAudio;

document.addEventListener('DOMContentLoaded', () => {
    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const skipButton = document.getElementById('skip-button');
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    
    // Hide loading screen initially
    loadingScreen.style.display = 'none';
    
    // Setup audio
    bgAudio = new Audio('LLMs Morning Oasis - Sonauto.wav');
    bgAudio.loop = true;
    
    // Start experience button
    startButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        bgAudio.play();
        startLoading();
    });
    
    // Fade out audio function
    function fadeOutAudio(duration = 30000) {
        const startVolume = bgAudio.volume;
        const fadeSteps = 100;
        const volumeStep = startVolume / fadeSteps;
        const intervalTime = duration / fadeSteps;
        
        const fadeInterval = setInterval(() => {
            if (bgAudio.volume > volumeStep) {
                bgAudio.volume -= volumeStep;
            } else {
                bgAudio.volume = 0;
                bgAudio.pause();
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    }
    
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
        fadeOutAudio();
        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
    }
    
    // Skip button click handler
    skipButton.addEventListener('click', () => {
        clearInterval(loadingInterval);
        fadeOutAudio();
        completeLoading();
    });
    
    let loadingInterval;
    
    // Start the loading process
    function startLoading() {
        // Simulate loading progress
        let progress = 0;
        const interval = 50; // Update every 50ms
        const increment = (interval / config.loadingTime) * 100;
        
        loadingInterval = setInterval(() => {
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
    }
    
    // Setup console panel functionality
    function setupConsolePanel() {
        const consolePanel = document.getElementById('console-panel');
        const closeButton = document.querySelector('.console-close');
        const exportButton = document.getElementById('export-data');
        const importButton = document.getElementById('import-data');
        const consoleContent = document.querySelector('.console-content');
        const consoleIndicator = document.querySelector('.console-indicator');
        
        // Show console indicator briefly
        setTimeout(() => {
            consoleIndicator.classList.add('visible');
            setTimeout(() => {
                consoleIndicator.classList.remove('visible');
            }, 3000);
        }, 5000);
        
        closeButton.addEventListener('click', () => {
            consolePanel.classList.add('hidden');
        });
        
        exportButton.addEventListener('click', () => {
            const gameData = cityData.saveGame();
            
            // Create a downloadable file
            const blob = new Blob([gameData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `promptopia_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
            
            consoleContent.innerHTML += `<p>Exported city data: ${new Date().toLocaleTimeString()}</p>`;
        });
        
        importButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = event => {
                    const result = cityData.loadGame(event.target.result);
                    if (result) {
                        consoleContent.innerHTML += `<p>Successfully imported city data</p>`;
                        // Reload the scene to reflect changes
                        location.reload();
                    } else {
                        consoleContent.innerHTML += `<p>Error importing city data</p>`;
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        });
    }

    setupConsolePanel();
});