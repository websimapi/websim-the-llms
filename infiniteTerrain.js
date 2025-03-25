import * as THREE from 'three';
import { config } from './config.js';

// Create a terrain that extends into the distance with fog and LOD
export function createInfiniteTerrain(scene, primaryGroundSize = 500) {
    // Add fog to create distance fade effect
    scene.fog = new THREE.FogExp2(0xe0f5e0, 0.0025);
    
    // Create primary ground (high detail, close to camera)
    const groundGeometry = new THREE.PlaneGeometry(primaryGroundSize, primaryGroundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7cfc00,
        roughness: 0.8,
        metalness: 0.2,
        flatShading: false
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create distant terrain pieces (lower detail)
    const terrainSize = primaryGroundSize * 4; // Much larger
    const segmentCount = 8; // Lower resolution for distant terrain
    
    const distantGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segmentCount, segmentCount);
    const distantMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
    });
    const distantTerrain = new THREE.Mesh(distantGeometry, distantMaterial);
    distantTerrain.rotation.x = -Math.PI / 2;
    distantTerrain.position.y = -1; // Slightly lower than main ground
    distantTerrain.receiveShadow = true;
    scene.add(distantTerrain);
    
    // Add subtle terrain variation
    const vertices = distantGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const z = vertices.getZ(i);
        
        // Only modify vertices that are far from center
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter > primaryGroundSize / 2) {
            // Add subtle height variation
            vertices.setY(i, Math.sin(x * 0.01) * Math.cos(z * 0.01) * 5 - 3);
        }
    }
    vertices.needsUpdate = true;
    
    // Return ground references
    return {
        primaryGround: ground,
        distantTerrain: distantTerrain
    };
}