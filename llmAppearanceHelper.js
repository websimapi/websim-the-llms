import { modelAppearanceManager } from './modelAppearanceManager.js';

// Helper functions for managing LLM appearance data

// Store appearance data for an LLM model
export function storeModelAppearance(llmData) {
    // Get the current model to store appearance data
    const robotModel = window.currentRobotModel || null;
    const customCharacter = window.currentCustomCharacter || null;
    const modelToStore = customCharacter || robotModel;
    
    if (modelToStore) {
        // Store the appearance data in the LLM data object
        llmData.appearanceData = modelAppearanceManager.storeAppearanceData(modelToStore);
        console.log("Saved appearance data for model:", llmData.appearanceData);
        return true;
    }
    
    return false;
}

// Preserve existing appearance data when updating an LLM
export function preserveExistingAppearance(newLLMData, existingLLM) {
    // If no new appearance data was saved, keep existing appearance data
    if (!newLLMData.appearanceData && existingLLM.appearanceData) {
        newLLMData.appearanceData = existingLLM.appearanceData;
        return true;
    }
    return false;
}

// Clear any cached model state
export function clearModelState() {
    // Clear global model references
    window.currentRobotModel = null;
    window.currentCustomCharacter = null;
}