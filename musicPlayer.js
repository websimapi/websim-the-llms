// Music player functionality for The LLMs
import { config } from './config.js';

let bgAudio;
let musicVolume = 0; // 0-4 (OFF, 25%, 50%, 75%, 100%)
let musicPlayerInitialized = false;

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
    toggleButton.addEventListener('click', changeVolumeState);
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
    
    // Apply volume and start playing if needed
    bgAudio.volume = actualVolume;
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
    
    // Update UI
    updateVolumeUI();
}

function updateVolumeUI() {
    const toggleButton = document.querySelector('.music-toggle-button');
    const volumeDots = document.querySelectorAll('.volume-dot');
    
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