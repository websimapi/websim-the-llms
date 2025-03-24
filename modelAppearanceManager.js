// Helper for managing and storing model appearance changes
export const modelAppearanceManager = {
    // Store appearance data for a model
    storeAppearanceData(model) {
        if (!model) return null;
        
        const appearanceData = {
            parts: []
        };
        
        // Traverse the model and store material colors for each mesh
        model.traverse(child => {
            if (child.isMesh && child.material) {
                const meshData = {
                    name: child.name || `mesh_${child.id}`,
                    color: child.material.color ? '#' + child.material.color.getHexString() : null,
                    emissive: child.material.emissive ? '#' + child.material.emissive.getHexString() : null,
                    metalness: child.material.metalness,
                    roughness: child.material.roughness
                };
                appearanceData.parts.push(meshData);
            }
        });
        
        return appearanceData;
    },
    
    // Apply stored appearance data to a model
    applyAppearanceData(model, appearanceData) {
        if (!model || !appearanceData || !appearanceData.parts) return;
        
        let index = 0;
        model.traverse(child => {
            if (child.isMesh && child.material) {
                const meshData = appearanceData.parts[index];
                if (meshData) {
                    if (meshData.color && child.material.color) {
                        child.material.color.set(meshData.color);
                    }
                    if (meshData.emissive && child.material.emissive) {
                        child.material.emissive.set(meshData.emissive);
                    }
                    if (meshData.metalness !== undefined) {
                        child.material.metalness = meshData.metalness;
                    }
                    if (meshData.roughness !== undefined) {
                        child.material.roughness = meshData.roughness;
                    }
                    index++;
                }
            }
        });
    }
};