// Music player functionality for The LLMs
import { config } from './config.js';

let bgAudio;
let musicVolume = 0; // 0-4 (OFF, 25%, 50%, 75%, 100%)
let musicPlayerInitialized = false;
let currentMusicTrack = 'LLMs Morning Oasis - Sonauto.wav';
let customMusicSelected = false;

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
    
    // Add 4 volume dots
    for (let i = 0; i < 4; i++) {
        const dot = document.createElement('div');
        dot.className = 'volume-dot';
        dot.setAttribute('data-level', i);
        volumeDots.appendChild(dot);
    }
    
    toggleButton.appendChild(volumeDots);
    container.appendChild(toggleButton);
    
    // Create music selector menu (initially hidden)
    const musicMenu = document.createElement('div');
    musicMenu.className = 'music-menu hidden';
    musicMenu.innerHTML = `
        <div class="music-menu-header">Select Music</div>
        <div class="music-menu-options">
            <button class="music-option default-track">Default Music</button>
            <label class="music-option custom-track">
                Custom Music
                <input type="file" accept="audio/*" class="custom-music-input">
            </label>
        </div>
    `;
    
    container.appendChild(musicMenu);
    
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
    bgAudio = new Audio(currentMusicTrack);
    bgAudio.loop = true;
    bgAudio.volume = 0; // Start with volume at 0
    
    // Load saved volume from localStorage or use configured default
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume !== null) {
        musicVolume = parseInt(savedVolume);
    } else if (config.music && config.music.defaultVolume !== undefined) {
        musicVolume = config.music.defaultVolume;
    }
    
    // Don't auto-play, just update volume state UI
    updateVolumeUI();
    
    // Store it globally for other modules
    window.bgAudio = bgAudio;
    
    musicPlayerInitialized = true;
}

function setupEventListeners() {
    // Toggle button changes volume
    const toggleButton = document.querySelector('.music-toggle-button');
    toggleButton.addEventListener('click', changeVolumeState);
    
    // Context menu (right click) or long press opens music selector
    toggleButton.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleMusicMenu();
    });
    
    // Long press for mobile
    let longPressTimer;
    toggleButton.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => {
            toggleMusicMenu();
        }, 800); // 800ms for long press
    });
    
    toggleButton.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });
    
    // Default track selection
    const defaultTrackBtn = document.querySelector('.default-track');
    if (defaultTrackBtn) {
        defaultTrackBtn.addEventListener('click', () => {
            changeTrack('LLMs Morning Oasis - Sonauto.wav');
            toggleMusicMenu();
        });
    }
    
    // Custom track selection
    const customTrackInput = document.querySelector('.custom-music-input');
    if (customTrackInput) {
        customTrackInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const objectURL = URL.createObjectURL(file);
                changeTrack(objectURL, true);
                toggleMusicMenu();
            }
        });
    }
    
    // Click outside closes menu
    document.addEventListener('click', (e) => {
        const musicMenu = document.querySelector('.music-menu');
        const toggleButton = document.querySelector('.music-toggle-button');
        
        if (!musicMenu.classList.contains('hidden') && 
            !musicMenu.contains(e.target) && 
            !toggleButton.contains(e.target)) {
            musicMenu.classList.add('hidden');
        }
    });
}

function toggleMusicMenu() {
    const musicMenu = document.querySelector('.music-menu');
    musicMenu.classList.toggle('hidden');
}

function changeTrack(trackSrc, isCustom = false) {
    // Remember current volume and playing state
    const wasPlaying = !bgAudio.paused;
    const currentVolume = bgAudio.volume;
    
    // Stop current audio
    bgAudio.pause();
    
    // Update source
    currentMusicTrack = trackSrc;
    customMusicSelected = isCustom;
    
    // Create new audio element
    bgAudio = new Audio(trackSrc);
    bgAudio.loop = true;
    bgAudio.volume = currentVolume;
    
    // Update global reference
    window.bgAudio = bgAudio;
    
    // Resume playback if it was playing
    if (wasPlaying) {
        bgAudio.play().catch(err => {
            console.error("Error playing audio:", err);
        });
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
    
    // Apply volume without starting/stopping playback
    bgAudio.volume = actualVolume;
    
    // Save to localStorage
    localStorage.setItem('musicVolume', musicVolume);
    
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

// New global functions for other modules to use
export function playMusic() {
    if (bgAudio && musicVolume > 0) {
        bgAudio.play().catch(err => {
            console.error("Error playing audio:", err);
        });
    }
}

export function pauseMusic() {
    if (bgAudio) {
        bgAudio.pause();
    }
}

export function fadeInMusic(duration = 5000) {
    if (!bgAudio || musicVolume === 0) return;
    
    const targetVolume = [0, 0.25, 0.5, 0.75, 1.0][musicVolume];
    bgAudio.volume = 0;
    
    const fadeSteps = 50; // More steps for smoother transition
    const volumeStep = targetVolume / fadeSteps;
    const intervalTime = duration / fadeSteps;
    
    bgAudio.play().catch(err => {
        console.error("Error playing audio:", err);
        return;
    });
    
    const fadeInterval = setInterval(() => {
        if (bgAudio.volume < (targetVolume - volumeStep)) {
            bgAudio.volume += volumeStep;
        } else {
            bgAudio.volume = targetVolume;
            clearInterval(fadeInterval);
        }
    }, intervalTime);
    
    // Update music player UI
    updateVolumeUI();
}

export function fadeOutMusic(duration = 3000) {
    if (!bgAudio || bgAudio.volume === 0) return;
    
    const startVolume = bgAudio.volume;
    const fadeSteps = 50; 
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
    
    // Update music player UI
    document.querySelector('.music-toggle-button').classList.remove('playing');
}