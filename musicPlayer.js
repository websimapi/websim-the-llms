// musicPlayer.js
// Initialize musicVolume from localStorage, defaulting to 2 if not found or invalid
let musicVolume = parseInt(localStorage.getItem('musicVolume'));
if (isNaN(musicVolume) || musicVolume < 0 || musicVolume > 4) {
    musicVolume = 2; // Default to 50% volume
}

let currentMusicTrack = '/LLMs Morning Oasis - Sonauto.wav'; // Initialize with default track path
let customMusicSelected = false;
let bgAudio = null;
let musicFadeInterval = null;
let gameHasStarted = false;

function setupEventListeners() {
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
                // Clear the input value to allow selecting the same file again
                e.target.value = '';
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
    const wasPlaying = bgAudio ? !bgAudio.paused : false; // Handle case where bgAudio might be null initially
    const currentVolumeLevel = bgAudio ? bgAudio.volume : 0; // Use actual volume level, default 0

    // Stop current audio if it exists
    if (bgAudio) {
        bgAudio.pause();
    }

    // If custom track was selected, revoke previous object URL if it exists
    if (customMusicSelected && currentMusicTrack.startsWith('blob:')) {
        URL.revokeObjectURL(currentMusicTrack);
    }

    // Update source
    currentMusicTrack = trackSrc;
    customMusicSelected = isCustom;

    // Create new audio element
    bgAudio = new Audio(trackSrc);
    bgAudio.loop = true;
    bgAudio.volume = currentVolumeLevel; // Apply the previous volume level
    bgAudio.preload = 'metadata';

    // Add event listeners to the new audio object for UI updates
    bgAudio.addEventListener('play', updateVolumeUI);
    bgAudio.addEventListener('pause', updateVolumeUI);
    bgAudio.addEventListener('volumechange', updateVolumeUI);

    // Update global reference
    window.bgAudio = bgAudio;

    // Resume playback if it was playing and game has started
    if (wasPlaying && gameHasStarted) {
        bgAudio.play().catch((err) => {
            console.error("Error playing new track:", err);
        });
    }

    // Update UI
    updateVolumeUI();
}

function changeVolumeState() {
    // Cycle through volume states
    musicVolume = (musicVolume + 1) % 5;
    updateVolumeState(); // Call the function that applies the volume
}

function updateVolumeState() {
    if (!bgAudio) return; // Make sure bgAudio exists

    // Set volume on audio element
    let actualVolume = 0;
    switch(musicVolume) {
        case 1: actualVolume = 0.25; break;
        case 2: actualVolume = 0.50; break;
        case 3: actualVolume = 0.75; break;
        case 4: actualVolume = 1.00; break;
        default: actualVolume = 0; // OFF
    }

    // Apply volume
    bgAudio.volume = actualVolume;

    // Save to localStorage
    localStorage.setItem('musicVolume', musicVolume);

    // Start playing if unmuting after game start
    if (actualVolume > 0 && bgAudio.paused && gameHasStarted) {
        bgAudio.play().catch((err) => {
            console.error("Error playing audio on unmute:", err);
        });
    } else if (actualVolume === 0 && !bgAudio.paused) {
        // Explicitly pause if volume is set to 0 and it was playing
        bgAudio.pause();
    }

    // Update UI
    updateVolumeUI();
}

function updateVolumeUI() {
    const toggleButton = document.querySelector('.music-toggle-button');
    const volumeDots = document.querySelectorAll('.volume-dot');

    if (!toggleButton || !volumeDots.length) return; // Ensure elements exist

    // Update button class based on volume level
    toggleButton.classList.remove('muted', 'volume-25', 'volume-50', 'volume-75', 'volume-100', 'playing');

    if (musicVolume === 0) {
        toggleButton.classList.add('muted');
    } else {
        const volumeClass = ['muted', 'volume-25', 'volume-50', 'volume-75', 'volume-100'][musicVolume];
        toggleButton.classList.add(volumeClass);

        // Add playing animation if music is on AND actually playing (and game started)
        if (bgAudio && !bgAudio.paused && gameHasStarted) {
            toggleButton.classList.add('playing');
        }
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

// Exported setup function
export function setupMusicPlayer() {
    // Check if music control already exists to prevent duplication
    if (document.querySelector('.music-control-container')) {
        return;
    // Create main container
    const musicControl = document.createElement('div');
    musicControl.className = 'music-control-container';

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'music-toggle-button';
    toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/>
        </svg>
    `;

    // Create volume dots
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'volume-dots';
    for (let i = 0; i < 4; i++) {
        const dot = document.createElement('div');
        dot.className = 'volume-dot';
        dotsContainer.appendChild(dot);
    }

    // Create music menu
    const musicMenu = document.createElement('div');
    musicMenu.className = 'music-menu hidden';
    musicMenu.innerHTML = `
        <div class="music-menu-header">Music Options</div>
        <div class="music-menu-options">
            <button class="music-option default-track">Default Track</button>
            <label class="music-option custom-track">
                Custom Track
                <input type="file" class="custom-music-input" accept="audio/*">
            </label>
        </div>
    `;

    // Append elements
    toggleButton.appendChild(dotsContainer);
    musicControl.appendChild(toggleButton);
    musicControl.appendChild(musicMenu); // Menu is part of the container
    document.body.appendChild(musicControl);

    // Create audio element (initially)
    changeTrack(currentMusicTrack); // Initialize bgAudio

    // Setup event listeners for the newly created elements
    setupEventListeners();

    // Apply initial volume state
    updateVolumeState();

    // Initialize the corner toggle triangle
    createMusicToggle();

    console.log("Music player initialized");
}

// New global functions for other modules to use
export function playMusic() {
    gameHasStarted = true; // Mark game as started
    if (bgAudio && musicVolume > 0) {
        bgAudio.play().catch((err) => {
            console.error("Error playing audio:", err);
        });
        updateVolumeUI(); // Update UI to show playing state
    }
}

export function pauseMusic() {
    if (bgAudio) {
        bgAudio.pause();
        updateVolumeUI(); // Update UI to remove playing animation
    }
}

export function fadeInMusic(duration = 5000) {
    gameHasStarted = true; // Mark game as started when fade-in begins
    if (!bgAudio) {
        console.error("Cannot fade in: bgAudio not initialized.");
        return;
    }

    // Determine target volume based on current musicVolume state
    let targetVolume = [0, 0.25, 0.5, 0.75, 1.0][musicVolume];

    // If target volume is 0, don't start playback initially
    if (targetVolume === 0) {
        console.log("Fade-in skipped, target volume is 0.");
        bgAudio.volume = 0; // Ensure volume is 0
        if (!bgAudio.paused) bgAudio.pause(); // Pause if somehow playing
        updateVolumeUI(); // Update UI
        return;
    }

    // Set initial volume to 0 for fade-in effect
    bgAudio.volume = 0;

    const fadeSteps = 50; // More steps for smoother transition
    const volumeStep = targetVolume / fadeSteps;
    const intervalTime = duration / fadeSteps;

    // Start playback
    const playPromise = bgAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch((err) => {
            console.error("Error playing audio for fade-in:", err);
            // Don't start fade if playback failed
            return;
        });
    } else {
        console.warn("Audio play() did not a promise.");
        // Might be an older browser or unusual state, proceed with caution
    }

    // Clear any existing fade interval
    if (window.musicFadeInterval) {
        clearInterval(window.musicFadeInterval);
    }

    window.musicFadeInterval = setInterval(() => {
        if (bgAudio.volume < targetVolume - volumeStep) { // Check against target - step
            bgAudio.volume += volumeStep;
        } else {
            bgAudio.volume = targetVolume; // Set exactly to target
            clearInterval(window.musicFadeInterval);
            window.musicFadeInterval = null; // Clear the interval ID
        }
        // Update music player UI during fade if needed, though updateVolumeUI might be sufficient
        updateVolumeUI(); // Update UI on each step
    }, intervalTime);

    // Update music player UI immediately to reflect target state (e.g., show dots)
    updateVolumeUI();
}

export function fadeOutMusic(duration = 3000) {
    // console.log("Music continues playing - fade out disabled"); // Kept this line commented

    if (!bgAudio || bgAudio.volume === 0) return;

    const startVolume = bgAudio.volume;
    const fadeSteps = 50;
    const volumeStep = startVolume / fadeSteps;
    const intervalTime = duration / fadeSteps;

    // Clear any existing fade interval
    if (window.musicFadeInterval) {
        clearInterval(window.musicFadeInterval);
    }

    window.musicFadeInterval = setInterval(() => {
        if (bgAudio.volume > volumeStep) {
            bgAudio.volume -= volumeStep;
        } else {
            bgAudio.volume = 0;
            bgAudio.pause();
            clearInterval(window.musicFadeInterval);
            window.musicFadeInterval = null; // Clear the interval ID
            updateVolumeUI(); // Update UI after fade out completes
        }
        // Update UI during fade
        updateVolumeUI();
    }, intervalTime);

    // Update music player UI to remove playing animation immediately
    // document.querySelector('.music-toggle-button')?.classList.remove('playing'); // Optional: remove playing immediately
}