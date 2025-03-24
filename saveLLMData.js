import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { attributeSystem } from './attributeSystem.js';
import { normalizeColorFormat } from './colorDataUtils.js';

// Function to save LLM data - moved from llmCreationInterface.js to reduce file size
export function saveLLMData() {
    try {
        // Get values from form
        const name = document.getElementById('llm-name').value || `LLM-${Math.floor(Math.random() * 1000)}`;
        const model = document.getElementById('llm-model').value;
        
        // Normalize color format for consistent storage
        const colorInput = document.getElementById('llm-color').value;
        const color = normalizeColorFormat(colorInput);
        
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
            customCharacterCode: null
        };
        
        // If we have a custom character, save its code
        const statusElement = document.getElementById('generation-status');
        if (statusElement && statusElement.dataset.generatedCode) {
            llmData.customCharacterCode = statusElement.dataset.generatedCode;
            console.log("Saved custom character code:", llmData.customCharacterCode.substring(0, 50) + "...");
        } else {
            console.log("No custom character code found to save");
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
    } catch (error) {
        console.error("Error saving LLM data:", error);
    }
}