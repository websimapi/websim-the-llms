// New file to hold code that would have gone into the maxed-out files
import { setupTTSVoiceSelector, loadTTSVoiceSelection } from './llmTtsVoiceSelector.js';

// Initialize all UI components for LLM creation
export function initializeAllComponents(llmToEdit) {
    // Set up base UI components
    setupUIComponents();
    
    // Load data from LLM if editing
    if (llmToEdit) {
        loadLLMData(llmToEdit);
    }
}

function setupUIComponents() {
    // Set up profile image UI
    import('./llmCreationInterfaceCompact.js').then(module => {
        module.setupProfileImageUI();
        module.setupProfileImageAppearance();
    });
    
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
            module.loadModelBadgeSelection(llm.model);
            
            // We don't need to apply default attributes here since we're loading existing ones
        });
    } else {
        // If no model specified, apply default attributes for "assistant"
        import('./modelAttributeDefaults.js').then(module => {
            module.assignDefaultAttributes('assistant', attributeSystem);
            renderAttributeGrid();
            updatePointsDisplay();
        });
    }
    
    // Load profile image if available
    if (llm.profileImageUrl) {
        setTimeout(() => {
            import('./llmProfileImageDisplay.js').then(displayModule => {
                displayModule.updateProfileImageDisplay(llm.profileImageUrl);
                
                // Store the URL in status element for when saving
                const statusElement = document.getElementById('generation-status');
                if (statusElement) {
                    statusElement.dataset.profileImageUrl = llm.profileImageUrl;
                }
            });
        }, 100);
    }
}