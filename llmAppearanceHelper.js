import { modelAppearanceManager } from './modelAppearanceManager.js';

// Helper functions for managing LLM appearance data

// Store appearance data for an LLM model
export function storeModelAppearance(llmData) {
    // Check if there's a current model to store appearance from
    if (window.currentRobotModel) {
        llmData.appearanceData = modelAppearanceManager.storeAppearanceData(window.currentRobotModel);
    } else if (window.currentCustomCharacter) {
        llmData.appearanceData = modelAppearanceManager.storeAppearanceData(window.currentCustomCharacter);
    }
    return llmData.appearanceData;
}

// Preserve existing appearance data if needed
export function preserveExistingAppearance(llmData, existingLLM) {
    if (!llmData.appearanceData && existingLLM.appearanceData) {
        llmData.appearanceData = existingLLM.appearanceData;
    }
}

// Clear model state references
export function clearModelState() {
    window.currentRobotModel = null;
    window.currentCustomCharacter = null;
}

// Re-export the helper for convenience
export const modelAppearanceHelper = modelAppearanceManager;