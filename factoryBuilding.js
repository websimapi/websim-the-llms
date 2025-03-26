import * as THREE from 'three';

// Create the factory building model
export function createFactoryBuilding() {
    const factoryGroup = new THREE.Group();
    factoryGroup.name = "DistantFactory";

    // Factory dimensions
    const factoryWidth = 150;
    const factoryHeight = 80;
    const factoryDepth = 100;

    // Main building material (dark, industrial look)
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x555566, // Dark bluish-grey
        roughness: 0.8,
        metalness: 0.3,
    });

    // Main structure
    const mainBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(factoryWidth, factoryHeight, factoryDepth),
        buildingMaterial
    );
    mainBuilding.position.y = factoryHeight / 2; // Raise it so base is at y=0
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    factoryGroup.add(mainBuilding);

    // Roof detail (slightly sloped)
    const roofGeometry = new THREE.BoxGeometry(factoryWidth * 1.05, 5, factoryDepth * 1.05);
    const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x444450,
        roughness: 0.7,
        metalness: 0.2,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = factoryHeight + 2.5; // Position on top of the main building
    factoryGroup.add(roof);

    // Smokestacks
    const smokestackRadius = 5;
    const smokestackHeight = 40;
    const smokestackMaterial = new THREE.MeshStandardMaterial({
        color: 0x333338,
        roughness: 0.6,
        metalness: 0.4,
    });
    const smokestackGeometry = new THREE.CylinderGeometry(smokestackRadius, smokestackRadius * 0.8, smokestackHeight, 16);

    const stack1 = new THREE.Mesh(smokestackGeometry, smokestackMaterial);
    stack1.position.set(-factoryWidth / 3, factoryHeight + smokestackHeight / 2, -factoryDepth / 3);
    stack1.castShadow = true;
    factoryGroup.add(stack1);

    const stack2 = new THREE.Mesh(smokestackGeometry, smokestackMaterial);
    stack2.position.set(factoryWidth / 3, factoryHeight + smokestackHeight / 2, -factoryDepth / 3);
    stack2.castShadow = true;
    factoryGroup.add(stack2);

    // Large drone exit (Airlift Exit) - A large opening on the front
    const exitWidth = 40;
    const exitHeight = 30;
    const exitDepth = 5; // How far recessed it is

    // Create the hole geometry by subtracting a box (using CSG is complex, simulating with darker inset)
    const exitFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x222228, // Darker frame
        roughness: 0.5,
        metalness: 0.5,
    });
    const exitOpeningMaterial = new THREE.MeshBasicMaterial({
        color: 0x111115, // Very dark interior
        side: THREE.DoubleSide,
    });

    // Frame around the exit
    const frameThickness = 2;
    // Top frame
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(exitWidth + frameThickness * 2, frameThickness, exitDepth), exitFrameMaterial);
    topFrame.position.set(0, factoryHeight / 2 + exitHeight / 2 + frameThickness / 2, factoryDepth / 2);
    factoryGroup.add(topFrame);
    // Bottom frame
    const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(exitWidth + frameThickness * 2, frameThickness, exitDepth), exitFrameMaterial);
    bottomFrame.position.set(0, factoryHeight / 2 - exitHeight / 2 - frameThickness / 2, factoryDepth / 2);
    factoryGroup.add(bottomFrame);
    // Left frame
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, exitHeight + frameThickness * 2, exitDepth), exitFrameMaterial);
    leftFrame.position.set(-exitWidth / 2 - frameThickness / 2, factoryHeight / 2, factoryDepth / 2);
    factoryGroup.add(leftFrame);
    // Right frame
    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, exitHeight + frameThickness * 2, exitDepth), exitFrameMaterial);
    rightFrame.position.set(exitWidth / 2 + frameThickness / 2, factoryHeight / 2, factoryDepth / 2);
    factoryGroup.add(rightFrame);

    // Inner dark opening (plane)
    const exitPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(exitWidth, exitHeight),
        exitOpeningMaterial
    );
    exitPlane.position.set(0, factoryHeight / 2, factoryDepth / 2 + 0.1); // Slightly forward from the main wall
    factoryGroup.add(exitPlane);

    // Add some subtle lights near the exit
    const exitLightColor = 0xffaa00; // Amber/Orange light
    const exitLightIntensity = 2;
    const exitLightDistance = 20;

    const light1 = new THREE.PointLight(exitLightColor, exitLightIntensity, exitLightDistance);
    light1.position.set(-exitWidth / 2 + 5, factoryHeight / 2 + exitHeight / 2 - 5, factoryDepth / 2 + 5);
    factoryGroup.add(light1);

    const light2 = new THREE.PointLight(exitLightColor, exitLightIntensity, exitLightDistance);
    light2.position.set(exitWidth / 2 - 5, factoryHeight / 2 + exitHeight / 2 - 5, factoryDepth / 2 + 5);
    factoryGroup.add(light2);


    // Add some simple window details (using emissive materials)
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x222228,
        emissive: 0xffffaa, // Yellowish glow
        emissiveIntensity: 0.5
    });
    const windowGeometry = new THREE.PlaneGeometry(10, 15);

    for (let i = 0; i < 3; i++) {
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.position.set(-factoryWidth / 2 + 20 + i * 30, factoryHeight * 0.6, factoryDepth / 2 + 0.1);
        factoryGroup.add(windowMesh);
    }

    return factoryGroup;
}