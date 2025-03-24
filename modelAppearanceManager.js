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
                    roughness: child.material.roughness,
                    type: child.geometry.type // Store geometry type for better identification
                };
                appearanceData.parts.push(meshData);
            }
        });
        
        return appearanceData;
    },
    
    // Apply stored appearance data to a model
    applyAppearanceData(model, appearanceData) {
        if (!model || !appearanceData || !appearanceData.parts) return;
        
        // Create a map of all meshes in the model for easier matching
        const meshMap = new Map();
        model.traverse(child => {
            if (child.isMesh) {
                // Map by both name and geometry type for better matching
                const key = child.name || `mesh_${child.geometry.type}_${child.id}`;
                meshMap.set(key, child);
                meshMap.set(child.geometry.type, child); // Also map by geometry type as fallback
            }
        });
        
        // Apply appearance data to each mesh
        appearanceData.parts.forEach(partData => {
            // Try to find the mesh by name first
            let mesh = meshMap.get(partData.name);
            
            // If not found by name, try by geometry type
            if (!mesh && partData.type) {
                mesh = meshMap.get(partData.type);
            }
            
            if (mesh && mesh.material) {
                if (partData.color && mesh.material.color) {
                    mesh.material.color.set(partData.color);
                }
                if (partData.emissive && mesh.material.emissive) {
                    mesh.material.emissive.set(partData.emissive);
                }
                if (partData.metalness !== undefined) {
                    mesh.material.metalness = partData.metalness;
                }
                if (partData.roughness !== undefined) {
                    mesh.material.roughness = partData.roughness;
                }
            }
        });
    }
};