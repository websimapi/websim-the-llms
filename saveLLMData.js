import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { attributeSystem } from './attributeSystem.js';
import { avatarColorManager } from './avatarColorManager.js';

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
        meshColors: []
    };
    
    // If we have a custom character, save its code
    const statusElement = document.getElementById('generation-status');
    if (statusElement && statusElement.dataset.generatedCode) {
        llmData.customCharacterCode = statusElement.dataset.generatedCode;
        console.log("Saved custom character code:", llmData.customCharacterCode.substring(0, 50) + "...");
    } else {
        console.log("No custom character code found to save");
    }
    
    // Get the currently selected mesh from the creation interface
    const selectedMesh = window.selectedMesh || null;
    
    // Store color data for the selected mesh
    avatarColorManager.storeColorData(llmData, selectedMesh);
    
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
            
            // Preserve existing mesh colors if any, and merge with new ones
            if (existingLLM.meshColors && Array.isArray(existingLLM.meshColors)) {
                // Merge existing colors with new ones
                existingLLM.meshColors.forEach(colorData => {
                    if (!llmData.meshColors.some(m => m.meshType === colorData.meshType)) {
                        llmData.meshColors.push(colorData);
                    }
                });
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