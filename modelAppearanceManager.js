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
                    uuid: child.uuid,
                    color: child.material.color ? '#' + child.material.color.getHexString() : null,
                    emissive: child.material.emissive ? '#' + child.material.emissive.getHexString() : null,
                    metalness: child.material.metalness,
                    roughness: child.material.roughness,
                    position: child.position ? {
                        x: child.position.x,
                        y: child.position.y,
                        z: child.position.z
                    } : null,
                    materialType: child.material.type
                };
                appearanceData.parts.push(meshData);
            }
        });
        
        return appearanceData;
    },
    
    // Apply stored appearance data to a model
    applyAppearanceData(model, appearanceData) {
        if (!model || !appearanceData || !appearanceData.parts) return;
        
        // Create a map of stored parts by UUID for faster lookup
        const partsMap = {};
        appearanceData.parts.forEach(part => {
            if (part.uuid) {
                partsMap[part.uuid] = part;
            } else if (part.name) {
                partsMap[part.name] = part;
            }
        });
        
        // Apply stored data to each mesh
        model.traverse(child => {
            if (child.isMesh && child.material) {
                // Try to find matching data by UUID first, then by name
                const meshData = partsMap[child.uuid] || partsMap[child.name || `mesh_${child.id}`];
                
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
                }
            }
        });
    }
};