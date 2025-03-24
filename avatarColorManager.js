// Helper module to manage color data for avatar parts
import * as THREE from 'three';

export const avatarColorManager = {
    // Store color data for an LLM's avatar parts
    storeColorData(llmData, selectedMesh) {
        if (!llmData.meshColors) {
            llmData.meshColors = [];
        }
        
        // If we have a specifically selected mesh with custom color
        if (selectedMesh && selectedMesh.material && selectedMesh.material.color) {
            // Store the mesh path (using its name/type) and color
            const meshInfo = {
                meshType: selectedMesh.geometry.type,
                color: '#' + selectedMesh.material.color.getHexString()
            };
            
            // Update if exists, otherwise add
            const existingIndex = llmData.meshColors.findIndex(m => m.meshType === meshInfo.meshType);
            if (existingIndex >= 0) {
                llmData.meshColors[existingIndex] = meshInfo;
            } else {
                llmData.meshColors.push(meshInfo);
            }
        }
        
        return llmData;
    },
    
    // Apply stored color data to a model
    applyColorData(model, meshColors) {
        if (!model || !meshColors || !Array.isArray(meshColors)) return;
        
        model.traverse(child => {
            if (child.isMesh) {
                // Find matching color data for this mesh type
                const colorData = meshColors.find(m => m.meshType === child.geometry.type);
                if (colorData && colorData.color) {
                    // Apply the stored color
                    child.material.color.set(colorData.color);
                    
                    // If material has emissive property, update it too with toned down version
                    if (child.material.emissive) {
                        const color = new THREE.Color(colorData.color);
                        child.material.emissive.set(color.clone().multiplyScalar(0.2));
                    }
                }
            }
        });
    }
};