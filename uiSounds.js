// New file for UI sound effects
let audioContext;
let clickSoundBuffer;

// Initialize the AudioContext on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        generateClickSound();
    }
}

// Generate a simple click sound buffer
function generateClickSound() {
    if (!audioContext || clickSoundBuffer) return;

    const duration = 0.05; // Short duration
    const sampleRate = audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    clickSoundBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = clickSoundBuffer.getChannelData(0);

    // Simple decaying sine wave for a 'tick' or 'pop' sound
    const frequency = 880; // A5 note
    for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        const decay = Math.exp(-time * 50); // Faster decay
        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * decay * 0.4; // Lower volume
    }
}

// Play the generated click sound
export function playClickSound() {
    if (!audioContext || !clickSoundBuffer) {
        // Try initializing if not ready (e.g., user hasn't interacted yet)
        initAudioContext();
        // If still not ready after init attempt, exit
        if (!audioContext || !clickSoundBuffer) {
             console.warn("Audio context or click sound not ready.");
             return;
         }
    }

    const source = audioContext.createBufferSource();
    source.buffer = clickSoundBuffer;

    // Add a gain node for volume control if needed in the future
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.6; // Adjust click volume if needed

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
}

// Function to initialize audio context on first interaction
export function setupAudioInteractionListener() {
     const initAudio = () => {
         initAudioContext();
         // Remove listeners once initialized
         document.removeEventListener('click', initAudio);
         document.removeEventListener('keydown', initAudio);
         document.removeEventListener('touchstart', initAudio);
     };

     // Add listeners for various interaction types
     document.addEventListener('click', initAudio, { once: true });
     document.addEventListener('keydown', initAudio, { once: true });
     document.addEventListener('touchstart', initAudio, { once: true });
}