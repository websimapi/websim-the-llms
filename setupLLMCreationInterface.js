// ... existing code ...
export function setupLLMCreationInterface(llmToEdit) {
    // Import the color storage functions
    import('./llmColorStorage.js').then(({ clearStoredPartColors, setStoredPartColors }) => {
        // Clear previous generation state
        const statusElement = document.getElementById('generation-status');
        if (statusElement) {
            statusElement.textContent = '';
            delete statusElement.dataset.generatedCode;
        }
        
        // Clear any previously stored part colors
        clearStoredPartColors();
        
        customCharacter = null;
        
        // If editing an existing LLM, load its customPartColors
        if (llmToEdit && llmToEdit.customPartColors) {
            setStoredPartColors(llmToEdit.customPartColors);
        }
        
        // Rest of the existing setup code
        // Setup default values for the form
        document.getElementById('llm-name').value = llmToEdit ? llmToEdit.name : `LLM-${Math.floor(Math.random() * 1000)}`;
        
        // Initialize attribute system
        attributeSystem.initializeAttributes();
        
        // If editing an existing LLM, load its attributes
        if (llmToEdit && llmToEdit.attributes) {
            Object.entries(llmToEdit.attributes).forEach(([name, value]) => {
                if (attributeSystem.attributes[name]) {
                    // Set the stored value
                    attributeSystem.attributes[name].value = value;
                    attributeSystem.pointsSpent += value;
                }
            });
        }
        
        renderAttributeGrid();
        updatePointsDisplay();
        
        // Add event listeners for form elements that should update the humanoid preview
        document.getElementById('llm-color').addEventListener('input', updateSelectedMeshColor);
        document.getElementById('llm-style').addEventListener('change', updateHumanoidPreview);
        
        // Setup character generation button
        const generateBtn = document.getElementById('generate-character-btn');
        generateBtn.addEventListener('click', handleGenerateCharacter);
        
        // Set form values from existing LLM if editing
        if (llmToEdit) {
            document.getElementById('llm-model').value = llmToEdit.model || 'assistant';
            document.getElementById('llm-color').value = llmToEdit.color || '#3cb371';
            document.getElementById('llm-style').value = llmToEdit.style || 'modern';
            document.getElementById('llm-custom-prompt').value = llmToEdit.customPrompt || '';
            
            // Store the edit ID on the form
            const createUI = document.getElementById('create-llm-ui');
            createUI.setAttribute('data-edit-mode', 'true');
            createUI.setAttribute('data-edit-id', llmToEdit.id);
        } else {
            // Clear edit mode flags if not editing
            const createUI = document.getElementById('create-llm-ui');
            createUI.removeAttribute('data-edit-mode');
            createUI.removeAttribute('data-edit-id');
        }
        
        // Initialize the humanoid preview
        initHumanoidPreview(llmToEdit);
        
        // Add event listener for create button
        const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
        createLLMButton.addEventListener('click', saveLLMData);
        createLLMButton.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';
        
        // Add event listener for reset button
        const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
        resetButton.addEventListener('click', resetForm);
    }).catch(err => {
        console.error("Error importing color storage module:", err);
        // Continue with setup without color storage functionality
    });
    
    // ... rest of existing function ...
}
// ... existing code ...