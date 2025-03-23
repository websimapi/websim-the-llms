// New file to handle model transformation and storage
import * as THREE from 'three';

// Apply stored transforms to a model
export function applyModelTransforms(model, transforms) {
    if (!model || !transforms || !Array.isArray(transforms)) return;
    
    // Map transforms by id for quick lookup
    const transformMap = {};
    transforms.forEach(t => {
        transformMap[t.id] = t;
    });
    
    // Apply transforms to matching meshes
    model.traverse(child => {
        if (child.isMesh && transformMap[child.id]) {
            const transform = transformMap[child.id];
            
            // Apply position
            if (transform.position) {
                child.position.set(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
            }
            
            // Apply rotation
            if (transform.rotation) {
                child.rotation.set(
                    transform.rotation.x,
                    transform.rotation.y,
                    transform.rotation.z
                );
            }
            
            // Apply scale
            if (transform.scale) {
                child.scale.set(
                    transform.scale.x,
                    transform.scale.y,
                    transform.scale.z
                );
            }
        }
    });
}

// Capture current transforms from a model
export function captureModelTransforms(model) {
    if (!model) return [];
    
    const transforms = [];
    
    model.traverse(child => {
        if (child.isMesh) {
            transforms.push({
                id: child.id || Math.random().toString(36).substr(2, 9),
                position: { 
                    x: child.position.x, 
                    y: child.position.y, 
                    z: child.position.z 
                },
                rotation: { 
                    x: child.rotation.x, 
                    y: child.rotation.y, 
                    z: child.rotation.z 
                },
                scale: { 
                    x: child.scale.x, 
                    y: child.scale.y, 
                    z: child.scale.z 
                }
            });
        }
    });
    
    return transforms;
}