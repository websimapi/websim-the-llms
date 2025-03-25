// Settings menu functionality for The LLMs
import { config } from './config.js';

// Track settings state
let settingsOpen = false;
let currentQualityLevel = 'medium'; // low, medium, high
let currentLightingLevel = 'medium'; // low, medium, high

export function setupSettingsMenu() {
    // Create the settings menu UI elements
    createSettingsUI();
    
    // Add event listeners
    setupEventListeners();
    
    // Initialize from localStorage
    loadSettingsFromStorage();
}

function createSettingsUI() {
    // Create settings button in start screen
    addSettingsButtonToStartScreen();
    
    // Create settings button in game UI
    const gameMenuEl = document.querySelector('.top-menu');
    if (gameMenuEl && !document.querySelector('.settings-menu-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'menu-button settings-menu-btn';
        settingsBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="currentColor"/>
            </svg>
            Settings
        `;
        gameMenuEl.appendChild(settingsBtn);
    }
    
    // Create settings panel
    if (!document.getElementById('settings-panel')) {
        const panel = document.createElement('div');
        panel.id = 'settings-panel';
        panel.className = 'settings-panel hidden';
        
        panel.innerHTML = `
            <div class="settings-header">
                <div class="settings-title">Settings</div>
                <button class="settings-close">&times;</button>
            </div>
            <div class="settings-content">
                <div class="settings-section">
                    <h3>Audio</h3>
                    <div class="setting-row">
                        <label for="music-volume-slider">Music Volume</label>
                        <div class="volume-control">
                            <input type="range" id="music-volume-slider" min="0" max="4" step="1" value="2">
                            <div class="volume-display">
                                <div class="volume-dot"></div>
                                <div class="volume-dot"></div>
                                <div class="volume-dot"></div>
                                <div class="volume-dot"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Graphics</h3>
                    <div class="setting-row">
                        <label>Quality</label>
                        <div class="option-buttons">
                            <button class="option-btn" data-quality="low">Low</button>
                            <button class="option-btn selected" data-quality="medium">Medium</button>
                            <button class="option-btn" data-quality="high">High</button>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label>Lighting</label>
                        <div class="option-buttons">
                            <button class="option-btn" data-lighting="low">Low</button>
                            <button class="option-btn selected" data-lighting="medium">Medium</button>
                            <button class="option-btn" data-lighting="high">High</button>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Interface</h3>
                    <div class="setting-row checkbox-row">
                        <label for="show-fps">Show FPS</label>
                        <input type="checkbox" id="show-fps" class="settings-checkbox">
                    </div>
                    <div class="setting-row checkbox-row">
                        <label for="show-tips">Show Tips</label>
                        <input type="checkbox" id="show-tips" class="settings-checkbox" checked>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }
}

function addSettingsButtonToStartScreen() {
    // Add settings button to start screen button arc
    const arcButton4 = document.querySelector('.arc-button-4');
    if (arcButton4) {
        arcButton4.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="white"/>
            </svg>
        `;
        arcButton4.classList.add('settings-button');
        arcButton4.title = "Settings";
    }
}

function setupEventListeners() {
    // Start screen settings button
    const startScreenSettingsBtn = document.querySelector('.arc-button-4');
    if (startScreenSettingsBtn) {
        startScreenSettingsBtn.addEventListener('click', toggleSettingsPanel);
    }
    
    // Game UI settings button
    const gameUISettingsBtn = document.querySelector('.settings-menu-btn');
    if (gameUISettingsBtn) {
        gameUISettingsBtn.addEventListener('click', toggleSettingsPanel);
    }
    
    // Close button
    const closeBtn = document.querySelector('.settings-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsPanel);
    }
    
    // Volume slider
    const volumeSlider = document.getElementById('music-volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            updateMusicVolume(volume);
            updateVolumeDisplay(volume);
        });
    }
    
    // Graphics quality buttons
    const qualityBtns = document.querySelectorAll('[data-quality]');
    qualityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setQualityLevel(btn.dataset.quality);
        });
    });
    
    // Lighting quality buttons
    const lightingBtns = document.querySelectorAll('[data-lighting]');
    lightingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setLightingLevel(btn.dataset.lighting);
        });
    });
    
    // Checkbox settings
    document.getElementById('show-fps')?.addEventListener('change', (e) => {
        localStorage.setItem('showFPS', e.target.checked);
        toggleFPSDisplay(e.target.checked);
    });
    
    document.getElementById('show-tips')?.addEventListener('change', (e) => {
        localStorage.setItem('showTips', e.target.checked);
        // Also update the LLM tips toggle
        const llmToggles = document.querySelectorAll('#loading-llm-toggle, #start-llm-toggle');
        llmToggles.forEach(toggle => {
            toggle.checked = e.target.checked;
        });
        // Update global state
        if (window.useLLMTips !== undefined) {
            window.useLLMTips = e.target.checked;
            localStorage.setItem('useLLMTips', e.target.checked);
        }
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('settings-panel');
        if (settingsOpen && 
            panel && 
            !panel.contains(e.target) && 
            !e.target.classList.contains('settings-menu-btn') &&
            !e.target.classList.contains('settings-button') &&
            !e.target.closest('.settings-menu-btn') &&
            !e.target.closest('.settings-button')) {
            closeSettingsPanel();
        }
    });
}

function toggleSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        settingsOpen = !panel.classList.contains('hidden');
    }
}

function closeSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.classList.add('hidden');
        settingsOpen = false;
    }
}

function updateMusicVolume(volume) {
    // Update stored volume
    localStorage.setItem('musicVolume', volume);
    
    // Update music player if available
    import('./musicPlayer.js').then(module => {
        if (typeof module.setVolumeLevel === 'function') {
            module.setVolumeLevel(volume);
        }
    }).catch(err => {
        console.error("Error importing music player:", err);
    });
}

function updateVolumeDisplay(volume) {
    const dots = document.querySelectorAll('.volume-display .volume-dot');
    dots.forEach((dot, index) => {
        if (index < volume) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function setQualityLevel(level) {
    // Update UI
    const buttons = document.querySelectorAll('[data-quality]');
    buttons.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.quality === level);
    });
    
    // Save setting
    currentQualityLevel = level;
    localStorage.setItem('graphicsQuality', level);
    
    // Apply setting
    applyQualitySettings();
}

function setLightingLevel(level) {
    // Update UI
    const buttons = document.querySelectorAll('[data-lighting]');
    buttons.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.lighting === level);
    });
    
    // Save setting
    currentLightingLevel = level;
    localStorage.setItem('lightingQuality', level);
    
    // Apply setting
    applyLightingSettings();
}

function applyQualitySettings() {
    // Here we would apply the graphics quality settings to the THREE.js renderer
    // For now just log it
    console.log(`Applied graphics quality: ${currentQualityLevel}`);
}

function applyLightingSettings() {
    // Here we would apply the lighting settings to the THREE.js scene
    // For now just log it
    console.log(`Applied lighting quality: ${currentLightingLevel}`);
}

function toggleFPSDisplay(show) {
    // Here we would toggle the FPS display
    console.log(`FPS display: ${show ? 'enabled' : 'disabled'}`);
}

function loadSettingsFromStorage() {
    // Load saved settings from localStorage
    
    // Volume
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume !== null) {
        const volume = parseInt(savedVolume);
        document.getElementById('music-volume-slider').value = volume;
        updateVolumeDisplay(volume);
    }
    
    // Graphics quality
    const savedQuality = localStorage.getItem('graphicsQuality');
    if (savedQuality) {
        setQualityLevel(savedQuality);
    }
    
    // Lighting quality
    const savedLighting = localStorage.getItem('lightingQuality');
    if (savedLighting) {
        setLightingLevel(savedLighting);
    }
    
    // Show FPS
    const showFPS = localStorage.getItem('showFPS') === 'true';
    document.getElementById('show-fps').checked = showFPS;
    
    // Show tips
    const showTips = localStorage.getItem('showTips') !== 'false'; // Default to true
    document.getElementById('show-tips').checked = showTips;
}