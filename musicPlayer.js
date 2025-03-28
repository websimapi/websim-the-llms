// Music player functionality for The LLMs
import { config } from './config.js';

let bgAudio;
let musicVolume = 0; // 0-4 (OFF, 25%, 50%, 75%, 100%)
let musicPlayerInitialized = false;
const CITY_MUSIC_TRACK = 'LLMs Morning Oasis - Sonauto.wav'; // Default city music
const CREATION_MUSIC_TRACK = '/The LLMs - Creation Awaits.wav'; // Creation UI music (assuming path)
let currentTrackType = 'city'; // 'city' or 'creation'
let targetTrackType = 'city'; // Track the intended state
let fadeInterval = null; // Track active fade interval
let customMusicSelected = false;

export function setupMusicPlayer() {
    // Create the music player UI
    createMusicPlayerUI();
    
    // Initialize audio if not already done
    initializeAudio();
    
    // Add event listeners
    setupEventListeners();
    
    // Create and setup toggle triangle
    createMusicToggle();
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
            <button class="music-option default-track" data-track-type="city">City Music</button>
            <button class="music-option creation-track" data-track-type="creation">Creation Music</button>
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
        
        // Determine current track type based on src
        if (bgAudio.src.includes(CREATION_MUSIC_TRACK)) {
            currentTrackType = 'creation';
        } else {
            currentTrackType = 'city'; // Assume city or custom
        }
        targetTrackType = currentTrackType; // Initialize target

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
    
    // Initialize new audio element with city music
    bgAudio = new Audio(CITY_MUSIC_TRACK);
    bgAudio.loop = true;
    bgAudio.volume = 0; // Start with volume at 0
    currentTrackType = 'city';
    targetTrackType = 'city';

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
            playTrack('city');
            toggleMusicMenu();
        });
    }

    // Creation track selection
    const creationTrackBtn = document.querySelector('.creation-track');
    if (creationTrackBtn) {
        creationTrackBtn.addEventListener('click', () => {
            playTrack('creation');
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
                playTrack('custom', objectURL);
                toggleMusicMenu();
                e.target.value = '';
            }
        });
    }
    
    // Click outside closes menu
    document.addEventListener('click', (e) => {
        const musicMenu = document.querySelector('.music-menu');
        const toggleButton = document.querySelector('.music-toggle-button');
        
        if (musicMenu && !musicMenu.classList.contains('hidden') &&
            !musicMenu.contains(e.target) &&
            toggleButton && !toggleButton.contains(e.target)) {
            musicMenu.classList.add('hidden');
        }
    });
}

function toggleMusicMenu() {
    const musicMenu = document.querySelector('.music-menu');
    musicMenu.classList.toggle('hidden');
}

function changeTrack(trackSrc, trackType) {
    // Stop current audio and clear fade interval
    if (bgAudio) {
        bgAudio.pause();
    }
    if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
    }

    // Create new audio element
    bgAudio = new Audio(trackSrc);
    bgAudio.loop = true;
    bgAudio.volume = [0, 0.25, 0.5, 0.75, 1.0][musicVolume];

    // Update global reference and state
    window.bgAudio = bgAudio;
    currentTrackType = trackType;
    customMusicSelected = (trackType === 'custom');

    console.log(`Switched track to: ${trackSrc}, type: ${trackType}, volume: ${bgAudio.volume}`);

    // Start playback if volume is not 0
    if (bgAudio.volume > 0) {
        bgAudio.play().catch(err => {
            console.error("Error playing new audio track:", err);
        });
    }
    updateVolumeUI();
}

function changeVolumeState() {
    // Cycle through volume states
    musicVolume = (musicVolume + 1) % 5;
    updateVolumeState();
}

function updateVolumeState() {
    // Set volume on audio element
    let actualVolume = [0, 0.25, 0.5, 0.75, 1.0][musicVolume];
    
    // Stop fading if user manually changes volume
    if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
    }

    bgAudio.volume = actualVolume;
    
    // Start/stop playback based on volume
    if (actualVolume > 0 && bgAudio.paused) {
        bgAudio.play().catch(err => console.error("Error playing audio on volume change:", err));
    } else if (actualVolume === 0 && !bgAudio.paused) {
        bgAudio.pause();
    }

    localStorage.setItem('musicVolume', musicVolume);
    
    updateVolumeUI();
}

function updateVolumeUI() {
    const toggleButton = document.querySelector('.music-toggle-button');
    const volumeDots = document.querySelectorAll('.volume-dot');
    
    toggleButton.classList.remove('muted', 'volume-25', 'volume-50', 'volume-75', 'volume-100', 'playing');
    
    if (musicVolume === 0) {
        toggleButton.classList.add('muted');
    } else {
        const volumeClass = ['muted', 'volume-25', 'volume-50', 'volume-75', 'volume-100'][musicVolume];
        toggleButton.classList.add(volumeClass);
        
        if (!bgAudio.paused) {
            toggleButton.classList.add('playing');
        }
    }
    
    volumeDots.forEach((dot, index) => {
        if (index < musicVolume) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function createMusicToggle() {
    // Create toggle triangle
    const toggleTriangle = document.createElement('div');
    toggleTriangle.className = 'music-toggle-triangle';
    document.body.appendChild(toggleTriangle);
    
    // Add click handler
    toggleTriangle.addEventListener('click', () => {
        const musicControl = document.querySelector('.music-control-container');
        if (musicControl) {
            const isVisible = !musicControl.classList.contains('hidden');
            if (isVisible) {
                musicControl.classList.add('hidden');
                toggleTriangle.classList.add('hidden');
            } else {
                musicControl.classList.remove('hidden');
                toggleTriangle.classList.remove('hidden');
            }
        }
    });
}

/**
 * Plays the specified track type, fading out the current track if necessary.
 * @param {'city' | 'creation' | 'custom'} type - The type of track to play.
 * @param {string} [customSrc] - The source URL if type is 'custom'.
 */
export async function playTrack(type, customSrc = '') {
    targetTrackType = type;

    if (type === currentTrackType && !bgAudio.paused) {
        console.log(`Track type ${type} is already playing.`);
        fadeInMusic(0);
        return;
    }

    const newTrackSrc = type === 'creation' ? CREATION_MUSIC_TRACK :
                       type === 'city' ? CITY_MUSIC_TRACK :
                       type === 'custom' ? customSrc : CITY_MUSIC_TRACK;

    if (!newTrackSrc) {
        console.error("Invalid track type or missing custom source.");
        return;
    }

    console.log(`Request to play track type: ${type}. Current: ${currentTrackType}`);

    if (!bgAudio.paused && bgAudio.volume > 0) {
        await fadeOutMusic(config.music.fadeOutDuration || 1500);
    }

    if (targetTrackType !== type) {
         console.log(`Target track changed during fade-out. Aborting switch to ${type}.`);
         return;
     }

    changeTrack(newTrackSrc, type);

    fadeInMusic(config.music.fadeInDuration || 3000);
}

export function playMusic() {
    if (!bgAudio) initializeAudio();
    if (musicVolume > 0) {
        bgAudio.play().catch(err => {
            console.error("Error playing audio:", err);
        });
        updateVolumeUI();
    }
}

export function pauseMusic() {
    if (bgAudio) {
        bgAudio.pause();
        updateVolumeUI();
    }
}

export function fadeInMusic(duration = 5000) {
    if (!bgAudio || musicVolume === 0) {
        console.log("Cannot fade in: No audio or volume is 0.");
        return;
    }

    if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
    }

    const targetVolume = [0, 0.25, 0.5, 0.75, 1.0][musicVolume];
    let startVolume = bgAudio.volume > 0.01 ? bgAudio.volume : 0.01;
    bgAudio.volume = startVolume;

    if (targetVolume <= startVolume && duration > 0) {
        console.log("Fade-in skipped: Target volume not higher than current volume.");
        bgAudio.volume = targetVolume;
        updateVolumeUI();
        return;
    }

    bgAudio.play().catch(err => {
        console.error("Error playing audio during fade-in:", err);
        return;
    });
    console.log(`Fading in to volume ${targetVolume} over ${duration}ms`);

    if (duration === 0) {
        bgAudio.volume = targetVolume;
        updateVolumeUI();
        return;
    }

    const fadeSteps = 50;
    const volumeStep = (targetVolume - startVolume) / fadeSteps;
    const intervalTime = duration / fadeSteps;

    fadeInterval = setInterval(() => {
        if (targetTrackType !== currentTrackType) {
            console.log("Target track changed during fade-in. Stopping fade.");
            clearInterval(fadeInterval);
            fadeInterval = null;
            return;
        }

        let newVolume = bgAudio.volume + volumeStep;
        if ((volumeStep > 0 && newVolume < targetVolume) || (volumeStep < 0 && newVolume > targetVolume)) {
            bgAudio.volume = newVolume;
        } else {
            bgAudio.volume = targetVolume;
            clearInterval(fadeInterval);
            fadeInterval = null;
            console.log("Fade-in complete.");
        }
        updateVolumeUI();
    }, intervalTime);

    updateVolumeUI();
}

export function fadeOutMusic(duration = 3000) {
    return new Promise(resolve => {
        if (!bgAudio || bgAudio.volume === 0 || bgAudio.paused) {
            console.log("Fade-out skipped: Audio not playing or volume is 0.");
            resolve();
            return;
        }

        if (fadeInterval) {
            clearInterval(fadeInterval);
            fadeInterval = null;
        }
        console.log(`Fading out from volume ${bgAudio.volume} over ${duration}ms`);

        const startVolume = bgAudio.volume;
        const fadeSteps = 50;
        const volumeStep = startVolume / fadeSteps;
        const intervalTime = duration / fadeSteps;

        fadeInterval = setInterval(() => {
            let newVolume = bgAudio.volume - volumeStep;
            if (newVolume > 0.01) {
                bgAudio.volume = newVolume;
            } else {
                bgAudio.volume = 0;
                bgAudio.pause();
                clearInterval(fadeInterval);
                fadeInterval = null;
                console.log("Fade-out complete.");
                resolve();
            }
            updateVolumeUI();
        }, intervalTime);
        updateVolumeUI();
    });
}