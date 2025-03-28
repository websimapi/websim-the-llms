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
        // Use a larger, fixed shadow size for more stability
        shadowCameraSize: 75, // Increased fixed size
        shadowFollowSpeed: 0.08, // Slightly reduced speed for smoother lerp
        shadowResolution: 2048, // Default shadow resolution
        lastCameraPosition: new THREE.Vector3(), // Track camera movement
        // Removed thresholds, update every frame for smoothness
        // movementThreshold: 5,
        // updateInterval: 100,
        // lastUpdateTime: 0
    };

    // Store the shadow helper on the scene for the animation loop to access
    scene.userData.shadowHelper = shadowHelper;

    // Keep the sun high and relatively fixed direction relative to world, not camera
    // Example: Always shining from roughly the same direction (e.g., south-east)
    // We only update the *target* the shadow camera looks at.
    // sunLight.position.set(50, 100, 50); // Set initial position

    // Define the shadow update function that will be called in the animation loop
    window.updateDynamicShadows = function(camera, controls, delta) { // Add controls parameter
        if (!scene.userData.shadowHelper || !camera || !controls) return;

        const helper = scene.userData.shadowHelper;
        helper.camera = camera; // Keep camera reference updated

        // --- Target Update ---
        // Target the shadow camera towards the orbit controls target for stability
        const targetPosition = controls.target;
        // Smoothly move the shadow camera target towards the controls target
        helper.targetObject.position.lerp(targetPosition, helper.shadowFollowSpeed);
        // Also update the sun's target explicitly
        helper.sunLight.target = helper.targetObject;


        // --- Frustum Update (Fixed Size) ---
        const shadowSize = helper.shadowCameraSize;
        helper.sunLight.shadow.camera.left = -shadowSize;
        helper.sunLight.shadow.camera.right = shadowSize;
        helper.sunLight.shadow.camera.top = shadowSize;
        helper.sunLight.shadow.camera.bottom = -shadowSize;

        // Ensure the near/far planes are adequate
        helper.sunLight.shadow.camera.near = 10;
        helper.sunLight.shadow.camera.far = 200; // Adjust if needed based on scene scale

        // Update shadow camera projection matrix
        helper.sunLight.shadow.camera.updateProjectionMatrix();

        // --- Sun Position (Optional: Keep it fixed or slightly adjust based on target) ---
        // For stability, let's keep the sun's position relatively fixed,
        // but ensure it stays 'behind' the shadow target to cast shadows correctly.
        // You could lerp it slightly based on the targetObject's position if desired,
        // but keeping it fixed often reduces flickering.
        // Example: Maintain fixed offset from the world origin or the target
        // const sunOffset = new THREE.Vector3(50, 100, 50);
        // helper.sunLight.position.copy(helper.targetObject.position).add(sunOffset);


        // Store last camera position (might not be needed if updating every frame)
        helper.lastCameraPosition.copy(camera.position);
        // helper.lastUpdateTime = performance.now(); // Might not be needed

    };
}