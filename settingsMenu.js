// Settings menu functionality
import { config } from './config.js';

// Settings state management
let settingsState = {
    musicVolume: 2, // Default to 50%
    graphicsQuality: 'medium',
    shadowsEnabled: true,
    antialiasing: true,
    postProcessing: false,
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 0.8
};

// Initialize settings from localStorage or defaults
export function initializeSettings() {
    // Create the settings menu UI
    createSettingsUI();
    
    // Load settings from localStorage
    loadSettings();
    
    // Add event listeners
    setupEventListeners();
}

function createSettingsUI() {
    // Create settings icon container
    const settingsIconContainer = document.createElement('div');
    settingsIconContainer.className = 'settings-icon-container';
    
    // Create settings icon button
    const settingsIcon = document.createElement('button');
    settingsIcon.className = 'settings-icon';
    settingsIcon.id = 'settings-button';
    settingsIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
    `;
    
    settingsIconContainer.appendChild(settingsIcon);
    document.body.appendChild(settingsIconContainer);
    
    // Create settings menu
    const settingsMenu = document.createElement('div');
    settingsMenu.className = 'settings-menu';
    settingsMenu.id = 'settings-menu';
    
    settingsMenu.innerHTML = `
        <div class="settings-header">
            <div class="settings-title">Settings</div>
            <button class="settings-close" id="settings-close">&times;</button>
        </div>
        
        <div class="settings-content">
            <!-- Audio Settings -->
            <div class="settings-section">
                <div class="settings-section-title">Audio Settings</div>
                
                <div class="setting-item">
                    <div class="setting-label">Music Volume</div>
                    <div class="setting-control">
                        <input type="range" class="setting-slider" id="music-volume-slider" min="0" max="4" step="1" value="2">
                        <span class="setting-value" id="music-volume-value">50%</span>
                    </div>
                </div>
            </div>
            
            <!-- Graphics Settings -->
            <div class="settings-section">
                <div class="settings-section-title">Graphics Settings</div>
                
                <div class="setting-item">
                    <div class="setting-label">Graphics Quality</div>
                    <div class="setting-control">
                        <select class="setting-select" id="graphics-quality">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="ultra">Ultra</option>
                        </select>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">Shadows</div>
                    <div class="setting-control">
                        <select class="setting-select" id="shadows-enabled">
                            <option value="true" selected>Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">Anti-aliasing</div>
                    <div class="setting-control">
                        <select class="setting-select" id="antialiasing">
                            <option value="true" selected>Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">Post-processing</div>
                    <div class="setting-control">
                        <select class="setting-select" id="post-processing">
                            <option value="true">Enabled</option>
                            <option value="false" selected>Disabled</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Lighting Settings -->
            <div class="settings-section">
                <div class="settings-section-title">Lighting Settings</div>
                
                <div class="setting-item">
                    <div class="setting-label">Ambient Light Intensity</div>
                    <div class="setting-control">
                        <input type="range" class="setting-slider" id="ambient-light" min="0" max="1" step="0.1" value="0.6">
                        <span class="setting-value" id="ambient-light-value">0.6</span>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">Directional Light Intensity</div>
                    <div class="setting-control">
                        <input type="range" class="setting-slider" id="directional-light" min="0" max="1" step="0.1" value="0.8">
                        <span class="setting-value" id="directional-light-value">0.8</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="settings-footer">
            <button class="settings-button secondary" id="reset-settings">Reset to Default</button>
            <button class="settings-button" id="save-settings">Save Settings</button>
        </div>
    `;
    
    document.body.appendChild(settingsMenu);
}

function setupEventListeners() {
    // Toggle settings menu
    const settingsButton = document.getElementById('settings-button');
    const settingsMenu = document.getElementById('settings-menu');
    const closeButton = document.getElementById('settings-close');
    
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            settingsMenu.classList.toggle('active');
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            settingsMenu.classList.remove('active');
        });
    }
    
    // Music volume slider
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeValue = document.getElementById('music-volume-value');
    
    if (musicVolumeSlider && musicVolumeValue) {
        musicVolumeSlider.value = settingsState.musicVolume;
        updateMusicVolumeDisplay(settingsState.musicVolume);
        
        musicVolumeSlider.addEventListener('input', function() {
            const volumeLevel = parseInt(this.value);
            settingsState.musicVolume = volumeLevel;
            updateMusicVolumeDisplay(volumeLevel);
            applyMusicVolumeSetting(volumeLevel);
        });
    }
    
    // Graphics quality selector
    const graphicsQualitySelect = document.getElementById('graphics-quality');
    if (graphicsQualitySelect) {
        graphicsQualitySelect.value = settingsState.graphicsQuality;
        
        graphicsQualitySelect.addEventListener('change', function() {
            settingsState.graphicsQuality = this.value;
            applyGraphicsQualitySetting(this.value);
        });
    }
    
    // Shadows toggle
    const shadowsSelect = document.getElementById('shadows-enabled');
    if (shadowsSelect) {
        shadowsSelect.value = settingsState.shadowsEnabled.toString();
        
        shadowsSelect.addEventListener('change', function() {
            settingsState.shadowsEnabled = this.value === 'true';
            applyShadowsSetting(settingsState.shadowsEnabled);
        });
    }
    
    // Anti-aliasing toggle
    const antialiasSelect = document.getElementById('antialiasing');
    if (antialiasSelect) {
        antialiasSelect.value = settingsState.antialiasing.toString();
        
        antialiasSelect.addEventListener('change', function() {
            settingsState.antialiasing = this.value === 'true';
            applyAntialiasingSetting(settingsState.antialiasing);
        });
    }
    
    // Post-processing toggle
    const postProcessingSelect = document.getElementById('post-processing');
    if (postProcessingSelect) {
        postProcessingSelect.value = settingsState.postProcessing.toString();
        
        postProcessingSelect.addEventListener('change', function() {
            settingsState.postProcessing = this.value === 'true';
            applyPostProcessingSetting(settingsState.postProcessing);
        });
    }
    
    // Ambient light intensity
    const ambientLightSlider = document.getElementById('ambient-light');
    const ambientLightValue = document.getElementById('ambient-light-value');
    
    if (ambientLightSlider && ambientLightValue) {
        ambientLightSlider.value = settingsState.ambientLightIntensity;
        ambientLightValue.textContent = settingsState.ambientLightIntensity;
        
        ambientLightSlider.addEventListener('input', function() {
            const intensity = parseFloat(this.value);
            settingsState.ambientLightIntensity = intensity;
            ambientLightValue.textContent = intensity.toFixed(1);
            applyAmbientLightSetting(intensity);
        });
    }
    
    // Directional light intensity
    const directionalLightSlider = document.getElementById('directional-light');
    const directionalLightValue = document.getElementById('directional-light-value');
    
    if (directionalLightSlider && directionalLightValue) {
        directionalLightSlider.value = settingsState.directionalLightIntensity;
        directionalLightValue.textContent = settingsState.directionalLightIntensity;
        
        directionalLightSlider.addEventListener('input', function() {
            const intensity = parseFloat(this.value);
            settingsState.directionalLightIntensity = intensity;
            directionalLightValue.textContent = intensity.toFixed(1);
            applyDirectionalLightSetting(intensity);
        });
    }
    
    // Save settings button
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveSettings();
            settingsMenu.classList.remove('active');
        });
    }
    
    // Reset settings button
    const resetButton = document.getElementById('reset-settings');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetSettings();
        });
    }
}

function updateMusicVolumeDisplay(volumeLevel) {
    const volumeValue = document.getElementById('music-volume-value');
    if (volumeValue) {
        const percentages = ['OFF', '25%', '50%', '75%', '100%'];
        volumeValue.textContent = percentages[volumeLevel];
    }
}

function applyMusicVolumeSetting(volumeLevel) {
    // Use the existing musicPlayer module
    import('./musicPlayer.js').then(module => {
        // Set the volume level (0-4 scale)
        if (typeof module.setMusicVolumeLevel === 'function') {
            module.setMusicVolumeLevel(volumeLevel);
        } else {
            console.warn("setMusicVolumeLevel function not found in musicPlayer.js");
            
            // Fallback to directly modifying the audio element if available
            if (window.bgAudio) {
                // Convert 0-4 scale to 0-1 scale
                const actualVolume = volumeLevel === 0 ? 0 : volumeLevel * 0.25;
                window.bgAudio.volume = actualVolume;
                
                // Save to localStorage
                localStorage.setItem('musicVolume', volumeLevel);
            }
        }
    });
}

function applyGraphicsQualitySetting(quality) {
    // Will be implemented when the renderer is updated to support quality settings
    console.log("Graphics quality set to:", quality);
}

function applyShadowsSetting(enabled) {
    // Will be implemented when adding shadow controls to the renderer
    console.log("Shadows", enabled ? "enabled" : "disabled");
}

function applyAntialiasingSetting(enabled) {
    // Will be implemented when adding antialiasing controls to the renderer
    console.log("Anti-aliasing", enabled ? "enabled" : "disabled");
}

function applyPostProcessingSetting(enabled) {
    // Will be implemented when adding post-processing to the renderer
    console.log("Post-processing", enabled ? "enabled" : "disabled");
}

function applyAmbientLightSetting(intensity) {
    // Adjust ambient light in the scene
    console.log("Ambient light intensity set to:", intensity);
}

function applyDirectionalLightSetting(intensity) {
    // Adjust directional light in the scene
    console.log("Directional light intensity set to:", intensity);
}

function loadSettings() {
    // Load music volume from localStorage
    const savedMusicVolume = localStorage.getItem('musicVolume');
    if (savedMusicVolume !== null) {
        settingsState.musicVolume = parseInt(savedMusicVolume);
    }
    
    // Load other settings from localStorage if they exist
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            
            // Merge saved settings with default settings
            settingsState = { ...settingsState, ...parsedSettings };
            
            // Apply the loaded settings to UI elements
            applySettingsToUI();
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }
}

function applySettingsToUI() {
    // Update all UI elements to reflect current settings
    const graphicsQualitySelect = document.getElementById('graphics-quality');
    if (graphicsQualitySelect) {
        graphicsQualitySelect.value = settingsState.graphicsQuality;
    }
    
    const shadowsSelect = document.getElementById('shadows-enabled');
    if (shadowsSelect) {
        shadowsSelect.value = settingsState.shadowsEnabled.toString();
    }
    
    const antialiasSelect = document.getElementById('antialiasing');
    if (antialiasSelect) {
        antialiasSelect.value = settingsState.antialiasing.toString();
    }
    
    const postProcessingSelect = document.getElementById('post-processing');
    if (postProcessingSelect) {
        postProcessingSelect.value = settingsState.postProcessing.toString();
    }
    
    const ambientLightSlider = document.getElementById('ambient-light');
    const ambientLightValue = document.getElementById('ambient-light-value');
    if (ambientLightSlider && ambientLightValue) {
        ambientLightSlider.value = settingsState.ambientLightIntensity;
        ambientLightValue.textContent = settingsState.ambientLightIntensity.toFixed(1);
    }
    
    const directionalLightSlider = document.getElementById('directional-light');
    const directionalLightValue = document.getElementById('directional-light-value');
    if (directionalLightSlider && directionalLightValue) {
        directionalLightSlider.value = settingsState.directionalLightIntensity;
        directionalLightValue.textContent = settingsState.directionalLightIntensity.toFixed(1);
    }
    
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    if (musicVolumeSlider) {
        musicVolumeSlider.value = settingsState.musicVolume;
        updateMusicVolumeDisplay(settingsState.musicVolume);
    }
}

function saveSettings() {
    // Save music volume separately for compatibility with existing code
    localStorage.setItem('musicVolume', settingsState.musicVolume);
    
    // Save all other settings as a JSON object
    const settingsToSave = { ...settingsState };
    delete settingsToSave.musicVolume; // Exclude music volume since it's saved separately
    
    localStorage.setItem('gameSettings', JSON.stringify(settingsToSave));
    
    // Apply all settings immediately
    applyAllSettings();
}

function applyAllSettings() {
    applyMusicVolumeSetting(settingsState.musicVolume);
    applyGraphicsQualitySetting(settingsState.graphicsQuality);
    applyShadowsSetting(settingsState.shadowsEnabled);
    applyAntialiasingSetting(settingsState.antialiasing);
    applyPostProcessingSetting(settingsState.postProcessing);
    applyAmbientLightSetting(settingsState.ambientLightIntensity);
    applyDirectionalLightSetting(settingsState.directionalLightIntensity);
}

function resetSettings() {
    // Reset to default values
    settingsState = {
        musicVolume: 2,
        graphicsQuality: 'medium',
        shadowsEnabled: true,
        antialiasing: true,
        postProcessing: false,
        ambientLightIntensity: 0.6,
        directionalLightIntensity: 0.8
    };
    
    // Update UI to reflect reset settings
    applySettingsToUI();
    
    // Apply reset settings
    applyAllSettings();
}