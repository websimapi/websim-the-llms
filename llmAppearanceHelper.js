import { modelAppearanceManager } from './modelAppearanceManager.js';

// Helper functions for managing LLM appearance data

// Store appearance data for an LLM model
export function storeModelAppearance(modelToStore) {
    // Store the appearance data in the model
    return modelAppearanceManager.storeAppearanceData(modelToStore);
}