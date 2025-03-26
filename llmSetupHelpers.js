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
    
    // Set up the basic information layout
    setupBasicInfoLayout();
}

function setupBasicInfoLayout() {
    // Find the basic information section
    const basicInfoSection = document.querySelector('.settings-group:first-child');
    if (!basicInfoSection) return;
    
    // Get the name and model type elements
    const nameItem = basicInfoSection.querySelector('.setting-item:nth-child(1)');
    const modelItem = basicInfoSection.querySelector('.setting-item:nth-child(2)');
    
    if (!nameItem || !modelItem) return;
    
    // Remove the original items
    nameItem.remove();
    modelItem.remove();
    
    // Create a new container for the reorganized layout
    const container = document.createElement('div');
    container.className = 'basic-info-container';
    
    // Create the model type badge
    const modelBadge = document.createElement('div');
    modelBadge.className = 'model-type-badge';
    modelBadge.innerHTML = `
        <label class="setting-label" for="llm-model">Model Type</label>
        <div class="model-badge" id="model-badge">Assistant</div>
    `;
    
    // Create the name input container
    const nameContainer = document.createElement('div');
    nameContainer.className = 'name-input-container';
    nameContainer.innerHTML = nameItem.innerHTML;
    
    // Add to container
    container.appendChild(modelBadge);
    container.appendChild(nameContainer);
    
    // Add container to the basic information section
    basicInfoSection.appendChild(container);
    
    // Add the original model select but hide it
    const selectContainer = document.createElement('div');
    selectContainer.className = 'setting-item hidden-select';
    selectContainer.style.display = 'none';
    selectContainer.innerHTML = modelItem.innerHTML;
    basicInfoSection.appendChild(selectContainer);
    
    // Add event listener to update badge when select changes
    const modelSelect = document.getElementById('llm-model');
    if (modelSelect) {
        modelSelect.addEventListener('change', function() {
            const badge = document.getElementById('model-badge');
            if (badge) {
                badge.textContent = this.value;
            }
        });
    }
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