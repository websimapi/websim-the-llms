import * as THREE from 'three';

// Generate mountain terrain for the background
export function generateTerrain(scene) {
    const terrainGroup = new THREE.Group();
    
    // Add distant mountains using multiple layers
    addMountainRange(terrainGroup, 0, -200, 0x3a5e52, 0.8);
    addMountainRange(terrainGroup, -50, -250, 0x2d4a40, 0.7);
    addMountainRange(terrainGroup, 40, -300, 0x1e3329, 0.6);
    
    // Add fog to create depth perspective
    scene.fog = new THREE.FogExp2(0xe0f5e0, 0.0025);
    
    return terrainGroup;
}

function addMountainRange(parent, offsetX, offsetZ, color, scale = 1.0) {
    // Create a mountain range using multiple peaks
    const rangeWidth = 600;
    const rangeDepth = 100;
    const numPeaks = 12;
    
    for (let i = 0; i < numPeaks; i++) {
        // Randomize peak positions
        const x = (i / (numPeaks - 1) * rangeWidth) - (rangeWidth / 2) + offsetX;
        const z = offsetZ + (Math.random() * 50 - 25) * scale;
        
        // Create mountain peak
        const peakHeight = (30 + Math.random() * 50) * scale;
        const radius = (20 + Math.random() * 30) * scale;
        
        const mountainGeometry = new THREE.ConeGeometry(
            radius, 
            peakHeight, 
            Math.floor(8 + Math.random() * 6)
        );
        
        // Create noise-based material with color variation
        const baseColor = new THREE.Color(color);
        const mountainMaterial = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        
        // Create mountain mesh
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(x, peakHeight / 2, z);
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        
        // Apply random rotation to make peaks look more natural
        mountain.rotation.y = Math.random() * Math.PI;
        
        // Add some noise to vertices for more natural look
        const positions = mountain.geometry.attributes.position;
        
        for (let j = 0; j < positions.count; j++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, j);
            
            // Don't modify the peak point or base rim
            if (vertex.y < peakHeight * 0.95 && vertex.y > 0) {
                // Apply noise based on position
                const noise = (Math.random() * 2 - 1) * radius * 0.15;
                const normalizedHeight = vertex.y / peakHeight;
                
                // More noise in the middle, less at top and bottom
                const noiseFactor = (1 - normalizedHeight) * normalizedHeight * 4;
                vertex.x += noise * noiseFactor;
                vertex.z += noise * noiseFactor;
            }
            
            positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }
        
        positions.needsUpdate = true;
        mountain.geometry.computeVertexNormals();
        
        parent.add(mountain);
        
        // Add smaller sub-peaks for more complex mountains
        if (Math.random() > 0.6) {
            const numSubPeaks = Math.floor(Math.random() * 3) + 1;
            
            for (let k = 0; k < numSubPeaks; k++) {
                const subRadius = radius * 0.4;
                const subHeight = peakHeight * 0.5;
                const subPeakGeometry = new THREE.ConeGeometry(
                    subRadius,
                    subHeight,
                    Math.floor(6 + Math.random() * 4)
                );
                
                const subColor = new THREE.Color(color);
                subColor.multiplyScalar(0.9 + Math.random() * 0.2);
                
                const subMaterial = new THREE.MeshStandardMaterial({
                    color: subColor,
                    roughness: 0.9,
                    metalness: 0.1,
                    flatShading: true
                });
                
                const subPeak = new THREE.Mesh(subPeakGeometry, subMaterial);
                
                // Position around the main peak
                const angle = Math.random() * Math.PI * 2;
                const distance = radius * 0.7;
                subPeak.position.set(
                    x + Math.sin(angle) * distance,
                    subHeight / 2,
                    z + Math.cos(angle) * distance
                );
                
                subPeak.rotation.y = Math.random() * Math.PI;
                subPeak.castShadow = true;
                subPeak.receiveShadow = true;
                
                parent.add(subPeak);
            }
        }
    }
    
    return parent;
}