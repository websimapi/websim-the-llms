// New file for model storage functionality
import * as THREE from 'three';
import { serializeModelData, createStandardMaterials } from './llmCharacterRendererUtils.js';

// Store a model's data completely
export function storeModelData(model, llmData) {
    if (!model) return null;
    
    // Get serialized model data
    const modelData = serializeModelData(model);
    
    // Store model data on the LLM
    if (!llmData.modelData) {
        llmData.modelData = {};
    }
    
    llmData.modelData = modelData;
    
    // Return the updated LLM data
    return llmData;
}

// Apply stored model data to a character model
export function applyStoredModelData(model, llmData) {
    if (!model || !llmData || !llmData.modelData) return model;
    
    const modelData = llmData.modelData;
    
    // Create materials map for quick reference
    const materialsMap = {};
    
    // Apply stored part data
    if (modelData.parts && modelData.parts.length > 0) {
        let partIndex = 0;
        
        model.traverse(child => {
            if (child.isMesh && child.material && partIndex < modelData.parts.length) {
                const partData = modelData.parts[partIndex];
                
                // Apply material properties
                if (partData.materialProps) {
                    // Create or reuse material
                    let material;
                    const materialKey = JSON.stringify(partData.materialProps);
                    
                    if (materialsMap[materialKey]) {
                        material = materialsMap[materialKey];
                    } else {
                        material = createMaterialFromData(partData.materialProps);
                        materialsMap[materialKey] = material;
                    }
                    
                    child.material = material;
                }
                
                // Increment counter
                partIndex++;
            }
        });
    }
    
    return model;
}

// Create a THREE material from serialized data
function createMaterialFromData(materialData) {
    let material;
    
    switch (materialData.type) {
        case 'MeshStandardMaterial':
            material = new THREE.MeshStandardMaterial();
            break;
        case 'MeshBasicMaterial':
            material = new THREE.MeshBasicMaterial();
            break;
        case 'MeshPhongMaterial':
            material = new THREE.MeshPhongMaterial();
            break;
        default:
            material = new THREE.MeshStandardMaterial();
    }
    
    // Apply properties
    if (materialData.color) material.color.set(materialData.color);
    if (materialData.emissive) material.emissive.set(materialData.emissive);
    if (materialData.specular && material.specular) material.specular.set(materialData.specular);
    
    // Apply numeric properties
    const numericProps = ['metalness', 'roughness', 'opacity', 'transparent', 'emissiveIntensity'];
    numericProps.forEach(prop => {
        if (materialData[prop] !== undefined) material[prop] = materialData[prop];
    });
    
    return material;
}