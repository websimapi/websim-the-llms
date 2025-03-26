// New file to hold code that would have gone into the maxed-out files
import { setupTTSVoiceSelector, loadTTSVoiceSelection } from './llmTtsVoiceSelector.js';
import { setupBrushIcon, setCurrentColor } from './llmBrushIcon.js'; 
import { attributeSystem } from './attributeSystem.js'; 
import { renderAttributeGrid, updatePointsDisplay } from './llmCreationInterfaceCompact.js'; 

// Initialize all UI components for LLM creation
export function initializeAllComponents(llmToEdit) {
    // Set up base UI components
    setupUIComponents();
    
    // Load data from LLM if editing
    if (llmToEdit) {
        loadLLMData(llmToEdit);
    } else {
        // Set default color if creating new
        setCurrentColor('#3cb371');
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
            const noSelectionMessage = document.querySelector('.no-selection-message'); 
            if (manipulationControls) manipulationControls.style.display = 'none';
            if (noSelectionMessage) noSelectionMessage.style.display = 'block'; 
        }, 200);
    });

    // Setup the brush icon
    setupBrushIcon();
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

    // Load color for the brush icon
    if (llm.color) {
        setCurrentColor(llm.color);
    } else {
         setCurrentColor('#3cb371'); 
    }

     // Load model data (which might override the base color for the brush)
     if (llm.modelData) {
         // Apply data (done in llmCreationInterface) and then potentially update brush
         // Check if the model data specifies a color for the first part
         let firstPartColor = llm.color || '#3cb371';
         if (llm.modelData.parts && llm.modelData.parts.length > 0 &&
             llm.modelData.parts[0].materialProps && llm.modelData.parts[0].materialProps.color) {
             firstPartColor = llm.modelData.parts[0].materialProps.color;
         }
         // Defer setting the color slightly to ensure model data is applied first
         setTimeout(() => setCurrentColor(firstPartColor), 50);
     }
}