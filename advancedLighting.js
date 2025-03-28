import * as THREE from 'three';

/**
 * Sets up advanced lighting for the city scene using modern Three.js techniques
 * @param {THREE.Scene} scene - The Three.js scene to add lighting to
 * @param {THREE.WebGLRenderer} renderer - The renderer for shadow setup
 */
export function setupSceneLighting(scene, renderer) {
    // Configure shadow map for the renderer
    if (renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadow edges
    }
    
    // Base ambient light - soft global illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Add hemisphere light for sky/ground color transition
    const hemisphereLight = new THREE.HemisphereLight(
        0x87CEEB, // Sky color - light blue
        0x4CA154, // Ground color - green
        0.6       // Intensity
    );
    scene.add(hemisphereLight);
    
    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xfffae5, 1.0); // Warm sunlight color
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    
    // Configure shadow properties for better quality and performance
    sunLight.shadow.mapSize.width = 2048;  // Higher res shadows
    sunLight.shadow.mapSize.height = 2048;
    
    // Optimize shadow camera frustum to cover scene area
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.0005; // Reduce shadow acne
    sunLight.shadow.normalBias = 0.02; // Improve normal-mapped materials shadowing
    
    scene.add(sunLight);
    
    // Add target for directional light to point at center
    const targetObject = new THREE.Object3D();
    targetObject.position.set(0, 0, 0);
    scene.add(targetObject);
    sunLight.target = targetObject;
    
    // Secondary fill light from opposite direction
    const fillLight = new THREE.DirectionalLight(0xdde9ff, 0.4); // Cooler fill light
    fillLight.position.set(-30, 40, -30);
    scene.add(fillLight);
    
    // Add subtle point lights for visual interest around central area
    addPointLights(scene);

    // Setup dynamic shadow mapping based on camera position
    setupDynamicShadows(scene, sunLight, targetObject);
    
    return {
        sunLight,
        fillLight,
        ambientLight,
        hemisphereLight,
        targetObject // Export the target for use in dynamic shadows
    };
}

/**
 * Adds decorative point lights to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 */
function addPointLights(scene) {
    // Create an array of positions for point lights
    const lightPositions = [
        { x: 0, y: 7, z: -30, color: 0xffcc77, intensity: 1.5, distance: 25 },  // Warm light for welcome sign
        { x: -8, y: 5, z: 0, color: 0x88ccff, intensity: 1, distance: 15 },     // Blue light for atmosphere
        { x: 8, y: 5, z: 0, color: 0x88ffaa, intensity: 1, distance: 15 }       // Green light for atmosphere
    ];
    
    // Create and add point lights to the scene
    lightPositions.forEach(pos => {
        const pointLight = new THREE.PointLight(pos.color, pos.intensity, pos.distance);
        pointLight.position.set(pos.x, pos.y, pos.z);
        
        // Enable shadows for the point light
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 512;
        pointLight.shadow.mapSize.height = 512;
        pointLight.shadow.bias = -0.001;
        
        // Add slight animation for the light
        pointLight.userData = {
            originalY: pos.y,
            phase: Math.random() * Math.PI * 2 // Random starting phase for varied animation
        };
        
        // Add light
        scene.add(pointLight);
    });
    
    // Add animation loop for subtle point light movement
    // This would typically be called in the main animation loop
    setupLightAnimation(scene);
}

/**
 * Sets up subtle animation for point lights
 * @param {THREE.Scene} scene - The Three.js scene containing the lights
 */
function setupLightAnimation(scene) {
    // This function should be called once when creating the scene
    
    // Save the original animation function reference if it exists
    const originalAnimateFn = window.cityAnimateFn;
    
    // Create a function to animate the lights
    const animateLights = () => {
        const time = Date.now() * 0.001; // Current time in seconds
        
        // Find all point lights and animate them
        scene.traverse(object => {
            if (object instanceof THREE.PointLight && object.userData.originalY !== undefined) {
                // Subtle hovering motion
                object.position.y = object.userData.originalY + Math.sin(time + object.userData.phase) * 0.3;
                
                // Subtle intensity variation
                object.intensity = object.userData.originalIntensity || 1 * (0.9 + 0.1 * Math.sin(time * 0.5 + object.userData.phase));
            }
        });
        
        // Call original animation function if it exists
        if (originalAnimateFn) originalAnimateFn();
    };
    
    // Store the animation function for use in the main animation loop
    window.cityAnimateLightsFn = animateLights;
}

// New function to setup dynamic shadows that follow the camera
function setupDynamicShadows(scene, sunLight, targetObject) {
    // Create a helper object to store shadow update properties
    const shadowHelper = {
        camera: null,
        sunLight: sunLight,
        targetObject: targetObject,
        shadowCameraSize: 50, // Default size - will be adjusted based on camera
        shadowFollowSpeed: 0.1, // Smoothing factor for shadow movement
        shadowResolution: 2048, // Default shadow resolution
        lastCameraPosition: new THREE.Vector3(), // Track camera movement
        movementThreshold: 5, // Units of movement before shadow gets updated
        updateInterval: 100, // Milliseconds between forced updates
        lastUpdateTime: 0
    };
    
    // Store the shadow helper on the scene for the animation loop to access
    scene.userData.shadowHelper = shadowHelper;

    // Define the shadow update function that will be called in the animation loop
    window.updateDynamicShadows = function(camera, delta) {
        if (!scene.userData.shadowHelper || !camera) return;
        
        const helper = scene.userData.shadowHelper;
        helper.camera = camera; // Keep camera reference updated
        
        // Check if enough time has passed since last update or camera moved substantially
        const now = performance.now();
        const cameraMovement = camera.position.distanceTo(helper.lastCameraPosition);
        const timeSinceUpdate = now - helper.lastUpdateTime;
        
        if (cameraMovement > helper.movementThreshold || timeSinceUpdate > helper.updateInterval) {
            // Update shadow camera to focus on area around camera view
            // Calculate target point - average of camera position and look target
            const cameraTarget = new THREE.Vector3();
            camera.getWorldDirection(cameraTarget);
            cameraTarget.multiplyScalar(30).add(camera.position); // Look 30 units ahead
            
            // Move the shadow camera target smoothly
            helper.targetObject.position.lerp(cameraTarget, helper.shadowFollowSpeed);
            
            // Adjust shadow camera frustum based on camera height and distance
            const height = Math.max(20, camera.position.y * 1.5);
            const shadowSize = Math.max(40, height * 1.5);
            
            // Update shadow camera size
            helper.sunLight.shadow.camera.left = -shadowSize;
            helper.sunLight.shadow.camera.right = shadowSize;
            helper.sunLight.shadow.camera.top = shadowSize;
            helper.sunLight.shadow.camera.bottom = -shadowSize;
            
            // Position the sun light relative to the camera but maintain height and angle
            const sunPosition = new THREE.Vector3(
                camera.position.x + 50, 
                100, // Keep consistent height
                camera.position.z + 50
            );
            helper.sunLight.position.lerp(sunPosition, helper.shadowFollowSpeed);
            
            // Update shadow camera
            helper.sunLight.shadow.camera.updateProjectionMatrix();
            
            // Store last values
            helper.lastCameraPosition.copy(camera.position);
            helper.lastUpdateTime = now;
        }
    };
}