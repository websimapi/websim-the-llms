// New file for enhanced terrain-related functionality
import * as THREE from 'three';

// Add ground detail for better visuals
export function enhanceGroundDetail(scene, groundMesh) {
    // Add ground texture for better appearance
    const groundTexture = createGroundTexture();
    groundMesh.material.map = groundTexture;
    groundMesh.material.roughnessMap = groundTexture;
    groundMesh.material.normalScale = new THREE.Vector2(0.5, 0.5);
    groundMesh.material.needsUpdate = true;
    
    // Add scattered rocks on the terrain
    addScatteredRocks(scene);
    
    // Add grass tufts around the edges
    addGrassTufts(scene);
    
    return groundMesh;
}

// Create procedural ground texture
function createGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    
    // Base color
    context.fillStyle = '#7cfc00';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add noise
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2 + 1;
        const opacity = Math.random() * 0.2;
        
        context.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add some light areas
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.1;
        
        context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    
    return texture;
}

// Add scattered rocks to the scene
function addScatteredRocks(scene) {
    const rockGeometries = [
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.DodecahedronGeometry(1, 1),
        new THREE.IcosahedronGeometry(1, 0),
    ];
    
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
    });
    
    // Add rocks in a scattered pattern, avoiding the center area
    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 150; // Keep rocks away from center
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Skip if rock would be in the sign area
        if (z > -75 && z < -40 && Math.abs(x) < 30) continue;
        
        const scale = 0.5 + Math.random() * 1.5;
        const geometry = rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
        const rock = new THREE.Mesh(geometry, rockMaterial.clone());
        
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
    }
}

// Add grass tufts for better ground detailing
function addGrassTufts(scene) {
    // Use instanced mesh for better performance with many grass tufts
    const instanceCount = 1000;
    const grassGeometry = new THREE.PlaneGeometry(1, 1);
    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        side: THREE.DoubleSide,
        alphaTest: 0.5
    });
    
    const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, instanceCount);
    
    // Create transform matrix for each instance
    const matrix = new THREE.Matrix4();
    
    for (let i = 0; i < instanceCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 200;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Skip if grass would be in the sign area
        if (z > -75 && z < -40 && Math.abs(x) < 30) continue;
        
        const y = 0.5;
        const scale = 0.8 + Math.random() * 1.2;
        
        // Set position, scale and rotation
        matrix.makeRotationY(Math.random() * Math.PI);
        matrix.setPosition(x, y, z);
        matrix.scale(new THREE.Vector3(scale, scale * 2, scale));
        
        // Apply slightly random color to each grass tuft
        const color = new THREE.Color(0x7cfc00);
        color.r += (Math.random() * 0.1 - 0.05);
        color.g += (Math.random() * 0.1 - 0.05);
        color.b += (Math.random() * 0.1 - 0.05);
        
        grass.setColorAt(i, color);
        grass.setMatrixAt(i, matrix);
    }
    
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    
    scene.add(grass);
}