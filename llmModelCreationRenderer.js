import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { applyStoredModelData } from './llmModelStorage.js';

// This function is moved from llmCreationInterface.js to reduce file size
export function createRobotModel(humanoidScene, color) {
    // Import the simplified version that doesn't depend on style
    return import('./llmCreationInterfaceColors.js').then(module => {
        return module.createSimplifiedRobotModel(humanoidScene, color);
    });
}