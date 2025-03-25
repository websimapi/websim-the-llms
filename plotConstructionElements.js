import * as THREE from 'three';

// Create construction tape outline around a plot
export function createConstructionTape(width, depth, position) {
    const group = new THREE.Group();
    
    // Create tape material - yellow with black stripes
    const tapeCanvas = document.createElement('canvas');
    tapeCanvas.width = 256;
    tapeCanvas.height = 64;
    const ctx = tapeCanvas.getContext('2d');
    
    // Fill with yellow background
    ctx.fillStyle = '#FFDD00';
    ctx.fillRect(0, 0, tapeCanvas.width, tapeCanvas.height);
    
    // Add black diagonal stripes
    ctx.fillStyle = '#000000';
    const stripeWidth = 20;
    const stripeSpacing = 40;
    for (let i = -tapeCanvas.width; i < tapeCanvas.width * 2; i += stripeSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + stripeWidth, 0);
        ctx.lineTo(i + stripeWidth, tapeCanvas.height);
        ctx.lineTo(i, tapeCanvas.height);
        ctx.closePath();
        ctx.fill();
    }
    
    const tapeTexture = new THREE.CanvasTexture(tapeCanvas);
    tapeTexture.wrapS = THREE.RepeatWrapping;
    tapeTexture.wrapT = THREE.RepeatWrapping;
    tapeTexture.repeat.set(10, 1);
    
    const tapeMaterial = new THREE.MeshBasicMaterial({
        map: tapeTexture,
        side: THREE.DoubleSide,
        transparent: true
    });
    
    // Create tape segments - slightly above ground
    const tapeHeight = 0.1;
    const tapeElevation = 0.05;
    
    // Front tape
    const frontTape = new THREE.Mesh(
        new THREE.PlaneGeometry(width, tapeHeight),
        tapeMaterial
    );
    frontTape.position.set(0, tapeElevation, depth/2);
    frontTape.rotation.y = Math.PI;
    group.add(frontTape);
    
    // Back tape
    const backTape = new THREE.Mesh(
        new THREE.PlaneGeometry(width, tapeHeight),
        tapeMaterial
    );
    backTape.position.set(0, tapeElevation, -depth/2);
    group.add(backTape);
    
    // Left tape
    const leftTape = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, tapeHeight),
        tapeMaterial
    );
    leftTape.position.set(-width/2, tapeElevation, 0);
    leftTape.rotation.y = Math.PI/2;
    group.add(leftTape);
    
    // Right tape
    const rightTape = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, tapeHeight),
        tapeMaterial
    );
    rightTape.position.set(width/2, tapeElevation, 0);
    rightTape.rotation.y = -Math.PI/2;
    group.add(rightTape);
    
    // Position the entire group
    group.position.set(position.x, position.y, position.z);
    
    return group;
}

// Create construction cones for a plot
export function createConstructionCones(width, depth, position) {
    const group = new THREE.Group();
    
    // Create cone geometry and materials
    const coneBaseRadius = 0.3;
    const coneHeight = 0.7;
    const coneGeometry = new THREE.ConeGeometry(coneBaseRadius, coneHeight, 16);
    
    const orangeMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6600,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const whiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.7,
        metalness: 0.1,
        emissive: 0xAAAAAA,
        emissiveIntensity: 0.2
    });
    
    // Define cone positions (corners and midpoints)
    const conePositions = [
        // Corners
        {x: -width/2, z: -depth/2},
        {x: width/2, z: -depth/2},
        {x: width/2, z: depth/2},
        {x: -width/2, z: depth/2},
        
        // Midpoints (if the plot is large enough)
        {x: 0, z: -depth/2},
        {x: width/2, z: 0},
        {x: 0, z: depth/2},
        {x: -width/2, z: 0}
    ];
    
    // Only place cones at midpoints for larger plots
    const useAllPositions = (width > 15 || depth > 15);
    const positionsToUse = useAllPositions ? conePositions : conePositions.slice(0, 4);
    
    // Create and position cones
    positionsToUse.forEach((pos, index) => {
        // Create cone with alternating materials
        const coneMaterial = index % 2 === 0 ? orangeMaterial : whiteMaterial;
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        
        // Position cone
        cone.position.set(pos.x, coneHeight/2, pos.z);
        
        // Add cone to group
        group.add(cone);
        
        // Add reflective band (if orange cone)
        if (index % 2 === 0) {
            const bandGeometry = new THREE.TorusGeometry(coneBaseRadius * 0.7, 0.03, 16, 32);
            const bandMesh = new THREE.Mesh(bandGeometry, whiteMaterial);
            bandMesh.position.y = coneHeight * 0.3;
            bandMesh.rotation.x = Math.PI/2;
            cone.add(bandMesh);
        }
    });
    
    // Position the entire group
    group.position.set(position.x, position.y, position.z);
    
    return group;
}

// Create a plot outline with construction elements
export function createPlotOutline(lot, scene) {
    const plotGroup = new THREE.Group();
    
    // Create construction tape outline
    const tape = createConstructionTape(lot.width, lot.height, {x: 0, y: 0, z: 0});
    plotGroup.add(tape);
    
    // Create construction cones
    const cones = createConstructionCones(lot.width, lot.height, {x: 0, y: 0, z: 0});
    plotGroup.add(cones);
    
    // Position the entire group at lot position
    plotGroup.position.set(lot.x, 0.1, lot.z);
    
    scene.add(plotGroup);
    
    return plotGroup;
}