import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { attributeSystem } from './attributeSystem.js';
import { modelAppearanceManager } from './modelAppearanceManager.js';

// Function to save LLM data - moved from llmCreationInterface.js to reduce file size
export function saveLLMData() {
    // Get values from form
    const name = document.getElementById('llm-name').value || `LLM-${Math.floor(Math.random() * 1000)}`;
    const model = document.getElementById('llm-model').value;
    const color = document.getElementById('llm-color').value;
    const style = document.getElementById('llm-style').value;
    const customPrompt = document.getElementById('llm-custom-prompt').value;
    
    // Get attributes
    const attributes = attributeSystem.exportAttributes();
    
    // Create LLM data object
    const llmData = {
        name,
        model,
        color,
        style,
        customPrompt,
        attributes,
        customCharacterCode: null,
        appearanceData: null
    };
    
    // If we have a custom character, save its code
    const statusElement = document.getElementById('generation-status');
    if (statusElement && statusElement.dataset.generatedCode) {
        llmData.customCharacterCode = statusElement.dataset.generatedCode;
        console.log("Saved custom character code:", llmData.customCharacterCode.substring(0, 50) + "...");
    } else {
        console.log("No custom character code found to save");
    }
    
    // Get the current model to store appearance data
    const robotModel = window.currentRobotModel || null;
    const customCharacter = window.currentCustomCharacter || null;
    const modelToStore = customCharacter || robotModel;
    
    if (modelToStore) {
        llmData.appearanceData = modelAppearanceManager.storeAppearanceData(modelToStore);
        console.log("Saved appearance data for model:", llmData.appearanceData);
    }
    
    // Check if we're in edit mode
    const createUI = document.getElementById('create-llm-ui');
    const isEditMode = createUI.getAttribute('data-edit-mode') === 'true';
    const editId = createUI.getAttribute('data-edit-id');
    
    if (isEditMode && editId) {
        // Update existing LLM
        llmData.id = editId;
        const existingLLM = llmDataManager.getLLMById(editId);
        if (existingLLM) {
            llmData.createdAt = existingLLM.createdAt;
            
            // If no new character was generated, keep the existing character code
            if (!llmData.customCharacterCode && existingLLM.customCharacterCode) {
                llmData.customCharacterCode = existingLLM.customCharacterCode;
            }
            
            // If no appearance data was saved, keep existing appearance data
            if (!llmData.appearanceData && existingLLM.appearanceData) {
                llmData.appearanceData = existingLLM.appearanceData;
            }
            
            llmDataManager.updateLLM(llmData);
        } else {
            console.error("Could not find LLM with ID:", editId);
            // Fall back to adding as new
            llmDataManager.addLLM(llmData);
        }
    } else {
        // Save as new LLM
        llmDataManager.addLLM(llmData);
    }
    
    // Close creation UI and show collection
    document.getElementById('create-llm-ui').classList.remove('active');
    setupLLMCollectionView();
}