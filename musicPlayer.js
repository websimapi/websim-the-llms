// Music player functionality for The LLMs
import { config } from './config.js';

let bgAudio;
let musicVolume = 0; // 0-4 (OFF, 25%, 50%, 75%, 100%)
let musicPlayerInitialized = false;
let longPressTimer;
let customAudioFile = null;

export function setupMusicPlayer() {
    // Create the music player UI
    createMusicPlayerUI();
    
    // Initialize audio if not already done
    initializeAudio();
    
    // Add event listeners
    setupEventListeners();
}

function createMusicPlayerUI() {
    // Create container
    const container = document.createElement('div');
    container.className = 'music-control-container';
    
    // Create toggle button with music note icon
    const toggleButton = document.createElement('button');
    toggleButton.className = 'music-toggle-button muted';
    toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
    `;
    
    // Add volume indicator dots
    const volumeDots = document.createElement('div');
    volumeDots.className = 'volume-dots';
    
    // Add 5 volume dots
    for (let i = 0; i < 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'volume-dot';
        dot.setAttribute('data-level', i);
        volumeDots.appendChild(dot);
    }
    
    toggleButton.appendChild(volumeDots);
    container.appendChild(toggleButton);
    
    // Create advanced player container (hidden by default)
    const advancedPlayer = document.createElement('div');
    advancedPlayer.className = 'advanced-music-player hidden';
    advancedPlayer.innerHTML = `
        <div class="advanced-player-header">Music Player</div>
        <div class="advanced-player-content">
            <input type="file" id="custom-audio-file" accept="audio/*" class="custom-audio-input">
            <label for="custom-audio-file" class="custom-audio-label">Select Music File</label>
            <div class="now-playing-info">No file selected</div>
        </div>
        <div class="advanced-player-footer">
            <button class="close-advanced-player">Close</button>
        </div>
    `;
    
    container.appendChild(advancedPlayer);
    
    // Add to body
    document.body.appendChild(container);
}

function initializeAudio() {
    // Check if already initialized in another module
    if (window.bgAudio) {
        bgAudio = window.bgAudio;
        musicPlayerInitialized = true;
        
        // Set initial volume state based on audio element
        if (bgAudio.volume > 0) {
            if (bgAudio.volume <= 0.25) musicVolume = 1;
            else if (bgAudio.volume <= 0.50) musicVolume = 2;
            else if (bgAudio.volume <= 0.75) musicVolume = 3;
            else musicVolume = 4;
            
            updateVolumeUI();
        }
        return;
    }
    
    // Initialize new audio element
    bgAudio = new Audio('LLMs Morning Oasis - Sonauto.wav');
    bgAudio.loop = true;
    bgAudio.volume = 0; // Start with volume at 0
    
    // Use configured initial volume if available
    if (config.music && config.music.defaultVolume) {
        musicVolume = config.music.defaultVolume;
        updateVolumeState();
    }
    
    // Store it globally for other modules
    window.bgAudio = bgAudio;
    
    musicPlayerInitialized = true;
}

function setupEventListeners() {
    // Toggle button changes volume
    const toggleButton = document.querySelector('.music-toggle-button');
    
    // Normal click changes volume
    toggleButton.addEventListener('click', changeVolumeState);
    
    // Right click or long press opens advanced player
    toggleButton.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showAdvancedPlayer();
    });
    
    // Setup long press for mobile
    toggleButton.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            showAdvancedPlayer();
        }, 800); // 800ms long press
    });
    
    toggleButton.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });
    
    toggleButton.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
    });
    
    // Setup advanced player controls
    const closeAdvancedBtn = document.querySelector('.close-advanced-player');
    if (closeAdvancedBtn) {
        closeAdvancedBtn.addEventListener('click', hideAdvancedPlayer);
    }
    
    // Setup file input change handler
    const fileInput = document.getElementById('custom-audio-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

function changeVolumeState() {
    // Cycle through volume states
    musicVolume = (musicVolume + 1) % 5;
    updateVolumeState();
}

function updateVolumeState() {
    // Set volume on audio element
    let actualVolume = 0;
    switch(musicVolume) {
        case 1: actualVolume = 0.25; break;
        case 2: actualVolume = 0.50; break;
        case 3: actualVolume = 0.75; break;
        case 4: actualVolume = 1.00; break;
        default: actualVolume = 0; // OFF
    }
    
    // Apply volume to current audio
    if (bgAudio) {
        bgAudio.volume = actualVolume;
        
        // Start playback if at non-zero volume and paused
        if (musicVolume > 0 && bgAudio.paused) {
            bgAudio.play().catch(err => {
                console.error("Error playing audio:", err);
                // Reset volume if playback failed
                musicVolume = 0;
                bgAudio.volume = 0;
            });
        } else if (musicVolume === 0) {
            bgAudio.pause();
        }
    }
    
    // Update UI
    updateVolumeUI();
}

function updateVolumeUI() {
    const toggleButton = document.querySelector('.music-toggle-button');
    const volumeDots = document.querySelectorAll('.volume-dot');
    
    if (!toggleButton) return;
    
    // Update button class based on volume level
    toggleButton.classList.remove('muted', 'volume-25', 'volume-50', 'volume-75', 'volume-100', 'playing');
    
    if (musicVolume === 0) {
        toggleButton.classList.add('muted');
    } else {
        const volumeClass = ['muted', 'volume-25', 'volume-50', 'volume-75', 'volume-100'][musicVolume];
        toggleButton.classList.add(volumeClass);
        
        // Add playing animation if music is on
        toggleButton.classList.add('playing');
    }
    
    // Update volume dots
    volumeDots.forEach((dot, index) => {
        if (index < musicVolume) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function showAdvancedPlayer() {
    const advancedPlayer = document.querySelector('.advanced-music-player');
    if (advancedPlayer) {
        advancedPlayer.classList.remove('hidden');
    }
}

function hideAdvancedPlayer() {
    const advancedPlayer = document.querySelector('.advanced-music-player');
    if (advancedPlayer) {
        advancedPlayer.classList.add('hidden');
    }
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    const file = files[0];
    const fileURL = URL.createObjectURL(file);
    
    // Update now playing info
    const nowPlayingInfo = document.querySelector('.now-playing-info');
    if (nowPlayingInfo) {
        nowPlayingInfo.textContent = `Now playing: ${file.name}`;
    }
    
    // Stop current audio
    if (bgAudio) {
        bgAudio.pause();
    }
    
    // Create new audio with selected file
    bgAudio = new Audio(fileURL);
    bgAudio.loop = true;
    window.bgAudio = bgAudio;
    
    // Apply current volume setting
    updateVolumeState();
    
    // Start playback if volume is not 0
    if (musicVolume > 0) {
        bgAudio.play().catch(err => {
            console.error("Error playing custom audio:", err);
        });
    }
    
    // Store the custom file
    customAudioFile = fileURL;
}

// Export additional functions for global access
export function getVolumeState() {
    return musicVolume;
}

export function setVolumeState(volume) {
    if (volume >= 0 && volume <= 4) {
        musicVolume = volume;
        updateVolumeState();
    }
}