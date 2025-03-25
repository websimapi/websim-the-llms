import * as THREE from 'three';

// Generate mountain terrain for the background
export function generateTerrain(scene) {
    const terrainGroup = new THREE.Group();
    
    // Add distant mountains using multiple detailed layers
    addDetailedMountainRange(terrainGroup, 0, -200, 0x3a5e52, 0.8);
    addDetailedMountainRange(terrainGroup, -50, -250, 0x2d4a40, 0.7);
    addDetailedMountainRange(terrainGroup, 40, -300, 0x1e3329, 0.6);
    
    // Add fog to create depth perspective
    scene.fog = new THREE.FogExp2(0xe0f5e0, 0.0025);
    
    return terrainGroup;
}

function addDetailedMountainRange(parent, offsetX, offsetZ, color, scale = 1.0) {
    // Create a mountain range using multiple peaks with high detail
    const rangeWidth = 600;
    const rangeDepth = 100;
    const numPeaks = 16; // Increased from 12 for more detail
    
    for (let i = 0; i < numPeaks; i++) {
        // Randomize peak positions with more variation
        const x = (i / (numPeaks - 1) * rangeWidth) - (rangeWidth / 2) + offsetX + (Math.random() * 30 - 15);
        const z = offsetZ + (Math.random() * 50 - 25) * scale;
        
        // Create mountain peak with more detailed geometry
        const peakHeight = (30 + Math.random() * 50) * scale;
        const radius = (20 + Math.random() * 30) * scale;
        
        // Use a more detailed cone geometry
        const segmentDetail = Math.floor(16 + Math.random() * 8); // Increased from 12
        const heightSegments = Math.floor(8 + Math.random() * 4); // Added height segments
        const mountainGeometry = new THREE.ConeGeometry(
            radius, 
            peakHeight, 
            segmentDetail,
            heightSegments,
            true // Enable UVs
        );
        
        // Create detailed mountain material
        const baseColor = new THREE.Color(color);
        baseColor.r += (Math.random() * 0.1 - 0.05);
        baseColor.g += (Math.random() * 0.1 - 0.05);
        baseColor.b += (Math.random() * 0.1 - 0.05);
        
        // Create a texture for the mountain
        const mountainCanvas = document.createElement('canvas');
        mountainCanvas.width = 1024;
        mountainCanvas.height = 1024;
        const ctx = mountainCanvas.getContext('2d');
        
        // Background color
        ctx.fillStyle = `rgb(${Math.floor(baseColor.r*255)}, ${Math.floor(baseColor.g*255)}, ${Math.floor(baseColor.b*255)})`;
        ctx.fillRect(0, 0, mountainCanvas.width, mountainCanvas.height);
        
        // Add rock and shadow details
        for (let j = 0; j < 5000; j++) {
            const x = Math.random() * mountainCanvas.width;
            const y = Math.random() * mountainCanvas.height;
            const size = Math.random() * 10 + 2;
            const brightness = Math.random() * 50 - 30; // Darker and lighter spots
            
            const r = Math.max(0, Math.min(255, Math.floor(baseColor.r*255) + brightness));
            const g = Math.max(0, Math.min(255, Math.floor(baseColor.g*255) + brightness));
            const b = Math.max(0, Math.min(255, Math.floor(baseColor.b*255) + brightness));
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add snow cap if mountain is tall enough
        if (peakHeight > 40 * scale) {
            // Radial gradient for snow cap
            const snowCapGradient = ctx.createRadialGradient(
                mountainCanvas.width/2, 0, 0,
                mountainCanvas.width/2, 0, mountainCanvas.width/2
            );
            
            snowCapGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            snowCapGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
            snowCapGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
            snowCapGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = snowCapGradient;
            ctx.fillRect(0, 0, mountainCanvas.width, mountainCanvas.height/2);
        }
        
        const mountainTexture = new THREE.CanvasTexture(mountainCanvas);
        
        const mountainMaterial = new THREE.MeshStandardMaterial({
            color: baseColor,
            map: mountainTexture,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true,
            bumpMap: mountainTexture,
            bumpScale: 0.15,
            displacementMap: mountainTexture,
            displacementScale: 5 * scale,
            displacementBias: -2 * scale
        });
        
        // Create mountain mesh
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(x, peakHeight / 2, z);
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        
        // Apply random rotation to make peaks look more natural
        mountain.rotation.y = Math.random() * Math.PI;
        
        // Apply complex noise to vertices for more natural detailed peaks
        const positions = mountain.geometry.attributes.position;
        
        for (let j = 0; j < positions.count; j++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, j);
            
            // Don't modify the peak point or base rim
            if (vertex.y < peakHeight * 0.95 && vertex.y > peakHeight * 0.05) {
                const normalizedHeight = vertex.y / peakHeight;
                
                // Multi-octave noise for more realistic mountain silhouette
                const largeNoise = (Math.random() * 2 - 1) * radius * 0.15;
                const mediumNoise = (Math.random() * 2 - 1) * radius * 0.08;
                const smallNoise = (Math.random() * 2 - 1) * radius * 0.04;
                
                // Apply more noise to middle sections, less at top and bottom
                const noiseFactor = (1 - normalizedHeight) * normalizedHeight * 4;
                
                vertex.x += (largeNoise + mediumNoise * 2 + smallNoise * 3) * noiseFactor;
                vertex.z += (largeNoise + mediumNoise * 2 + smallNoise * 3) * noiseFactor;
                
                // Add variation in height too
                vertex.y += smallNoise * noiseFactor * peakHeight * 0.1;
            }
            
            positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }
        
        positions.needsUpdate = true;
        mountain.geometry.computeVertexNormals();
        
        parent.add(mountain);
        
        // Add ridges and sub-peaks with increased probability (60% instead of 40%)
        if (Math.random() > 0.4) {
            const numSubPeaks = Math.floor(Math.random() * 5) + 3; // Increased for more detail
            
            for (let k = 0; k < numSubPeaks; k++) {
                const subRadius = radius * (0.3 + Math.random() * 0.3);
                const subHeight = peakHeight * (0.3 + Math.random() * 0.4);
                
                // Choose between cone or irregular dodecahedron
                let subPeakGeometry;
                if (Math.random() > 0.3) {
                    subPeakGeometry = new THREE.ConeGeometry(
                        subRadius,
                        subHeight,
                        Math.floor(12 + Math.random() * 8), // More detailed
                        Math.floor(3 + Math.random() * 3)   // More height segments
                    );
                } else {
                    // Use higher detail for dodecahedron
                    subPeakGeometry = new THREE.DodecahedronGeometry(
                        subRadius * 0.8,
                        Math.floor(Math.random() * 2) + 1 // Higher detail, at least level 1
                    );
                    subPeakGeometry.scale(1, subHeight/(subRadius*1.6), 1);
                }
                
                // Apply noise to sub-peak vertices for more natural look
                const subPositions = subPeakGeometry.attributes.position;
                for (let v = 0; v < subPositions.count; v++) {
                    const vertex = new THREE.Vector3();
                    vertex.fromBufferAttribute(subPositions, v);
                    
                    // Add multi-layered noise
                    const noise1 = (Math.random() * 2 - 1) * 0.2;
                    const noise2 = (Math.random() * 2 - 1) * 0.1;
                    
                    vertex.x += noise1 + noise2;
                    vertex.y += noise2;
                    vertex.z += noise1 + noise2;
                    
                    subPositions.setXYZ(v, vertex.x, vertex.y, vertex.z);
                }
                subPositions.needsUpdate = true;
                
                // Create sub-peak with varied color
                const subColor = new THREE.Color(color);
                subColor.r += Math.random() * 0.15 - 0.075;
                subColor.g += Math.random() * 0.15 - 0.075;
                subColor.b += Math.random() * 0.15 - 0.075;
                
                // Create a texture for the sub-peak
                const subTexture = mountainTexture.clone();
                
                const subMaterial = new THREE.MeshStandardMaterial({
                    color: subColor,
                    map: subTexture,
                    roughness: 0.95,
                    metalness: 0.05,
                    flatShading: true,
                    bumpMap: subTexture,
                    bumpScale: 0.1
                });
                
                const subPeak = new THREE.Mesh(subPeakGeometry, subMaterial);
                
                // Position sub-peaks in a more natural arrangement
                const angle = Math.random() * Math.PI * 2;
                const distance = radius * (0.6 + Math.random() * 0.7); // Increased for more spread
                
                // Keep sub-peaks more toward the middle of the main peak
                const heightRatio = 0.2 + Math.random() * 0.6;
                
                subPeak.position.set(
                    x + Math.sin(angle) * distance,
                    (subHeight / 2) + peakHeight * heightRatio,
                    z + Math.cos(angle) * distance
                );
                
                subPeak.rotation.set(
                    Math.random() * 0.3, 
                    Math.random() * Math.PI, 
                    Math.random() * 0.3
                );
                
                subPeak.castShadow = true;
                subPeak.receiveShadow = true;
                
                parent.add(subPeak);
            }
        }
    }
    
    // Add lower hills to fill gaps between main peaks
    for (let i = 0; i < numPeaks * 1.5; i++) {
        const x = (Math.random() * rangeWidth) - (rangeWidth / 2) + offsetX;
        const z = offsetZ + (Math.random() * rangeDepth - rangeDepth/2) * scale;
        
        // Create smaller, more rounded hills
        const hillHeight = (10 + Math.random() * 20) * scale;
        const hillRadius = (15 + Math.random() * 25) * scale;
        
        // Use hemisphere geometry for smoother hills
        const hillGeometry = new THREE.SphereGeometry(
            hillRadius,
            Math.floor(12 + Math.random() * 6),
            Math.floor(8 + Math.random() * 4),
            0, Math.PI * 2, 0, Math.PI/2
        );
        
        // Slightly darker color for hills to create depth
        const hillColor = new THREE.Color(color);
        hillColor.r *= 0.85;
        hillColor.g *= 0.85;
        hillColor.b *= 0.85;
        
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: hillColor,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(x, 0, z);
        hill.castShadow = true;
        hill.receiveShadow = true;
        
        parent.add(hill);
    }
    
    return parent;
}