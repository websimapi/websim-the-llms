// Helper module for managing robot avatar colors
import * as THREE from 'three';

export const robotColorManager = {
    // Apply a color to a selected mesh
    applyColorToMesh(mesh, hexColor) {
        if (!mesh || !mesh.material) return false;
        
        // Store original material properties if not already stored
        if (!mesh.userData.originalProperties) {
            mesh.userData.originalProperties = {
                color: mesh.material.color ? mesh.material.color.clone() : null,
                emissive: mesh.material.emissive ? mesh.material.emissive.clone() : null
            };
        }
        
        // Apply new color
        mesh.material.color.set(hexColor);
        
        // If it has emissive property, update that too with a subdued version
        if (mesh.material.emissive) {
            const emissiveColor = new THREE.Color(hexColor).multiplyScalar(0.3);
            mesh.material.emissive.set(emissiveColor);
        }
        
        return true;
    },
    
    // Reset mesh to original color
    resetMeshColor(mesh) {
        if (!mesh || !mesh.material || !mesh.userData.originalProperties) return false;
        
        if (mesh.userData.originalProperties.color) {
            mesh.material.color.copy(mesh.userData.originalProperties.color);
        }
        
        if (mesh.userData.originalProperties.emissive && mesh.material.emissive) {
            mesh.material.emissive.copy(mesh.userData.originalProperties.emissive);
        }
        
        return true;
    },
    
    // Highlight a selected mesh
    highlightMesh(mesh) {
        if (!mesh || !mesh.material) return false;
        
        // Store original emissive for restoration
        if (!mesh.userData.originalEmissive && mesh.material.emissive) {
            mesh.userData.originalEmissive = mesh.material.emissive.clone();
            mesh.material.emissive.set(0x333333);
        }
        
        return true;
    },
    
    // Remove highlight from a mesh
    unhighlightMesh(mesh) {
        if (!mesh || !mesh.material || !mesh.userData.originalEmissive) return false;
        
        mesh.material.emissive.copy(mesh.userData.originalEmissive);
        delete mesh.userData.originalEmissive;
        
        return true;
    }
};