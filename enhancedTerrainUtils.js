// New file for enhanced terrain-related functionality
import * as THREE from 'three';

// Add ground detail for better visuals
export function enhanceGroundDetail(scene, groundMesh) {
    // Create and apply detailed HD ground texture 
    const groundTexture = createHDGroundTexture();
    groundMesh.material.map = groundTexture;
    groundMesh.material.normalMap = createGroundNormalMap();
    groundMesh.material.roughnessMap = groundTexture;
    groundMesh.material.normalScale = new THREE.Vector2(0.8, 0.8);
    groundMesh.material.needsUpdate = true;
    
    // Add scattered high-detail rocks on the terrain
    addDetailedRocks(scene);
    
    // Add HD grass tufts around the edges
    addDetailedGrassTufts(scene);
    
    return groundMesh;
}

// Create procedural HD ground texture
function createHDGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; // Doubled for HD
    canvas.height = 2048; // Doubled for HD
    const context = canvas.getContext('2d');
    
    // Create gradient base
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#7cfc00');
    gradient.addColorStop(0.5, '#8adb24');
    gradient.addColorStop(1, '#7cfc00');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add soil details
    for (let i = 0; i < 20000; i++) { // Doubled for more detail
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.3;
        
        context.fillStyle = `rgba(58, 38, 19, ${opacity})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add lighter grass patches
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 5 + 2;
        const opacity = Math.random() * 0.15;
        
        context.fillStyle = `rgba(180, 255, 150, ${opacity})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add small grass blades texture
    for (let i = 0; i < 15000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const length = Math.random() * 6 + 2;
        const width = Math.random() * 2 + 0.5;
        const angle = Math.random() * Math.PI;
        
        context.fillStyle = `rgba(100, 240, 70, ${Math.random() * 0.3 + 0.1})`;
        context.save();
        context.translate(x, y);
        context.rotate(angle);
        context.fillRect(-width/2, -length/2, width, length);
        context.restore();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20); // Cover more area with higher detail
    
    return texture;
}

// Create normal map for ground
function createGroundNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const context = canvas.getContext('2d');
    
    // Fill with neutral normal (128, 128, 255)
    context.fillStyle = 'rgb(128, 128, 255)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create bumps and divots
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 20 + 5;
        
        // Random normal perturbation
        const r = Math.floor(Math.random() * 40) + 108; // x-normal
        const g = Math.floor(Math.random() * 40) + 108; // y-normal
        
        const gradient = context.createRadialGradient(
            x, y, 0,
            x, y, radius
        );
        
        gradient.addColorStop(0, `rgb(${r}, ${g}, 255)`);
        gradient.addColorStop(1, 'rgb(128, 128, 255)');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    const normalMap = new THREE.CanvasTexture(canvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(20, 20);
    
    return normalMap;
}

// Add highly detailed scattered rocks to the scene
function addDetailedRocks(scene) {
    // Create several detailed rock geometries with subdivided surfaces
    const rockGeometries = [
        new THREE.DodecahedronGeometry(1, 2), // Higher subdivision level (2 instead of 0)
        new THREE.DodecahedronGeometry(1, 3), // Even higher detail
        new THREE.IcosahedronGeometry(1, 2),  // Higher subdivision level
        new THREE.OctahedronGeometry(1, 3)    // Added octahedron for variety
    ];
    
    // Create high-quality rock materials with texture
    const rockTextureCanvas = document.createElement('canvas');
    rockTextureCanvas.width = 1024;
    rockTextureCanvas.height = 1024;
    const rockContext = rockTextureCanvas.getContext('2d');
    
    // Base color
    rockContext.fillStyle = '#888888';
    rockContext.fillRect(0, 0, rockTextureCanvas.width, rockTextureCanvas.height);
    
    // Add rock texture detail
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * rockTextureCanvas.width;
        const y = Math.random() * rockTextureCanvas.height;
        const radius = Math.random() * 8 + 2;
        const shade = Math.floor(Math.random() * 60) - 30;
        
        rockContext.fillStyle = `rgb(${128 + shade}, ${128 + shade}, ${128 + shade})`;
        rockContext.beginPath();
        rockContext.arc(x, y, radius, 0, Math.PI * 2);
        rockContext.fill();
    }
    
    const rockTexture = new THREE.CanvasTexture(rockTextureCanvas);
    
    const rockMaterial = new THREE.MeshStandardMaterial({
        map: rockTexture,
        color: 0x888888,
        roughness: 0.9,
        metalness: 0.1,
        bumpMap: rockTexture,
        bumpScale: 0.02,
        flatShading: true
    });
    
    // Add rocks in a scattered pattern, avoiding the center area
    for (let i = 0; i < 200; i++) { // Doubled number of rocks
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 150; // Keep rocks away from center
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Skip if rock would be in the sign area
        if (z > -75 && z < -40 && Math.abs(x) < 30) continue;
        
        const scale = 0.5 + Math.random() * 2.0; // Increased size variation
        const geometry = rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
        
        // Clone material and give slight color variation for each rock
        const rockMat = rockMaterial.clone();
        const colorVariation = (Math.random() * 0.2) - 0.1;
        rockMat.color.r += colorVariation;
        rockMat.color.g += colorVariation;
        rockMat.color.b += colorVariation;
        
        const rock = new THREE.Mesh(geometry, rockMat);
        
        // Apply random displacements to vertices for more natural look
        const positions = rock.geometry.attributes.position;
        for (let v = 0; v < positions.count; v++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, v);
            
            // Add random displacement
            const displaceAmount = Math.random() * 0.15;
            vertex.x += (Math.random() - 0.5) * displaceAmount;
            vertex.y += (Math.random() - 0.5) * displaceAmount;
            vertex.z += (Math.random() - 0.5) * displaceAmount;
            
            positions.setXYZ(v, vertex.x, vertex.y, vertex.z);
        }
        positions.needsUpdate = true;
        rock.geometry.computeVertexNormals();
        
        rock.position.set(x, scale * 0.5, z);
        rock.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
        
        // Add smaller companion rocks nearby for a more natural grouping (25% chance)
        if (Math.random() < 0.25) {
            const numCompanions = Math.floor(Math.random() * 3) + 1;
            
            for (let j = 0; j < numCompanions; j++) {
                const companionScale = scale * (0.3 + Math.random() * 0.4);
                const companionAngle = Math.random() * Math.PI * 2;
                const companionDist = scale * (1.5 + Math.random());
                
                const compX = x + Math.cos(companionAngle) * companionDist;
                const compZ = z + Math.sin(companionAngle) * companionDist;
                
                const companionGeometry = rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
                const companionRock = new THREE.Mesh(companionGeometry, rockMat.clone());
                
                companionRock.position.set(compX, companionScale * 0.5, compZ);
                companionRock.scale.set(companionScale, companionScale, companionScale);
                companionRock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                companionRock.castShadow = true;
                companionRock.receiveShadow = true;
                scene.add(companionRock);
            }
        }
    }
}

// Add grass tufts for better ground detailing with HD quality
function addDetailedGrassTufts(scene) {
    // Create HD grass texture
    const bladeCanvas = document.createElement('canvas');
    bladeCanvas.width = 512;
    bladeCanvas.height = 512;
    const bladeCtx = bladeCanvas.getContext('2d');
    
    // Transparent background
    bladeCtx.clearRect(0, 0, bladeCanvas.width, bladeCanvas.height);
    
    // Draw grass blade shape
    const centerX = bladeCanvas.width / 2;
    const tipY = 50;
    const baseWidth = 60;
    const baseY = bladeCanvas.height - 30;
    
    // Draw multiple grass blades with different shades of green
    for (let i = 0; i < 8; i++) {
        const offsetX = (Math.random() - 0.5) * 80;
        const width = baseWidth * (0.5 + Math.random() * 0.5);
        const height = bladeCanvas.height - tipY - (Math.random() * 100);
        
        // Create gradient for blade
        const gradient = bladeCtx.createLinearGradient(
            centerX + offsetX, baseY - height,
            centerX + offsetX, baseY
        );
        
        // Color variations for each blade
        const hue = 90 + (Math.random() * 40 - 20); // Green hue with variation
        const sat = 70 + (Math.random() * 30);      // High saturation
        const light = 30 + (Math.random() * 20);    // Medium lightness
        
        gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 10}%, 0.9)`); // Lighter at tip
        gradient.addColorStop(0.7, `hsla(${hue}, ${sat}%, ${light}%, 0.95)`);
        gradient.addColorStop(1, `hsla(${hue - 10}, ${sat - 10}%, ${light - 10}%, 1)`); // Darker at base
        
        bladeCtx.fillStyle = gradient;
        
        // Draw a curved blade
        bladeCtx.beginPath();
        bladeCtx.moveTo(centerX + offsetX - width/2, baseY);
        
        // Curved sides
        bladeCtx.quadraticCurveTo(
            centerX + offsetX - width/3, baseY - height * 0.7,
            centerX + offsetX, baseY - height
        );
        
        bladeCtx.quadraticCurveTo(
            centerX + offsetX + width/3, baseY - height * 0.7,
            centerX + offsetX + width/2, baseY
        );
        
        bladeCtx.closePath();
        bladeCtx.fill();
        
        // Add detail lines to the blade
        bladeCtx.strokeStyle = `hsla(${hue}, ${sat}%, ${light - 15}%, 0.5)`;
        bladeCtx.lineWidth = 1;
        bladeCtx.beginPath();
        bladeCtx.moveTo(centerX + offsetX, baseY);
        bladeCtx.lineTo(centerX + offsetX, baseY - height);
        bladeCtx.stroke();
    }
    
    // Create texture from canvas
    const grassTexture = new THREE.CanvasTexture(bladeCanvas);
    grassTexture.wrapS = THREE.ClampToEdgeWrapping;
    grassTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Use instanced mesh for better performance with many grass tufts
    const grassGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        vertexColors: false
    });
    
    // Increase the number of grass patches for higher density
    const instanceCount = 2500; // Increased from 1000
    const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, instanceCount);
    grass.castShadow = true;
    grass.receiveShadow = true;
    
    // Create transform matrix for each instance
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    
    for (let i = 0; i < instanceCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 200;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Skip if grass would be in the sign area
        if (z > -75 && z < -40 && Math.abs(x) < 30) continue;
        
        const y = 0.5;
        const scale = 0.8 + Math.random() * 1.4; // Increased scale variation
        
        // Create clumps of grass by placing some instances very close to others
        const isClump = Math.random() < 0.4;
        let clumpX = x, clumpZ = z;
        
        if (isClump && i > 0) {
            // Look at previous grass position
            clumpX = x + (Math.random() - 0.5) * 3;
            clumpZ = z + (Math.random() - 0.5) * 3;
        }
        
        // Vary the rotation to face slightly different directions
        const rotationY = Math.random() * Math.PI * 2;
        
        // Also add a slight random tilt
        const tiltX = (Math.random() - 0.5) * 0.2;
        const tiltZ = (Math.random() - 0.5) * 0.2;
        
        // Set position, scale and rotation
        matrix.makeRotationY(rotationY);
        matrix.multiply(new THREE.Matrix4().makeRotationX(tiltX));
        matrix.multiply(new THREE.Matrix4().makeRotationZ(tiltZ));
        matrix.setPosition(clumpX, y, clumpZ);
        matrix.scale(new THREE.Vector3(scale, scale * 2, scale));
        
        // Apply slightly random color to each grass tuft for more natural look
        const hue = 0.27 + (Math.random() * 0.08 - 0.04); // Green in HSL (0.25-0.35)
        const saturation = 0.8 + (Math.random() * 0.2 - 0.1);
        const lightness = 0.4 + (Math.random() * 0.2 - 0.1);
        
        color.setHSL(hue, saturation, lightness);
        
        grass.setColorAt(i, color);
        grass.setMatrixAt(i, matrix);
    }
    
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    
    scene.add(grass);
}