import { setupTTSVoiceSelector, loadTTSVoiceSelection } from './llmTtsVoiceSelector.js';
import { setupProfileImageDisplay } from './llmProfileImageDisplay.js';
import { attributeSystem } from './attributeSystem.js'; // Import attributeSystem
import { setupProfileImageCapture } from './llmProfileImageUI.js'; // Import the capture setup function

// Initialize all UI components for LLM creation
export function initializeAllComponents(llmToEdit) {
    // Set up base UI components
    setupUIComponents(llmToEdit); // Pass llmToEdit here

    // Load data specific to the LLM being edited (excluding profile image which is handled in setupUIComponents)
    if (llmToEdit) {
        loadLLMData(llmToEdit);
    } else {
        // If creating new, apply default attributes for "assistant" initially
        import('./modelAttributeDefaults.js').then(module => {
            module.assignDefaultAttributes('assistant', attributeSystem);
            // Need to import render/update functions or call them if available globally
            // Assuming they might be exposed or part of another setup function called later
            if (typeof window.renderAttributeGrid === "function") window.renderAttributeGrid();
            if (typeof window.updatePointsDisplay === "function") window.updatePointsDisplay();
        }).catch(err => console.error("Error assigning default attributes:", err));
    }
}

// Modified setupUIComponents to accept llmToEdit
function setupUIComponents(llmToEdit = null) {
    // Set up profile image display area in the basic info section
    setupProfileImageDisplay(llmToEdit);

    // Set up the profile image capture button in the 3D viewport
    setupProfileImageCapture();

    // Set up TTS voice selector
    setupTTSVoiceSelector();

    // Setup model badge selector
    import('./modelBadgeSelector.js').then(module => {
        module.setupModelBadgeSelector();
        // If editing, load the correct badge *after* the selector is set up.
        if (llmToEdit && llmToEdit.model) {
             // Delay slightly to ensure badges are rendered
             setTimeout(() => module.loadModelBadgeSelection(llmToEdit.model, true), 50);
        }
    }).catch(err => console.error("Error setting up model badges:", err));

    // Set up attribute tooltips and optimize UI height
    import('./llmAttributeTooltips.js').then(module => {
        setTimeout(() => {
            module.setupAttributeTooltips();
            module.optimizeUIHeight();
        }, 100);
    }).catch(err => console.error("Error setting up tooltips:", err));

    // Initialize mesh manipulator
    import('./llmMeshManipulator.js').then(module => {
        setTimeout(() => {
            module.initMeshManipulator();

            // Initial state - hide manipulation controls until something is selected
            const manipulationControls = document.querySelector('.manipulation-controls');
            if (manipulationControls) manipulationControls.style.display = 'none';
        }, 200);
    }).catch(err => console.error("Error setting up manipulator:", err));
}

// Modified loadLLMData to exclude profile image loading (handled in setupProfileImageDisplay)
function loadLLMData(llm) {
    // Load TTS voice selection
    loadTTSVoiceSelection(llm);

    // Load model badge selection - This is now handled in setupUIComponents

    // Note: Attribute loading is handled in llmCreationInterface.js setupLLMCreationInterface
    // Note: Other form fields (name, color, prompt) loading is handled in llmCreationInterface.js setupLLMCreationInterface
}