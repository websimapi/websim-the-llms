import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js'; // Import icon function
import { config } from './config.js'; // Import config for potential map size

let droneActive = false;
let droneModel, llmModel;
let droneControls = { forward: false, backward: false, left: false, right: false, up: false, down: false };
let dronePosition = new THREE.Vector3(0, 15, 0); // Initial position, will be updated
let droneRotation = new THREE.Euler(0, 0, 0);
let droneSpeed = 0.5; // Increased speed for testing
let rotationSpeed = 0.03; // Added rotation speed
let droneAnimationId = null;
let originalCameraPosition, originalCameraTarget;
let droneContainer;
let currentLLMTransporting = null; // Keep track of the LLM being transported
let mainCityScene, mainCityCamera, mainCityControls; // References to main scene components

export function activateDroneTransport(llmId) {
    if (droneActive) return;

    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;

    // Get main scene references (assuming they are available globally)
    mainCityScene = window.cityScene; // Assuming cityScene.js exposes 'scene' globally or via a getter
    mainCityCamera = window.camera; // Assuming cityScene.js exposes 'camera' globally
    mainCityControls = window.controls; // Assuming cityScene.js exposes 'controls' globally

    if (!mainCityScene || !mainCityCamera || !mainCityControls) {
         console.error("Main city scene, camera, or controls not found. Cannot activate drone.");
         // Maybe show a user message here
         return;
     }


    currentLLMTransporting = llm; // Store the LLM being transported

    console.log(`Activating drone transport for LLM: ${llm.name}`);

    // Close collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');

    // Create drone UI container if it doesn't exist, pass LLM data
    createDroneUI(llm);

    // Show the drone UI
    droneContainer.classList.add('active');

    // Save original camera position from city scene
    originalCameraPosition = mainCityCamera.position.clone();
    originalCameraTarget = mainCityControls.target.clone();

    // Determine drone starting position (Closer to city center, high up)
    const mapSize = config.citySize || 500; // Use primaryGroundSize from terrain or config
    dronePosition.set(
        0,                      // Center X
        30,                     // Start high up
        (mapSize / 4)           // Start closer to the center (e.g., 1/4 map size away)
    );
    droneRotation.set(0, Math.PI, 0); // Face towards the center of the map (negative Z)

    // Initialize drone model within the main city scene
    initDroneScene(llm);

    // Position the main camera for the 3rd person view immediately
    positionCameraForDroneView(true); // true for instant positioning

    // Set up keyboard and touch controls
    setupDroneControls();

    droneActive = true;
    window.droneActive = true; // Set global flag for cityScene animation loop

    // Disable main orbit controls explicitly
    if(mainCityControls) mainCityControls.enabled = false;
}

function createDroneUI(llm) {
    // Remove existing container if any
    const existingContainer = document.getElementById('drone-transport-ui');
    if (existingContainer) existingContainer.remove();

    // Create container
    droneContainer = document.createElement('div');
    droneContainer.id = 'drone-transport-ui';
    droneContainer.className = 'drone-transport-ui';

    // Get profile image or placeholder SVG
    let profileImageHTML;
    if (llm.profileImageUrl) {
        profileImageHTML = `<img src="${llm.profileImageUrl}" alt="${llm.name}">`;
    } else {
        profileImageHTML = `
            <div class="placeholder-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12,2C9.8,2,8,3.8,8,6c0,1.1,0.4,2.1,1.2,2.8C7.3,9.5,6,11.4,6,13.5V16c0,1.1,0.9,2,2,2h1v3c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1v-3h1c1.1,0,2-0.9,2-2v-2.5c0-2.1-1.3-4-3.2-4.7C17.6,8.1,18,7.1,18,6C18,3.8,16.2,2,14,2H12z M12,4h2c1.1,0,2,0.9,2,2s-0.9,2-2,2h-2C10.9,8,10,7.1,10,6S10.9,4,12,4z M9,13.5c0-1.4,1.1-2.5,2.5-2.5h3c1.4,0,2.5,1.1,2.5,2.5V16H9V13.5z"/>
                 </svg>
            </div>
        `;
    }

    // Get model type icon SVG
    const modelIconSVG = getModelTypeIcon(llm.model); // Use the imported function

    // Add controls info and LLM details
    droneContainer.innerHTML = `
        <div class="drone-controls-info">
            <div class="drone-controls-title">Drone Transport</div>

            <!-- LLM Info Section -->
            <div class="drone-llm-info">
                <div class="drone-llm-profile-image">
                    ${profileImageHTML}
                </div>
                <div class="drone-llm-text-info">
                    <div class="llm-info-name">${llm.name}</div>
                    <div class="llm-info-model-container">
                        <div class="drone-llm-model-icon ${llm.model}">
                           ${modelIconSVG}
                        </div>
                        <span class="llm-info-model">${llm.model}</span>
                        <div class="drone-llm-color-dot" style="background-color: ${llm.color || '#3cb371'};"></div>
                    </div>
                </div>
            </div>

            <div class="drone-instructions">
                <p>Use <strong>WASD</strong> to move horizontally</p>
                <p>Use <strong>E/Q</strong> to go up/down</p>
                <p>Use <strong>←/→</strong> keys to rotate</p>
                <p>Press <strong>'P'</strong> to place LLM</p>
                <p>Press <strong>'Esc'</strong> to cancel</p>
            </div>
            <div class="drone-touch-controls">
                <div class="touch-control-row">
                    <button class="drone-touch-btn" data-control="up">▲</button> <!-- E -->
                     <button class="drone-touch-btn" data-control="forward">↑</button> <!-- W -->
                     <button class="drone-touch-btn" data-control="down">▼</button> <!-- Q -->
                </div>
                <div class="touch-control-row">
                    <button class="drone-touch-btn" data-control="left">←</button> <!-- A -->
                    <button class="drone-touch-btn" data-control="backward">↓</button> <!-- S -->
                    <button class="drone-touch-btn" data-control="right">→</button> <!-- D -->
                </div>
                <div class="touch-control-row">
                     <button class="drone-touch-btn" data-control="rotate-left">↺</button>
                     <button class="drone-touch-btn" data-control="rotate-right">↻</button>
                </div>
            </div>
            <button class="drone-land-btn">Place LLM</button>
        </div>
    `;

    document.body.appendChild(droneContainer);

    // Add event listener for landing button (renamed to place)
    droneContainer.querySelector('.drone-land-btn').addEventListener('click', landDrone);

    // Add event listeners for touch controls
    droneContainer.querySelectorAll('.drone-touch-btn').forEach(btn => {
        const control = btn.getAttribute('data-control');

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling on touch
            if (control.startsWith('rotate')) {
                 handleRotationControl(control);
             } else {
                 droneControls[control] = true;
             }
        });

        btn.addEventListener('touchend', () => {
             if (!control.startsWith('rotate')) {
                 droneControls[control] = false;
             }
        });

        // Mouse events for desktop testing
        btn.addEventListener('mousedown', () => {
             if (control.startsWith('rotate')) {
                 handleRotationControl(control);
             } else {
                 droneControls[control] = true;
             }
        });

        btn.addEventListener('mouseup', () => {
             if (!control.startsWith('rotate')) {
                 droneControls[control] = false;
             }
        });
        btn.addEventListener('mouseleave', () => { // Add mouseleave to stop movement if mouse leaves button while pressed
             if (!control.startsWith('rotate')) {
                 droneControls[control] = false;
             }
         });
    });
}

function handleRotationControl(control) {
    // Use rotationSpeed for consistency
    const rotationAmount = rotationSpeed;
    if (control === 'rotate-left') {
        rotateY(rotationAmount);
    } else if (control === 'rotate-right') {
        rotateY(-rotationAmount);
    }
}

function initDroneScene(llm) {
    // Create the drone model
    createDroneWithLLM(llm);

    // Start animation loop (will control drone and camera)
    animateDrone();
}

function createDroneWithLLM(llm) {
    // Create drone group
    droneModel = new THREE.Group();
    droneModel.name = "DroneWithLLM";

    // Create drone body
    const droneBody = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 }) // Slightly more metallic
    );
    droneBody.castShadow = true;
    droneModel.add(droneBody);

    // Create propellers
    const propellerPositions = [
        { x: -0.8, y: 0.25, z: -0.8 }, // Position slightly above body
        { x: 0.8, y: 0.25, z: -0.8 },
        { x: -0.8, y: 0.25, z: 0.8 },
        { x: 0.8, y: 0.25, z: 0.8 }
    ];

    propellerPositions.forEach(pos => {
        const propeller = createPropeller();
        propeller.position.set(pos.x, pos.y, pos.z);
        droneModel.add(propeller);
    });

    // Create and add the LLM model
    llmModel = renderLLMCharacter(THREE, llm);
    llmModel.scale.set(0.5, 0.5, 0.5); // Make the LLM smaller
    llmModel.position.set(0, -1.5, 0); // Position below the drone
    llmModel.castShadow = true; // LLM should also cast shadow
    droneModel.add(llmModel);

    // Add to the main city scene
    if (mainCityScene) {
        mainCityScene.add(droneModel);
    } else {
         console.error("Main city scene not available when creating drone.");
         return; // Exit if scene isn't ready
    }

    // Position the drone at the calculated starting point
    droneModel.position.copy(dronePosition);
    droneModel.rotation.copy(droneRotation);
}

function createPropeller() {
    const propellerGroup = new THREE.Group();
    propellerGroup.name = "Propeller"; // Give the group a name

    // Propeller hub
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    hub.castShadow = true;
    propellerGroup.add(hub);

    // Propeller blades (Group for easier rotation)
    const blades = new THREE.Group();
    blades.name = "Blades"; // Name the blades group
    propellerGroup.add(blades);

    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.6 }); // Slightly lighter blade color
    const bladeGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.1); // Thinner blades

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.castShadow = true;
    blades.add(blade1); // Add to blades group

    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade2.rotation.y = Math.PI / 2; // Rotate the second blade
    blade2.castShadow = true;
    blades.add(blade2); // Add to blades group

    return propellerGroup;
}

function setupDroneControls() {
    // Keyboard controls
    window.removeEventListener('keydown', handleKeyDown); // Remove previous listeners
    window.removeEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(event) {
    if (!droneActive) return;

    // Prevent default browser behavior for arrow keys, WASD, QE etc.
     if (['w', 's', 'a', 'd', 'q', 'e', 'arrowleft', 'arrowright', 'p', 'escape'].includes(event.key.toLowerCase())) {
         event.preventDefault();
     }


    switch(event.key.toLowerCase()) { // Use lowercase for consistency
        case 'w': droneControls.forward = true; break;
        case 's': droneControls.backward = true; break;
        case 'a': droneControls.left = true; break;
        case 'd': droneControls.right = true; break;
        case 'q': droneControls.down = true; break;
        case 'e': droneControls.up = true; break;
        case 'arrowleft': rotateY(rotationSpeed); break; // Use rotationSpeed
        case 'arrowright': rotateY(-rotationSpeed); break; // Use rotationSpeed
        // Arrow Up/Down for pitch removed for simplicity, could be added back
        case 'p': landDrone(); break; // 'P' to place/land
        case 'escape': landDrone(true); break; // Escape to cancel without placing
    }
}

function handleKeyUp(event) {
    if (!droneActive) return;

    switch(event.key.toLowerCase()) { // Use lowercase for consistency
        case 'w': droneControls.forward = false; break;
        case 's': droneControls.backward = false; break;
        case 'a': droneControls.left = false; break;
        case 'd': droneControls.right = false; break;
        case 'q': droneControls.down = false; break;
        case 'e': droneControls.up = false; break;
    }
}

function rotateY(amount) {
    if (droneModel) {
        droneModel.rotation.y += amount;
    }
}

function updateDronePosition() {
    if (!droneModel || !mainCityCamera || !mainCityControls) return; // Check if main components are available

    // Define movement vectors
    const moveDirection = new THREE.Vector3(0, 0, 0);
    const verticalMovement = new THREE.Vector3(0, 0, 0);

    // Calculate forward direction based on drone's Y rotation ONLY (ignore pitch)
    const forwardDir = new THREE.Vector3(0, 0, -1);
    // Use a temporary quaternion to avoid gimbal lock issues if adding pitch later
    const droneYRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);
    forwardDir.applyQuaternion(droneYRotation);

    // Calculate right direction based on forward direction
    const rightDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardDir).normalize();

    // Apply controls to direction
    if (droneControls.forward) moveDirection.add(forwardDir);
    if (droneControls.backward) moveDirection.sub(forwardDir);
    if (droneControls.right) moveDirection.add(rightDir);
    if (droneControls.left) moveDirection.sub(rightDir);

    // Normalize horizontal movement if needed (prevents faster diagonal movement)
    if (moveDirection.lengthSq() > 0) { // Use lengthSq for performance
        moveDirection.normalize();
    }

    // Apply vertical controls
    if (droneControls.up) verticalMovement.y += 1;
    if (droneControls.down) verticalMovement.y -= 1;

    // Combine movements and apply speed
    const finalMove = new THREE.Vector3()
        .add(moveDirection)
        .add(verticalMovement) // Combine horizontal and vertical
        .multiplyScalar(droneSpeed); // Apply speed AFTER combining

    // Apply movement
    droneModel.position.add(finalMove);

    // Keep drone above ground (consider terrain height later if applicable)
    // Check terrain height dynamically if possible, otherwise use a minimum
    const terrainHeight = 0; // Replace with dynamic check if terrain height varies significantly
    const minHeightAboveTerrain = 1.0;
    if (droneModel.position.y < terrainHeight + minHeightAboveTerrain) {
        droneModel.position.y = terrainHeight + minHeightAboveTerrain;
    }

    // Update camera position to follow drone (3rd person view)
    positionCameraForDroneView();


    // Animate propellers
    droneModel.traverse(child => {
         // Check if the child is the 'Blades' group within a 'Propeller' group
         if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
             child.rotation.y += 0.8; // Rotate the blades group around its Y-axis (increased speed)
         }
     });
}

function positionCameraForDroneView(instant = false) {
     if (!droneModel || !mainCityCamera || !mainCityControls) return;

     // Disable main orbit controls while drone is active (redundant but safe)
     mainCityControls.enabled = false;

     // Calculate desired camera offset (behind and slightly above)
     const offset = new THREE.Vector3(0, 4, 10); // Increased Z distance for better view
     // Apply drone's Y rotation to offset using quaternion
     const droneYRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);
     offset.applyQuaternion(droneYRotation);


     const targetPos = droneModel.position.clone().add(offset);
     const lookAtPos = droneModel.position.clone().add(new THREE.Vector3(0, 0.5, 0)); // Look slightly above the drone center

     const lerpFactor = instant ? 1.0 : 0.1; // Increased lerp factor for tighter follow

     mainCityCamera.position.lerp(targetPos, lerpFactor);
     mainCityControls.target.lerp(lookAtPos, lerpFactor); // Smoothly move orbit controls target

     // Ensure camera looks at the (potentially moving) target
      mainCityCamera.lookAt(mainCityControls.target);
      // No need to call mainCityControls.update() when controls are disabled
}

function animateDrone() {
    if (!droneActive) return;

    droneAnimationId = requestAnimationFrame(animateDrone);

    updateDronePosition();

    // Rendering is handled by the main cityScene loop
}

function landDrone(cancel = false) {
    droneActive = false;
    window.droneActive = false; // Reset global flag

    // Remove event listeners
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);

    // Stop animation loop for the drone itself
    if (droneAnimationId) {
        cancelAnimationFrame(droneAnimationId);
        droneAnimationId = null;
    }

    // Hide drone UI
    if (droneContainer) {
        droneContainer.classList.remove('active');
        // Optionally remove the container from DOM after a delay
        setTimeout(() => {
            if (droneContainer && droneContainer.parentNode) {
                droneContainer.parentNode.removeChild(droneContainer);
            }
            droneContainer = null;
        }, 500);
    }

    // Store drone's final position before removing
    const finalDronePosition = droneModel ? droneModel.position.clone() : new THREE.Vector3();

    // Remove drone model from the scene
    if (droneModel && droneModel.parent) {
        droneModel.parent.remove(droneModel);
    }
    droneModel = null;
    llmModel = null; // Clear reference to LLM model attached to drone

    // Restore main camera controls and position
     if (mainCityControls) {
         // Re-enable controls first
         mainCityControls.enabled = true;

         if (originalCameraPosition && originalCameraTarget) {
             // Smoothly transition back to original camera position/target
             const transitionDuration = 800; // Faster transition back
             const startTime = Date.now();

             function transitionBack() {
                 if (!mainCityControls.enabled) return; // Exit if controls got disabled again

                 const elapsed = Date.now() - startTime;
                 const progress = Math.min(elapsed / transitionDuration, 1);
                 const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                 mainCityCamera.position.lerpVectors(mainCityCamera.position, originalCameraPosition, easeProgress * 0.15); // Slightly faster LERP back
                 mainCityControls.target.lerpVectors(mainCityControls.target, originalCameraTarget, easeProgress * 0.15);
                 // No need to call lookAt here if controls.update() handles it
                 mainCityControls.update();


                 if (progress < 1) {
                     requestAnimationFrame(transitionBack);
                 } else {
                      // Ensure final position/target are set exactly
                      mainCityCamera.position.copy(originalCameraPosition);
                      mainCityControls.target.copy(originalCameraTarget);
                      mainCityControls.update();
                      console.log("Camera restored to original state.");
                 }
             }
             // Start the transition only if controls are meant to be enabled
              requestAnimationFrame(transitionBack);


         } else {
             // Fallback if original positions weren't saved
             mainCityControls.target.set(0,0,0);
             mainCityControls.update();
             console.warn("Original camera state not found, resetting target.");
         }
     }


    if (cancel) {
        console.log('Drone transport cancelled');
        // Optionally, maybe move the LLM back to the collection 'origin' visually?
    } else {
        console.log('LLM Placed (logic to be implemented)');
         console.log(`Attempting to place LLM ID ${currentLLMTransporting?.id} at: X=${finalDronePosition.x.toFixed(2)}, Y=${finalDronePosition.y.toFixed(2)}, Z=${finalDronePosition.z.toFixed(2)}`);
         // TODO: Implement logic to check if over a valid plot and place the LLM
         // 1. Raycast down from finalDronePosition
         // 2. Check if hit object is a valid, available plot
         // 3. If yes, create the LLM model at that plot location in the main scene
         // 4. Update plot data (e.g., mark as occupied)
         // 5. Update cityData/llmDataManager if necessary
    }

    currentLLMTransporting = null; // Clear the currently transported LLM
}