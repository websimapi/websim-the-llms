// Handle color management for LLM character parts
export const llmColorManager = {
    // Store colors for individual meshes in the LLM data
    saveMeshColors(model) {
        if (!model) return null;
        
        const meshColors = {};
        let index = 0;
        
        // Traverse all meshes in the model
        model.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                meshColors[`mesh_${index}`] = {
                    hex: '#' + child.material.color.getHexString(),
                    name: child.name || `part_${index}`
                };
                index++;
            }
        });
        
        return meshColors.length === 0 ? null : meshColors;
    },
    
    // Apply stored colors to the rendered model
    applyMeshColors(model, meshColors) {
        if (!model || !meshColors) return;
        
        let index = 0;
        
        model.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                const colorData = meshColors[`mesh_${index}`];
                if (colorData && colorData.hex) {
                    child.material.color.set(colorData.hex);
                    
                    // If material has emissive property, update it too
                    if (child.material.emissive) {
                        // Store original emissive for highlighting
                        child.userData.originalEmissive = new THREE.Color(colorData.hex).multiplyScalar(0.2);
                    }
                }
                index++;
            }
        });
    }
};