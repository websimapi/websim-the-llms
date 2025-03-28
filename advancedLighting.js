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
        movementThreshold: 10, // Increased from 5 to 10 units of movement before shadow gets updated
        updateInterval: 500, // Increased from 100 to 500 milliseconds between forced updates
        lastUpdateTime: 0,
        transitionInProgress: false
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
        
        // Only update if movement threshold exceeded or time interval passed, and no transition in progress
        if ((cameraMovement > helper.movementThreshold || timeSinceUpdate > helper.updateInterval) 
            && !helper.transitionInProgress) {
            
            helper.transitionInProgress = true;
            
            // Calculate target point - average of camera position and look target
            const cameraTarget = new THREE.Vector3();
            camera.getWorldDirection(cameraTarget);
            cameraTarget.multiplyScalar(30).add(camera.position); // Look 30 units ahead
            
            // Store initial values for smooth transition
            const initialTarget = helper.targetObject.position.clone();
            const initialSunPosition = helper.sunLight.position.clone();
            
            // Calculate final shadow camera values
            const finalShadowTarget = new THREE.Vector3().copy(cameraTarget);
            const height = Math.max(20, camera.position.y * 1.5);
            const shadowSize = Math.max(40, height * 1.5);
            
            // Position the sun light relative to the camera but maintain height and angle
            const finalSunPosition = new THREE.Vector3(
                camera.position.x + 50, 
                100, // Keep consistent height
                camera.position.z + 50
            );
            
            // Update shadow camera size immediately to prevent size flashing
            helper.sunLight.shadow.camera.left = -shadowSize;
            helper.sunLight.shadow.camera.right = shadowSize;
            helper.sunLight.shadow.camera.top = shadowSize;
            helper.sunLight.shadow.camera.bottom = -shadowSize;
            helper.sunLight.shadow.camera.updateProjectionMatrix();
            
            // Perform smooth transition for position
            const transitionDuration = 300; // 300ms transition
            const startTime = now;
            
            function performTransition() {
                const elapsedTime = performance.now() - startTime;
                const progress = Math.min(elapsedTime / transitionDuration, 1);
                
                // Use cubic ease out for smooth transition
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Smoothly interpolate positions
                helper.targetObject.position.lerpVectors(initialTarget, finalShadowTarget, easedProgress);
                helper.sunLight.position.lerpVectors(initialSunPosition, finalSunPosition, easedProgress);
                
                // Update shadow camera
                helper.sunLight.shadow.camera.updateProjectionMatrix();
                
                if (progress < 1) {
                    // Continue transition
                    requestAnimationFrame(performTransition);
                } else {
                    // Transition complete
                    helper.lastCameraPosition.copy(camera.position);
                    helper.lastUpdateTime = performance.now();
                    helper.transitionInProgress = false;
                }
            }
            
            // Start transition
            performTransition();
        }
    };
}