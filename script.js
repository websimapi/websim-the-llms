import { config } from './config.js';
import { cityData } from './cityData.js';
import { llmService } from './llmService.js';

let bgAudio;
let tipUpdateInterval;

document.addEventListener('DOMContentLoaded', () => {
    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const skipButton = document.getElementById('skip-button');
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const llmToggle = document.getElementById('llm-toggle');
    
    // Initialize LLM toggle based on stored preference
    llmToggle.checked = llmService.isEnabled();
    
    // Add event listener for toggle
    llmToggle.addEventListener('change', () => {
        llmService.toggleLLM(llmToggle.checked);
        
        // Reset tip interval when toggle changes
        clearInterval(tipUpdateInterval);
        setRandomTip();
        startTipInterval();
    });
    
    // Hide loading screen initially
    loadingScreen.style.display = 'none';
    
    // Setup audio
    bgAudio = new Audio('LLMs Morning Oasis - Sonauto.wav');
    bgAudio.loop = true;
    bgAudio.volume = 0; // Start with volume at 0
    
    // Fade in audio function
    function fadeInAudio(duration = 5000) {
        const targetVolume = 1.0;
        const fadeSteps = 50; // More steps for smoother transition
        const volumeStep = targetVolume / fadeSteps;
        const intervalTime = duration / fadeSteps;
        
        const fadeInterval = setInterval(() => {
            if (bgAudio.volume < (targetVolume - volumeStep)) {
                bgAudio.volume += volumeStep;
            } else {
                bgAudio.volume = targetVolume;
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    }
    
    // Fade out audio function
    function fadeOutAudio(duration = 3000) {
        const startVolume = bgAudio.volume;
        const fadeSteps = 50; // More steps for smoother transition
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
    
    // Make fadeOutAudio globally accessible
    window.fadeOutAudio = fadeOutAudio;
    
    // Randomly select a tip
    async function setRandomTip() {
        if (llmService.isEnabled()) {
            // Generate tip with LLM
            const generatedTip = await llmService.generateTip();
            if (generatedTip) {
                tipText.textContent = generatedTip;
                return;
            }
        }
        
        // Fallback to predefined tips
        const randomIndex = Math.floor(Math.random() * config.loadingTips.length);
        tipText.textContent = config.loadingTips[randomIndex];
    }
    
    // Start tip interval function
    function startTipInterval() {
        // Clear existing interval if any
        if (tipUpdateInterval) {
            clearInterval(tipUpdateInterval);
        }
        
        // Set interval time based on whether LLM is enabled
        const intervalTime = llmService.isEnabled() ? 7000 : 3000;
        
        // Set initial random tip
        setRandomTip();
        
        // Change tip on interval
        tipUpdateInterval = setInterval(setRandomTip, intervalTime);
    }
    
    // Set initial tip and start interval
    startTipInterval();
    
    // Function to complete loading and show game
    function completeLoading() {
        fadeOutAudio();
        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
        
        // Clear tip interval when loading completes
        clearInterval(tipUpdateInterval);
    }
    
    // Start experience button
    startButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        bgAudio.play();
        fadeInAudio(); // Start fade in effect
        startLoading();
    });
    
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

    // Setup UI interactions for fireworks effect
    function setupUIInteractions() {
        const createLLMButton = document.querySelector('.create-llm-btn');
        const moveLLMButton = document.querySelector('.move-llm-btn');
        
        createLLMButton.addEventListener('click', () => {
            console.log('Create new LLM clicked');
        });
        
        moveLLMButton.addEventListener('click', () => {
            console.log('Move LLMs in clicked');
        });
        
        // Add mousemove event for fireworks effect
        createLLMButton.addEventListener('mousemove', (e) => {
            const rect = createLLMButton.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            createLLMButton.style.setProperty('--x', `${x}%`);
            createLLMButton.style.setProperty('--y', `${y}%`);
        });
        
        // Add mousemove event for fireworks effect on move button
        moveLLMButton.addEventListener('mousemove', (e) => {
            const rect = moveLLMButton.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            moveLLMButton.style.setProperty('--x', `${x}%`);
            moveLLMButton.style.setProperty('--y', `${y}%`);
        });
    }

    setupConsolePanel();
    setupUIInteractions();
});