// Music player functionality for The LLMs
import { config } from './config.js';

let bgAudio;
let musicVolume = 0; // 0-4 (OFF, 25%, 50%, 75%, 100%)
let musicPlayerInitialized = false;
let musicPlayerActive = false;

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
    
    // Create toggle button with a simple music note icon
    const toggleButton = document.createElement('button');
    toggleButton.className = 'music-toggle-button';
    toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
    `;
    
    // Create player panel
    const playerPanel = document.createElement('div');
    playerPanel.className = 'music-player-panel';
    
    // Create jukebox icon with animated waves
    const jukeboxIcon = document.createElement('div');
    jukeboxIcon.className = 'jukebox-icon';
    jukeboxIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
        </svg>
        <div class="jukebox-waves">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="#3cb371"/>
            </svg>
        </div>
    `;
    
    // Create volume indicator
    const volumeIndicator = document.createElement('div');
    volumeIndicator.className = 'volume-indicator';
    
    // Add 5 volume bars
    for (let i = 0; i < 5; i++) {
        const volumeBar = document.createElement('div');
        volumeBar.className = 'volume-bar';
        volumeBar.setAttribute('data-level', i);
        volumeIndicator.appendChild(volumeBar);
    }
    
    // Assemble components
    playerPanel.appendChild(jukeboxIcon);
    playerPanel.appendChild(volumeIndicator);
    
    container.appendChild(playerPanel);
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
            updateJukeboxAnimation();
        }
        return;
    }
    
    // Initialize new audio element
    bgAudio = new Audio('LLMs Morning Oasis - Sonauto.wav');
    bgAudio.loop = true;
    bgAudio.volume = 0; // Start with volume at 0
    
    // Store it globally for other modules
    window.bgAudio = bgAudio;
    
    musicPlayerInitialized = true;
}

function setupEventListeners() {
    // Toggle button opens/closes the player panel
    const toggleButton = document.querySelector('.music-toggle-button');
    toggleButton.addEventListener('click', toggleMusicPlayerPanel);
    
    // Jukebox changes volume state
    const jukeboxIcon = document.querySelector('.jukebox-icon');
    jukeboxIcon.addEventListener('click', changeVolumeState);
}

function toggleMusicPlayerPanel() {
    const panel = document.querySelector('.music-player-panel');
    musicPlayerActive = !musicPlayerActive;
    
    if (musicPlayerActive) {
        panel.classList.add('active');
    } else {
        panel.classList.remove('active');
    }
}

function changeVolumeState() {
    // Cycle through volume states
    musicVolume = (musicVolume + 1) % 5;
    
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
    updateJukeboxAnimation();
}

function updateVolumeUI() {
    const volumeBars = document.querySelectorAll('.volume-bar');
    const toggleButton = document.querySelector('.music-toggle-button');
    
    // Clear all volume classes
    toggleButton.classList.remove('volume-1', 'volume-2', 'volume-3', 'volume-4');
    
    // Add appropriate volume class and playing animation
    if (musicVolume > 0) {
        toggleButton.classList.add(`volume-${musicVolume}`);
        toggleButton.classList.add('playing');
    } else {
        toggleButton.classList.remove('playing');
    }
    
    volumeBars.forEach((bar, index) => {
        if (index < musicVolume) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    });
}

function updateJukeboxAnimation() {
    const jukeboxIcon = document.querySelector('.jukebox-icon');
    
    if (musicVolume > 0) {
        jukeboxIcon.classList.add('playing');
    } else {
        jukeboxIcon.classList.remove('playing');
    }
}