// New file to hold code that would have gone into the maxed-out files
import { setupTTSVoiceSelector, loadTTSVoiceSelection } from './llmTtsVoiceSelector.js';
import { setupProfileImageDisplay } from './llmProfileImageDisplay.js';

// Initialize all UI components for LLM creation
export function initializeAllComponents(llmToEdit) {
    // Set up base UI components
    setupUIComponents();
    
    // Load data from LLM if editing
    if (llmToEdit) {
        loadLLMData(llmToEdit);
    } else {
        // Ensure profile image placeholder is shown for new LLM
        setupProfileImageDisplay();
    }
}

function setupUIComponents() {
    // Set up profile image UI - call the renamed function
    setupProfileImageDisplay();
    
    // Set up TTS voice selector
    setupTTSVoiceSelector();
    
    // Setup model badge selector
    import('./modelBadgeSelector.js').then(module => {
        module.setupModelBadgeSelector();
    });
    
    // Set up attribute tooltips and optimize UI height
    import('./llmAttributeTooltips.js').then(module => {
        setTimeout(() => {
            module.setupAttributeTooltips();
            module.optimizeUIHeight();
        }, 100);
    });
    
    // Initialize mesh manipulator
    import('./llmMeshManipulator.js').then(module => {
        setTimeout(() => {
            module.initMeshManipulator();
            
            // Initial state - hide manipulation controls until something is selected
            const manipulationControls = document.querySelector('.manipulation-controls');
            if (manipulationControls) manipulationControls.style.display = 'none';
        }, 200);
    });
}

function loadLLMData(llm) {
    // Load TTS voice selection
    loadTTSVoiceSelection(llm);
    
    // Load model badge selection
    if (llm.model) {
        import('./modelBadgeSelector.js').then(module => {
            // Set skipAttributeAssignment to true to preserve existing attributes
            module.loadModelBadgeSelection(llm.model, true);
        });
    } else {
        // If no model specified, apply default attributes for "assistant"
        import('./modelAttributeDefaults.js').then(module => {
            module.assignDefaultAttributes('assistant', attributeSystem);
            if (typeof renderAttributeGrid === "function") renderAttributeGrid();
            if (typeof updatePointsDisplay === "function") updatePointsDisplay();
        });
    }

    // Load profile image if available - This is now handled by setupProfileImageDisplay called in initializeAllComponents
    // The logic inside setupProfileImageDisplay checks for edit mode and loads the image.
    // We might still need to trigger an update if the element exists before this runs.
    setTimeout(() => {
        setupProfileImageDisplay(); // Ensure it runs and updates if needed
    }, 50); // Small delay
}