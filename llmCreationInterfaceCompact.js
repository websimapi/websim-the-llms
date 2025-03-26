// New file to reduce size of llmCreationInterface.js
import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { setupAttributeTooltips, optimizeUIHeight } from './llmAttributeTooltips.js';

// --- Emoji Selector ---
const availableEmojis = [
    '😀', '🧑', '👩‍🚀', '🥷', '🧙', // Humans/Professions
    '🤖', '🦾', '👾',         // Robots/Cyborgs
    '🐶', '🐱', '🦊', '🐻', '🐼', '🦁', '🐯', // Animals
    '🦄', '🐉', '🧚', '👽', '👻', // Mythical/Fantasy
    '⚙️', '💎', '🔥', '⚡️', '🌟', '🌲', '🍄', // Objects/Elements/Nature
    '🤠', '🤡', '🕵️‍♀️'          // Other Characters
];
let selectedEmojis = [];
const maxSelectedEmojis = 4;

export function setupEmojiSelector() {
    const optionsContainer = document.getElementById('emoji-options');
    const selectionArea = document.getElementById('emoji-selection-area');
    if (!optionsContainer || !selectionArea) return;

    optionsContainer.innerHTML = ''; // Clear previous options
    selectionArea.innerHTML = '<span class="emoji-placeholder">Click emojis below...</span>'; // Placeholder

    availableEmojis.forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'emoji-button';
        button.textContent = emoji;
        button.dataset.emoji = emoji;
        button.addEventListener('click', () => toggleEmojiSelection(emoji));
        optionsContainer.appendChild(button);
    });

    updateEmojiSelectionUI(); // Initial UI update
}

function toggleEmojiSelection(emoji) {
    const index = selectedEmojis.indexOf(emoji);
    if (index > -1) {
        // Deselect
        selectedEmojis.splice(index, 1);
    } else if (selectedEmojis.length < maxSelectedEmojis) {
        // Select
        selectedEmojis.push(emoji);
    } else {
        // Max reached, maybe show a small message or just ignore
        console.log(`Max ${maxSelectedEmojis} emojis reached.`);
        // Optional: Flash the selection area or show a temporary message
        const selectionArea = document.getElementById('emoji-selection-area');
        selectionArea.classList.add('flash-error');
        setTimeout(() => selectionArea.classList.remove('flash-error'), 300);
        return; // Don't update UI if max reached and trying to add more
    }
    updateEmojiSelectionUI();
}

function updateEmojiSelectionUI() {
    const selectionArea = document.getElementById('emoji-selection-area');
    const optionsContainer = document.getElementById('emoji-options');
    if (!selectionArea || !optionsContainer) return;

    // Update selected area
    selectionArea.innerHTML = '';
    if (selectedEmojis.length === 0) {
        selectionArea.innerHTML = '<span class="emoji-placeholder">Click emojis below...</span>';
    } else {
        selectedEmojis.forEach(emoji => {
            const span = document.createElement('span');
            span.className = 'selected-emoji';
            span.textContent = emoji;
            span.title = 'Click to remove';
            span.addEventListener('click', () => toggleEmojiSelection(emoji));
            selectionArea.appendChild(span);
        });
    }

    // Update button states
    const buttons = optionsContainer.querySelectorAll('.emoji-button');
    buttons.forEach(button => {
        const emoji = button.dataset.emoji;
        if (selectedEmojis.includes(emoji)) {
            button.classList.add('selected');
            button.disabled = false; // Can always deselect
        } else {
            button.classList.remove('selected');
            // Disable if max is reached and this button isn't selected
            button.disabled = selectedEmojis.length >= maxSelectedEmojis;
        }
    });
}

export function getSelectedEmojis() {
    return [...selectedEmojis]; // Return a copy
}

export function clearSelectedEmojis() {
    selectedEmojis = [];
    updateEmojiSelectionUI();
}

export function loadSelectedEmojis(emojis) {
    selectedEmojis = emojis.slice(0, maxSelectedEmojis); // Load up to the max limit
    updateEmojiSelectionUI();
}
// --- End Emoji Selector ---


// Function to render the attribute grid - moved from llmCreationInterface.js
export function renderAttributeGrid() {
    const gridContainer = document.getElementById('attribute-grid');
    if (!gridContainer) return; // Add guard clause
    gridContainer.innerHTML = '';

    const attributesArray = attributeSystem.getAttributesArray();

    attributesArray.forEach(attr => {
        const item = document.createElement('div');
        item.className = 'attribute-item';

        const header = document.createElement('div');
        header.className = 'attribute-header';

        const name = document.createElement('div');
        name.className = 'attribute-name';
        name.textContent = attr.name;

        const controls = document.createElement('div');
        controls.className = 'attribute-controls';

        const decBtn = document.createElement('button');
        decBtn.className = 'attribute-button';
        decBtn.textContent = '-';
        decBtn.disabled = attr.value <= 0;
        decBtn.onclick = () => {
            if (attributeSystem.decrementAttribute(attr.name)) {
                renderAttributeGrid();
                updatePointsDisplay();
            }
        };

        const value = document.createElement('span');
        value.className = 'attribute-value-text';
        value.textContent = attr.value;

        const incBtn = document.createElement('button');
        incBtn.className = 'attribute-button';
        incBtn.textContent = '+';
        incBtn.disabled = attributeSystem.getRemainingPoints() <= 0 ||
                           attr.value >= attributeSystem.maxPointsPerAttribute;
        incBtn.onclick = () => {
            if (attributeSystem.incrementAttribute(attr.name)) {
                renderAttributeGrid();
                updatePointsDisplay();
            }
        };

        controls.appendChild(decBtn);
        controls.appendChild(value);
        controls.appendChild(incBtn);

        header.appendChild(name);
        header.appendChild(controls);

        const valueBar = document.createElement('div');
        valueBar.className = 'attribute-value';

        const valueFill = document.createElement('div');
        valueFill.className = 'attribute-fill';
        valueFill.style.width = `${(attr.value / attributeSystem.maxPointsPerAttribute) * 100}%`;

        valueBar.appendChild(valueFill);

        const description = document.createElement('div');
        description.className = 'attribute-description';
        description.textContent = attr.description;

        item.appendChild(header);
        item.appendChild(valueBar);
        item.appendChild(description);

        gridContainer.appendChild(item);
    });

    // Re-setup tooltips after rendering grid
    setupAttributeTooltips();
}

// Function to update points display - moved from llmCreationInterface.js
export function updatePointsDisplay() {
    const pointsDisplay = document.getElementById('points-remaining');
    if (!pointsDisplay) return; // Add guard clause
    const remaining = attributeSystem.getRemainingPoints();
    pointsDisplay.textContent = `${remaining} Points Remaining`;

    // Change color based on points remaining
    if (remaining <= 3) {
        pointsDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    } else if (remaining <= 7) {
        pointsDisplay.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
    } else {
        pointsDisplay.style.backgroundColor = 'rgba(60, 179, 113, 0.2)';
    }
}

// New function to reset profile image display when opening creation UI
export function resetProfileImageDisplay() {
    // Use the updated function from llmProfileImageDisplay
    import('./llmProfileImageDisplay.js').then(module => {
         module.updateProfileImageDisplay(null); // Pass null to show placeholder
     });
}

// Function to reset form elements
export function resetFormAttributes() {
    // Reset attributes
    attributeSystem.initializeAttributes();
    renderAttributeGrid();
    updatePointsDisplay();

    // Clear any stored profile image URL
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        delete statusElement.dataset.profileImageUrl;
        delete statusElement.dataset.selectedVoice;
    }

    // Reset profile image display
    resetProfileImageDisplay();

    // Hide the preview if it's open
    const previewContainer = document.getElementById('profile-image-preview-container');
    if (previewContainer) {
        previewContainer.classList.add('hidden');
    }

    // Reset voice selection if available
    const voiceSelect = document.getElementById('llm-tts-voice');
    if (voiceSelect) {
        voiceSelect.selectedIndex = 0;
         // Find test button - it might not exist yet if TTS module hasn't loaded fully
         // const testBtn = document.getElementById('test-voice-btn');
         // if (testBtn) testBtn.disabled = true;
    }

    // Reset model badge selection to default (assistant)
    import('./modelBadgeSelector.js').then(module => {
        module.loadModelBadgeSelection('assistant', false); // Apply default attributes
    });

    // Reset manipulation controls display if an object was selected
    import('./llmMeshManipulator.js').then(module => {
        const manipulationControls = document.querySelector('.manipulation-controls');
        const noSelectionMessage = document.querySelector('.no-selection-message');
        if (manipulationControls) manipulationControls.style.display = 'none';
        if (noSelectionMessage) noSelectionMessage.style.display = 'block';
        const selectedMeshNameEl = document.getElementById('selected-mesh-name');
        if (selectedMeshNameEl) selectedMeshNameEl.classList.add('hidden');

        // Also clear the global selected mesh reference
        window.selectedMesh = null;
        if (typeof setSelectedMesh === 'function') setSelectedMesh(null);
    });

    // Clear selected emojis
    clearSelectedEmojis();
}

// New function to initialize profile image UI
export function setupProfileImageUI() {
    // Import and setup the profile image capture functionality
    import('./llmProfileImageUI.js').then(module => {
        module.setupProfileImageCapture();
    }).catch(error => {
        console.error("Error setting up profile image capture:", error);
    });
}

// Character generation handler - modified to accept emojis
export async function handleGenerateCharacter(generatingCharacter, setGeneratingCharacter, selectedEmojis) {
    if (generatingCharacter) return;

    const statusElement = document.getElementById('generation-status');
    const generateBtn = document.getElementById('generate-character-btn');

    if (!selectedEmojis || selectedEmojis.length === 0) {
        statusElement.textContent = "Please select at least one emoji concept.";
        return { success: false, error: "No emojis selected" };
    }

    setGeneratingCharacter(true);
    statusElement.textContent = "Generating character from concepts...";
    generateBtn.disabled = true;

    try {
        // Import the function from characterGenerator.js
        const { generateCharacterCode } = await import('./characterGenerator.js');
        // Pass the selected emojis instead of a text prompt
        const generatedCode = await generateCharacterCode(selectedEmojis);

        // Store the generated code for later use
        statusElement.dataset.generatedCode = generatedCode;

        // Return the generated code to the caller
        return {
            success: true,
            code: generatedCode
        };
    } catch (error) {
        console.error("Failed to generate character:", error);
        statusElement.textContent = "Failed to generate character. Try different concepts.";
        return {
            success: false,
            error: error
        };
    } finally {
        setGeneratingCharacter(false);
        generateBtn.disabled = false;
    }
}