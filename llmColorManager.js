// New file to manage colors for LLMs

// Function to normalize color to hex format
export function normalizeColor(color) {
    if (!color) return '#3cb371'; // Default color
    
    // Already in hex format with #
    if (typeof color === 'string' && color.startsWith('#')) {
        return color;
    }
    
    // THREE.js Color object
    if (color && typeof color === 'object' && color.isColor) {
        return '#' + color.getHexString();
    }
    
    // Hex number
    if (typeof color === 'number') {
        return '#' + color.toString(16).padStart(6, '0');
    }
    
    // String without #
    if (typeof color === 'string' && /^[0-9A-Fa-f]{6}$/.test(color)) {
        return '#' + color;
    }
    
    return '#3cb371'; // Default fallback color
}

// Function to apply color to model materials
export function applyColorToModel(model, color) {
    const hexColor = normalizeColor(color);
    
    if (!model) return;
    
    model.traverse(child => {
        if (child.isMesh && child.material) {
            // Apply color based on material type
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    if (mat.color) {
                        mat.color.set(hexColor);
                    }
                });
            } else if (child.material.color) {
                child.material.color.set(hexColor);
            }
        }
    });
}

// Function to extract color parts from a model
export function extractModelColors(model) {
    const colors = {
        head: null,
        body: null,
        limbs: null
    };
    
    if (!model) return colors;
    
    // Extract colors from model parts based on position
    model.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
            // Simple heuristic for part identification
            if (child.position.y > 1.5) {
                colors.head = '#' + child.material.color.getHexString();
            } else if (child.position.y > 0.8 && child.position.y < 1.5) {
                colors.body = '#' + child.material.color.getHexString();
            } else if (child.position.y < 0.8) {
                colors.limbs = '#' + child.material.color.getHexString();
            }
        }
    });
    
    return colors;
}