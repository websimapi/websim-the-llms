import { config } from './config.js';
import { cityData } from './cityData.js';
import * as THREE from 'three';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { setupMusicPlayer } from './musicPlayer.js';
import { marked } from 'marked'; 

let bgAudio;
let musicVolume;
let useLLMTips = localStorage.getItem('useLLMTips') !== null ? 
    localStorage.getItem('useLLMTips') === 'true' : true;
let tipFetchInterval;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize LLM data manager
    if (typeof llmDataManager !== 'undefined') {
        llmDataManager.init();
    }

    // Setup music player UI
    setupMusicPlayer();

    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const playButton = document.getElementById('play-button');
    const creditsButton = document.getElementById('credits-button'); 
    const creditsPanel = document.getElementById('credits-panel'); 
    const closeCreditsButton = creditsPanel.querySelector('.credits-close'); 
    const creditsContent = creditsPanel.querySelector('.credits-content'); 
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

    // Start experience button
    startButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        // Use the new music player functions
        import('./musicPlayer.js').then(module => {
            module.fadeInMusic(config.music.fadeInDuration || 5000);
        });
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
        // Use the new music player functions
        import('./musicPlayer.js').then(module => {
            module.fadeInMusic(config.music.fadeInDuration || 5000);
        });
        startLoading();

        // Start the tip fetching based on toggle state
        if (useLLMTips) {
            startLLMTipFetch();
        } else {
            // Change tip every 3 seconds if using preset tips
            setInterval(setRandomTip, 3000);
        }
    });

    // Credits button click handler
    creditsButton.addEventListener('click', async () => {
        creditsContent.innerHTML = '<div class="loading-credits">Loading...</div>';
        creditsPanel.classList.remove('hidden');
        const creditsTitleElement = creditsPanel.querySelector('.credits-title'); // Get the title element
        creditsTitleElement.textContent = 'Credits'; // Default title while loading

        try {
            const response = await fetch('credits.md');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const markdown = await response.text();
            // Use DOMPurify if available, otherwise use marked directly (less secure)
            const html = (typeof DOMPurify !== 'undefined')
                ? DOMPurify.sanitize(await marked.parse(markdown))
                : await marked.parse(markdown);

            // Create a temporary div to parse the HTML and find the first H1
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const firstH1 = tempDiv.querySelector('h1');

            if (firstH1) {
                // Use the H1 text as the panel title
                creditsTitleElement.textContent = firstH1.textContent;
                // Remove the H1 from the content to avoid duplication
                firstH1.remove();
                creditsContent.innerHTML = tempDiv.innerHTML; // Set content without the H1
            } else {
                // If no H1 found, just set the content
                creditsContent.innerHTML = html;
            }

        } catch (error) {
            console.error('Error loading or parsing credits:', error);
            creditsContent.innerHTML = '<p style="color: red;">Error loading credits.</p>';
            creditsTitleElement.textContent = 'Error'; // Update title on error
        }
    });

    // Close credits button click handler
    closeCreditsButton.addEventListener('click', () => {
        creditsPanel.classList.add('hidden');
    });


    // Skip button click handler
    skipButton.addEventListener('click', () => {
        clearInterval(loadingInterval);
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
        }

        // Comment out the fade out to allow music to continue playing
        // import('./musicPlayer.js').then(module => {
        //     module.fadeOutMusic(config.music.fadeOutDuration || 3000);
        // });

        completeLoading();
    });

    // Function to complete loading and show game
    function completeLoading() {
        // Clear the tip fetch interval when loading completes
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
        }

        // Comment out the fade out to allow music to continue playing
        // import('./musicPlayer.js').then(module => {
        //     module.fadeOutMusic(config.music.fadeOutDuration || 3000);
        // });

        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
    }

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
            const numTopics = Math.floor(Math.random() * 2) + 2; 

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

    let loadingInterval;

    // Start the loading process
    function startLoading() {
        // Simulate loading progress
        let progress = 0;
        const interval = 50; 
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

        // Update music animation state when audio state changes
        if (bgAudio) {
            bgAudio.addEventListener('play', updateMusicAnimation);
            bgAudio.addEventListener('pause', updateMusicAnimation);
        }
    }

    // New function to update music animation based on play state
    function updateMusicAnimation() {
        const toggleButton = document.querySelector('.music-toggle-button');
        if (toggleButton) {
            if (bgAudio && !bgAudio.paused && musicVolume > 0) {
                toggleButton.classList.add('playing');
            } else {
                toggleButton.classList.remove('playing');
            }
        }
    }

    // Setup console panel functionality
    function setupConsolePanel() {
        const consolePanel = document.getElementById('console-panel');
        const closeButton = consolePanel.querySelector('.console-close');
        const exportButton = document.getElementById('export-data');
        const importButton = document.getElementById('import-data');
        const consoleContent = consolePanel.querySelector('.console-content');
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

        // Add grid toggle button if it doesn't exist
        let gridToggleButton = document.getElementById('toggle-grid');
        if (!gridToggleButton) {
             gridToggleButton = document.createElement('button');
             gridToggleButton.className = 'console-button';
             gridToggleButton.id = 'toggle-grid';
             gridToggleButton.textContent = 'Toggle Grid';
             // Insert grid toggle before existing buttons
             const buttonsContainer = consolePanel.querySelector('.console-buttons');
             if (buttonsContainer) {
                 buttonsContainer.insertBefore(gridToggleButton, exportButton);
             }
        }
         gridToggleButton.removeEventListener('click', toggleGridHandler); 
         gridToggleButton.addEventListener('click', toggleGridHandler);


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

    function toggleGridHandler() {
         if (window.cityGrid) {
             window.cityGrid.visible = !window.cityGrid.visible;
             const consoleContent = document.querySelector('#console-panel .console-content');
             consoleContent.innerHTML += `<p>Grid ${window.cityGrid.visible ? 'shown' : 'hidden'}</p>`;
         } else {
             const consoleContent = document.querySelector('#console-panel .console-content');
             consoleContent.innerHTML += `<p>Grid not available</p>`;
         }
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

        // Add call to optimize UI height on resize
        if (document.getElementById('create-llm-ui').classList.contains('active')) {
             import('./llmAttributeTooltips.js').then(module => module.optimizeUIHeight());
        }
    }

    window.addEventListener('resize', handleViewportResize);

    setupConsolePanel();
});