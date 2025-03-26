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
    // Preload CSS files first to avoid flash of unstyled content
    preloadCSS();
    
    // Pre-create model type selector HTML structure before showing interface
    preCreateModelTypeSelector();
    
    // Set up profile image UI
    import('./llmCreationInterfaceCompact.js').then(module => {
        module.setupProfileImageUI();
        module.setupProfileImageAppearance();
    });
    
    // Set up TTS voice selector
    setupTTSVoiceSelector();
    
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

    // Initialize enhanced UI components
    import('./llmCreationInterfaceEnhanced.js').then(module => {
        setTimeout(() => {
            module.initializeUIEnhancements();
        }, 150);
    });
}

// New function to preload CSS files
function preloadCSS() {
    const cssFiles = [
        'llmModelTypeSelector.css',
        'llmTtsStyles.css',
        'llmColorPickerStyles.css'
    ];
    
    cssFiles.forEach(file => {
        // Check if stylesheet is already loaded
        if (!document.querySelector(`link[href="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            document.head.appendChild(link);
        }
    });
}

// New function to pre-create model type selector structure
function preCreateModelTypeSelector() {
    // Import the model type selector module directly
    import('./llmModelTypeSelector.js').then(module => {
        if (typeof module.createModelTypeSelectorHTML === 'function') {
            module.createModelTypeSelectorHTML(true); // Pass true to indicate preloading
        }
    });
}

function loadLLMData(llm) {
    // Load TTS voice selection
    loadTTSVoiceSelection(llm);
    
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