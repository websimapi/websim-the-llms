import { config } from './config.js';
import { cityData } from './cityData.js';
import * as THREE from 'three';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';

let bgAudio;
let useLLMTips = localStorage.getItem('useLLMTips') !== null ? 
    localStorage.getItem('useLLMTips') === 'true' : true;
let tipFetchInterval;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize LLM data manager
    if (typeof llmDataManager !== 'undefined') {
        llmDataManager.init();
    }

    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const playButton = document.getElementById('play-button');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const skipButton = document.getElementById('skip-button');
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const loadingLLMToggle = document.getElementById('loading-llm-toggle');
    const startLLMToggle = document.getElementById('start-llm-toggle');
    
    // Hide loading screen initially
    loadingScreen.style.display = 'none';
    
    // Sync the toggle states
    loadingLLMToggle.checked = useLLMTips;
    startLLMToggle.checked = useLLMTips;
    
    // Toggle event listeners
    loadingLLMToggle.addEventListener('change', (e) => {
        useLLMTips = e.target.checked;
        localStorage.setItem('useLLMTips', useLLMTips);
        startLLMToggle.checked = useLLMTips;
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
            if (useLLMTips) {
                startLLMTipFetch();
            } else {
                setRandomTip();
            }
        }
    });
    
    startLLMToggle.addEventListener('change', (e) => {
        useLLMTips = e.target.checked;
        localStorage.setItem('useLLMTips', useLLMTips);
        loadingLLMToggle.checked = useLLMTips;
    });
    
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
    
    // Randomly select a tip from config
    function setRandomTip() {
        const randomIndex = Math.floor(Math.random() * config.loadingTips.length);
        tipText.textContent = config.loadingTips[randomIndex];
    }
    
    // Fetch a random tip from LLM API
    async function fetchLLMTip() {
        try {
            const topics = [
                "virtual pets", "AI companions", "language models", "digital cities",
                "model training", "AI personalities", "token economics", "context windows",
                "prompt engineering", "fine-tuning", "hallucinations", "AI creativity",
                "neural networks", "LLM lifecycle", "model parameters", "AI city building"
            ];
            
            // Get 2-3 random topics to include in the prompt
            const randomTopics = [];
            const numTopics = Math.floor(Math.random() * 2) + 2; // 2-3 topics
            
            while (randomTopics.length < numTopics) {
                const randomIndex = Math.floor(Math.random() * topics.length);
                const topic = topics[randomIndex];
                if (!randomTopics.includes(topic)) {
                    randomTopics.push(topic);
                }
            }
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Generate a single sentence tip about ${randomTopics.join(", ")} in the context of a simulation game called "The LLMs" where players manage AI entities in a virtual city. Keep it concise, fun and helpful for beginners. Respond with just the tip text, no additional formatting or explanation.`
                    }
                ]
            });
            
            return completion.content.trim();
        } catch (error) {
            console.error("Error fetching LLM tip:", error);
            return "LLMs sometimes need a moment to think!";
        }
    }
    
    // Start the LLM tip fetching cycle
    function startLLMTipFetch() {
        // Fetch first tip immediately
        if (useLLMTips) {
            fetchLLMTip().then(tip => {
                tipText.textContent = tip;
            });
        }
        
        // Set interval for fetching tips every 7 seconds
        tipFetchInterval = setInterval(() => {
            if (useLLMTips) {
                fetchLLMTip().then(tip => {
                    tipText.textContent = tip;
                });
            } else {
                setRandomTip();
            }
        }, 7000);
    }
    
    // Set initial tip based on toggle state
    if (useLLMTips) {
        // Don't start fetching until loading begins
    } else {
        setRandomTip();
    }
    
    // Function to complete loading and show game
    function completeLoading() {
        // Clear the tip fetch interval when loading completes
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
        }
        
        fadeOutAudio();
        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
    }
    
    // Start experience button
    startButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        bgAudio.play();
        fadeInAudio(); // Start fade in effect
        startLoading();
        
        // Start the tip fetching based on toggle state
        if (useLLMTips) {
            startLLMTipFetch();
        } else {
            // Change tip every 3 seconds if using preset tips
            setInterval(setRandomTip, 3000);
        }
    });
    
    // Add play button click handler
    playButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        bgAudio.play();
        fadeInAudio(); // Start fade in effect
        startLoading();
        
        // Start the tip fetching based on toggle state
        if (useLLMTips) {
            startLLMTipFetch();
        } else {
            // Change tip every 3 seconds if using preset tips
            setInterval(setRandomTip, 3000);
        }
    });
    
    // Skip button click handler
    skipButton.addEventListener('click', () => {
        clearInterval(loadingInterval);
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
        }
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

    function setupUIInteractions() {
        const createLLMButton = document.querySelector('.create-llm-btn');
        const moveLLMButton = document.querySelector('.move-llm-btn');
        const createLLMUI = document.getElementById('create-llm-ui');
        const closeCreateLLMButton = document.querySelector('.create-llm-close');
        
        createLLMButton.addEventListener('click', () => {
            console.log('Create new LLM clicked');
            createLLMUI.classList.add('active');
            setupLLMCreationInterface();
        });
        
        closeCreateLLMButton.addEventListener('click', () => {
            createLLMUI.classList.remove('active');
        });
        
        moveLLMButton.addEventListener('click', () => {
            console.log('Move LLMs button clicked');
            setupLLMCollectionView();
            document.getElementById('llm-collection-ui').classList.add('active');
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
        
        // Setup attribute slider displays
        const sliders = document.querySelectorAll('.setting-slider');
        sliders.forEach(slider => {
            const valueDisplay = document.getElementById(`${slider.id.split('-')[1]}-value`);
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
            });
        });
    }

    function handleViewportResize() {
        const humanoidViewport = document.querySelector('.humanoid-viewport');
        if (humanoidViewport && window.humanoidCamera && window.humanoidRenderer) {
            const width = humanoidViewport.clientWidth;
            const height = humanoidViewport.clientHeight;
            
            window.humanoidCamera.aspect = width / height;
            window.humanoidCamera.updateProjectionMatrix();
            window.humanoidRenderer.setSize(width, height);
        }
    }

    window.addEventListener('resize', handleViewportResize);

    setupConsolePanel();
    setupUIInteractions();
});