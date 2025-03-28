// New file for simple UI sound effects using Web Audio API

let audioContext;
let masterGain;

function getAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.gain.setValueAtTime(0.6, audioContext.currentTime); // Set master volume
            masterGain.connect(audioContext.destination);
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            // Return a dummy context to prevent errors, but sounds won't play
            return {
                createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, type: '', frequency: { setValueAtTime: () => {} } }),
                createGain: () => ({ connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }),
                destination: null,
                currentTime: 0
            };
        }
    }
    // Resume context if it's suspended (often required after user interaction)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playSound(frequency, type = 'sine', duration = 0.1, attack = 0.01, decay = 0.09) {
    const context = getAudioContext();
    if (!context.destination) return; // Sound disabled or not supported

    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);

        // Envelope
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, context.currentTime + attack); // Attack
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + attack + decay); // Decay

        oscillator.connect(gainNode);
        gainNode.connect(masterGain); // Connect to master gain

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);

        // Clean up nodes after sound finishes
        setTimeout(() => {
            oscillator.disconnect();
            gainNode.disconnect();
        }, duration * 1000 + 100);

    } catch (error) {
        console.error("Error playing sound:", error);
    }
}

// Sound for opening the "Create New LLM" menu
export function playMenuOpenSound() {
    // Slightly higher pitched 'confirm' sound
    playSound(880, 'triangle', 0.15, 0.01, 0.14); // A5
    playSound(1318.51, 'sine', 0.1, 0.02, 0.08); // E6 (add sparkle)
}

// Sound for opening the "My LLMs" (move) menu
export function playMenuNavigateSound() {
    // Slightly lower pitched 'navigation' sound
    playSound(659.25, 'square', 0.12, 0.01, 0.11); // E5
}

// Optional: Add a click sound for general UI elements
export function playUIClickSound() {
    playSound(1100, 'sine', 0.08, 0.005, 0.075);
}

// Initialize context on first user interaction with relevant buttons
export function initAudioContextOnInteraction(buttonElement) {
    if (!buttonElement) return;
    buttonElement.addEventListener('click', getAudioContext, { once: true });
}