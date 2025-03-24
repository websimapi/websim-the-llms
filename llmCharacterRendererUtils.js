// Shared utilities for consistent character rendering across the application
import * as THREE from 'three';

// Create standardized materials based on LLM properties
export function createStandardMaterials(color, style) {
    let emissiveIntensity = 0;
    let metalness = 0.2;
    let roughness = 0.7;
    
    // Apply style variations
    switch(style) {
        case 'modern':
            metalness = 0.6;
            roughness = 0.2;
            break;
        case 'classic':
            metalness = 0.1;
            roughness = 0.9;
            break;
        case 'retro':
            metalness = 0.3;
            roughness = 0.8;
            break;
        case 'futuristic':
            metalness = 0.8;
            roughness = 0.1;
            emissiveIntensity = 0.5;
            break;
    }
    
    const threeColor = new THREE.Color(color);
    
    // Create standardized materials
    const headMaterial = new THREE.MeshStandardMaterial({
        color: threeColor,
        emissive: threeColor.clone().multiplyScalar(0.3),
        emissiveIntensity: emissiveIntensity,
        metalness: metalness + 0.2,
        roughness: roughness - 0.1
    });
    
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: threeColor.clone().multiplyScalar(0.8),
        emissive: threeColor.clone().multiplyScalar(0.2),
        emissiveIntensity: emissiveIntensity,
        metalness: metalness,
        roughness: roughness
    });
    
    const limbsMaterial = new THREE.MeshStandardMaterial({
        color: threeColor.clone().multiplyScalar(0.6),
        emissive: threeColor.clone().multiplyScalar(0.1),
        emissiveIntensity: emissiveIntensity,
        metalness: metalness + 0.3,
        roughness: roughness + 0.1
    });
    
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff 
    });
    
    const antennaTipMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000 
    });
    
    const chestLightMaterial = new THREE.MeshBasicMaterial({ 
        color: threeColor.clone().multiplyScalar(1.5) 
    });
    
    return {
        headMaterial,
        bodyMaterial,
        limbsMaterial,
        eyeMaterial,
        antennaTipMaterial,
        chestLightMaterial
    };
}

// New functions for model serialization and storage
export function serializeModelData(model) {
    const modelData = {
        parts: []
    };
    
    model.traverse(child => {
        if (child.isMesh && child.material) {
            modelData.parts.push({
                name: child.name || `part_${modelData.parts.length}`,
                position: child.position.toArray(),
                rotation: [child.rotation.x, child.rotation.y, child.rotation.z],
                scale: child.scale.toArray(),
                materialProps: serializeMaterial(child.material)
            });
        }
    });
    
    return modelData;
}

export function serializeMaterial(material) {
    const materialData = {
        type: material.type
    };
    
    // Store color properties if they exist
    if (material.color) materialData.color = '#' + material.color.getHexString();
    if (material.emissive) materialData.emissive = '#' + material.emissive.getHexString();
    if (material.specular) materialData.specular = '#' + material.specular.getHexString();
    
    // Store numeric properties
    const numericProps = ['metalness', 'roughness', 'opacity', 'transparent', 'emissiveIntensity'];
    numericProps.forEach(prop => {
        if (material[prop] !== undefined) materialData[prop] = material[prop];
    });
    
    return materialData;
}