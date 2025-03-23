import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';

// Function to save LLM data - moved from llmCreationInterface.js to reduce file size
export function saveLLMData() {
    // Get values from form
    const name = document.getElementById('llm-name').value || `LLM-${Math.floor(Math.random() * 1000)}`;
    const model = document.getElementById('llm-model').value;
    const color = document.getElementById('llm-color').value;
    const style = document.getElementById('llm-style').value;
    const customPrompt = document.getElementById('llm-custom-prompt').value;
    
    // Get attributes
    const attributes = window.attributeSystem.exportAttributes();
    
    // Create LLM data object
    const llmData = {
        name,
        model,
        color,
        style,
        customPrompt,
        attributes,
        customCharacterCode: null
    };
    
    // If we have a custom character, save its code
    if (window.customCharacter) {
        // Store the generated code
        const generatedCodeElement = document.getElementById('generation-status');
        if (generatedCodeElement && generatedCodeElement.dataset.generatedCode) {
            llmData.customCharacterCode = generatedCodeElement.dataset.generatedCode;
        }
    }
    
    // Check if we're in edit mode
    const createUI = document.getElementById('create-llm-ui');
    const isEditMode = createUI.getAttribute('data-edit-mode') === 'true';
    const editId = createUI.getAttribute('data-edit-id');
    
    if (isEditMode && editId) {
        // Update existing LLM
        llmData.id = editId;
        llmData.createdAt = llmDataManager.getLLMById(editId).createdAt;
        llmDataManager.updateLLM(llmData);
    } else {
        // Save as new LLM
        llmDataManager.addLLM(llmData);
    }
    
    // Close creation UI and show collection
    document.getElementById('create-llm-ui').classList.remove('active');
    setupLLMCollectionView();
}