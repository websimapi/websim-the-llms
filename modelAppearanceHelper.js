// Helper functions to better manage model appearance data
export const modelAppearanceHelper = {
    // Store detailed appearance data for a model including specific part names and materials
    storeModelAppearance(model) {
        if (!model) return null;
        
        const appearanceData = {
            parts: []
        };
        
        // Traverse the model and store detailed material data for each mesh
        model.traverse(child => {
            if (child.isMesh && child.material) {
                const meshData = {
                    name: child.name || `mesh_${child.id}`,
                    path: this.getMeshPath(child),
                    type: child.geometry.type,
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
    
    // Get the full path of a mesh in the scene graph for better identification
    getMeshPath(mesh) {
        let path = mesh.name || mesh.id.toString();
        let parent = mesh.parent;
        
        while (parent && parent.name) {
            path = parent.name + '/' + path;
            parent = parent.parent;
        }
        
        return path;
    },
    
    // Apply stored appearance data to a model with precise matching
    applyAppearanceData(model, appearanceData) {
        if (!model || !appearanceData || !appearanceData.parts) return;
        
        // Create maps for efficient matching
        const meshNameMap = new Map();
        const meshPathMap = new Map();
        const meshTypeMap = new Map();
        
        // Build maps for mesh lookup
        model.traverse(child => {
            if (child.isMesh) {
                // Map by name
                if (child.name) {
                    meshNameMap.set(child.name, child);
                }
                
                // Map by path
                const path = this.getMeshPath(child);
                meshPathMap.set(path, child);
                
                // Map by type as fallback
                if (child.geometry && child.geometry.type) {
                    // Group meshes by geometry type
                    if (!meshTypeMap.has(child.geometry.type)) {
                        meshTypeMap.set(child.geometry.type, []);
                    }
                    meshTypeMap.get(child.geometry.type).push(child);
                }
            }
        });
        
        // Apply appearance data to each mesh with better matching
        appearanceData.parts.forEach(partData => {
            let mesh = null;
            
            // Try to find mesh by path first (most specific)
            if (partData.path && meshPathMap.has(partData.path)) {
                mesh = meshPathMap.get(partData.path);
            }
            // Then by name
            else if (partData.name && meshNameMap.has(partData.name)) {
                mesh = meshNameMap.get(partData.name);
            }
            // Finally by geometry type (least specific)
            else if (partData.type && meshTypeMap.has(partData.type)) {
                // If multiple meshes with same type, find one with similar position/properties
                const candidates = meshTypeMap.get(partData.type);
                if (candidates.length === 1) {
                    mesh = candidates[0];
                }
                // Could add more advanced matching here if needed
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