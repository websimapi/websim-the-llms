import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js'; // Import icon function
import { config } from './config.js'; // Import config for potential map size
import { cityData } from './cityData.js';

let droneActive = false;
let droneModel, llmModel;
let droneControls = { forward: false, backward: false, left: false, right: false, up: false, down: false, rotateLeft: false, rotateRight: false };
let droneVelocity = new THREE.Vector3(); // Add velocity for smoother movement
const droneAcceleration = 0.05; // How quickly the drone speeds up
const droneDeceleration = 0.95; // How quickly the drone slows down (friction)
const maxSpeed = 1.0; // Maximum horizontal speed
const verticalSpeed = 0.4; // Constant vertical speed
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
     const rotationAmount = rotationSpeed * 3; // Make touch rotation a bit faster maybe
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

    // Reset controls object on setup
    droneControls = { forward: false, backward: false, left: false, right: false, up: false, down: false, rotateLeft: false, rotateRight: false };
    droneVelocity.set(0, 0, 0); // Reset velocity
}

function handleKeyDown(event) {
    if (!droneActive) return;

    // Prevent default browser behavior for control keys
     const controlKeys = ['w', 's', 'a', 'd', 'q', 'e', 'arrowleft', 'arrowright', 'p', 'escape'];
     if (controlKeys.includes(event.key.toLowerCase())) {
         event.preventDefault();
     }

    switch(event.key.toLowerCase()) { // Use lowercase for consistency
        case 'w': droneControls.forward = true; break;
        case 's': droneControls.backward = true; break;
        case 'a': droneControls.left = true; break;
        case 'd': droneControls.right = true; break;
        case 'q': droneControls.down = true; break;
        case 'e': droneControls.up = true; break;
        case 'arrowleft': droneControls.rotateLeft = true; break;
        case 'arrowright': droneControls.rotateRight = true; break;
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
        case 'arrowleft': droneControls.rotateLeft = false; break;
        case 'arrowright': droneControls.rotateRight = false; break;
    }
}

function rotateY(amount) {
    if (droneModel) {
        droneModel.rotation.y += amount;
    }
}

function updateDronePosition() {
    if (!droneModel || !mainCityCamera || !mainCityControls) return; // Check if main components are available

    // --- Rotation ---
    if (droneControls.rotateLeft) rotateY(rotationSpeed);
    if (droneControls.rotateRight) rotateY(-rotationSpeed);

    // --- Movement ---
    const forwardDir = new THREE.Vector3(0, 0, -1);
    const rightDir = new THREE.Vector3(1, 0, 0);

    // Apply drone's rotation to direction vectors
    const droneQuaternion = new THREE.Quaternion().setFromEuler(droneModel.rotation);
    forwardDir.applyQuaternion(droneQuaternion);
    rightDir.applyQuaternion(droneQuaternion);

    // Calculate target acceleration based on controls
    const targetAcceleration = new THREE.Vector3();
    if (droneControls.forward) targetAcceleration.add(forwardDir);
    if (droneControls.backward) targetAcceleration.sub(forwardDir);
    if (droneControls.right) targetAcceleration.add(rightDir);
    if (droneControls.left) targetAcceleration.sub(rightDir);

    // Normalize if diagonal movement, then apply acceleration magnitude
    if (targetAcceleration.lengthSq() > 0) {
        targetAcceleration.normalize().multiplyScalar(droneAcceleration);
    }

    // Apply acceleration to velocity
    droneVelocity.add(targetAcceleration);

    // Apply deceleration (friction)
    droneVelocity.multiplyScalar(droneDeceleration);

    // Clamp velocity to max speed
    if (droneVelocity.length() > maxSpeed) {
        droneVelocity.normalize().multiplyScalar(maxSpeed);
    }

    // Stop small movements (drift)
    if (droneVelocity.lengthSq() < 0.001) {
        droneVelocity.set(0, 0, 0);
    }

    // Apply horizontal velocity to position
    droneModel.position.add(droneVelocity);

    // Apply vertical movement directly (constant speed)
    let verticalMove = 0;
    if (droneControls.up) verticalMove += verticalSpeed;
    if (droneControls.down) verticalMove -= verticalSpeed;
    droneModel.position.y += verticalMove;

    // --- Height Clamping ---
    const terrainHeight = 0; // TODO: Replace with dynamic check if terrain height varies
    const minHeightAboveTerrain = 1.0;
    if (droneModel.position.y < terrainHeight + minHeightAboveTerrain) {
        droneModel.position.y = terrainHeight + minHeightAboveTerrain;
    }
    // Optional: Add max height?
    // const maxHeight = 100;
    // if (droneModel.position.y > maxHeight) {
    //     droneModel.position.y = maxHeight;
    // }

    // --- Update Camera ---
    positionCameraForDroneView();

    // --- Animate Propellers ---
    droneModel.traverse(child => {
         if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
             child.rotation.y += 0.8 + droneVelocity.length() * 2; // Spin faster based on speed
         }
     });
}

function positionCameraForDroneView(instant = false) {
     if (!droneModel || !mainCityCamera || !mainCityControls) return;

     mainCityControls.enabled = false; // Ensure controls stay disabled

     // Calculate desired camera offset (behind and slightly above)
     const offset = new THREE.Vector3(0, 5, 12); // Adjusted offset
     // Apply drone's Y rotation to offset using quaternion
     const droneQuaternion = new THREE.Quaternion().setFromEuler(droneModel.rotation);
     offset.applyQuaternion(droneQuaternion);

     const targetCameraPos = droneModel.position.clone().add(offset);
     const targetLookAtPos = droneModel.position.clone().add(new THREE.Vector3(0, 1, 0)); // Look slightly above the drone center

     const lerpFactor = instant ? 1.0 : 0.1; // Keep lerp for smooth follow

     mainCityCamera.position.lerp(targetCameraPos, lerpFactor);
     // Lerp the controls target instead of directly setting lookAt for smoother OrbitControls interaction when re-enabled
     mainCityControls.target.lerp(targetLookAtPos, lerpFactor);

     // Update the camera's lookAt AFTER updating the target
     mainCityCamera.lookAt(mainCityControls.target);
     // Controls are disabled, so no need to call update()
}

function animateDrone() {
    if (!droneActive) return;

    droneAnimationId = requestAnimationFrame(animateDrone);

    updateDronePosition();

    // Rendering is handled by the main cityScene loop
}

function landDrone(cancel = false) {
    if (!droneActive) return; // Prevent multiple calls

    droneActive = false;
    window.droneActive = false; // Reset global flag

    // Remove event listeners immediately
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
         if (originalCameraPosition && originalCameraTarget) {
             // Smoothly transition back to original camera position/target
             const transitionDuration = 800; // Faster transition back
             const startTime = Date.now();

             function transitionBack() {
                 // Stop if drone mode reactivated somehow
                 if (window.droneActive) return;

                 const elapsed = Date.now() - startTime;
                 const progress = Math.min(elapsed / transitionDuration, 1);
                 const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                 // Use smaller LERP steps for smoother transition back
                 mainCityCamera.position.lerp(originalCameraPosition, easeProgress * 0.1);
                 mainCityControls.target.lerp(originalCameraTarget, easeProgress * 0.1);
                 mainCityCamera.lookAt(mainCityControls.target); // Keep looking at the target


                 if (progress < 1) {
                     requestAnimationFrame(transitionBack);
                 } else {
                      // Ensure final position/target are set exactly and re-enable controls
                      mainCityCamera.position.copy(originalCameraPosition);
                      mainCityControls.target.copy(originalCameraTarget);
                      mainCityControls.enabled = true; // Re-enable controls AFTER transition
                      mainCityControls.update(); // Update controls once enabled
                      console.log("Camera restored and controls re-enabled.");
                 }
             }
              requestAnimationFrame(transitionBack);
         } else {
             // Fallback if original positions weren't saved
             mainCityControls.target.set(0,0,0);
             mainCityControls.enabled = true; // Re-enable controls
             mainCityControls.update();
             console.warn("Original camera state not found, resetting target.");
         }
     }

    if (cancel) {
        console.log('Drone transport cancelled');
        // Re-open collection view maybe?
         import('./llmCollectionView.js').then(module => {
             module.setupLLMCollectionView(currentLLMTransporting?.id); // Re-select the LLM
         });
    } else {
        console.log('Attempting to place LLM');
        placeLLMAtLocation(finalDronePosition);
    }

    currentLLMTransporting = null; // Clear the currently transported LLM
}

function placeLLMAtLocation(position) {
    console.log(`Attempting to place LLM ID ${currentLLMTransporting?.id} at: X=${position.x.toFixed(2)}, Y=${position.y.toFixed(2)}, Z=${position.z.toFixed(2)}`);

    if (!currentLLMTransporting || !mainCityScene) {
        console.error("No LLM or scene available for placement.");
        return;
    }

    // 1. Raycast down from drone's final position
    const raycaster = new THREE.Raycaster(
        position,                   // Start slightly above the drone's final Y
        new THREE.Vector3(0, -1, 0) // Direction downwards
    );

    // Collect potential targets (plots, terrain)
    const targets = [];
    mainCityScene.traverse(child => {
        // Target plot outlines or the primary ground plane
        if ((child.userData && child.userData.type === 'lot') || child === window.primaryGround) { // Assuming primaryGround is exposed
            targets.push(child);
        }
    });

    const intersects = raycaster.intersectObjects(targets, true); // Check recursively

    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        let hitObject = intersects[0].object;

        // Traverse up to find the actual plot group if a child was hit
        while (hitObject && (!hitObject.userData || hitObject.userData.type !== 'lot')) {
            if (hitObject === window.primaryGround) break; // Stop if we hit the ground plane
            hitObject = hitObject.parent;
             if (!hitObject || hitObject === mainCityScene) { // Stop if we reach the scene root
                 hitObject = null;
                 break;
             }
        }

        if (hitObject && hitObject.userData && hitObject.userData.type === 'lot') {
            // Hit a plot!
            const plotId = hitObject.userData.id;
            const plotData = cityData.lots.find(lot => lot.id === plotId);

            if (plotData && plotData.available) {
                console.log(`Placing LLM ${currentLLMTransporting.name} on Plot ${plotData.name} (ID: ${plotId})`);

                // Remove construction elements from the plot
                mainCityScene.remove(hitObject);

                // TODO: Create the actual building/structure on the plot using the LLM
                // This could involve creating a new 3D model representing the building
                // For now, just place the LLM model itself
                const placedLLM = renderLLMCharacter(THREE, currentLLMTransporting);
                placedLLM.position.copy(hitPoint); // Place at the hit point on the plot
                 // Adjust Y position slightly based on LLM model size if needed
                 const box = new THREE.Box3().setFromObject(placedLLM);
                 const height = box.max.y - box.min.y;
                 placedLLM.position.y = hitPoint.y + height / 2; // Position base at hit point


                mainCityScene.add(placedLLM);

                // Mark the plot as unavailable in cityData
                plotData.available = false;
                // TODO: Potentially associate the LLM ID with the plot

                // Optional: Remove LLM from collection? Or just mark as deployed?
                // llmDataManager.deleteLLM(currentLLMTransporting.id); // Or update status

                console.log("LLM placed successfully.");

            } else if (plotData) {
                console.warn(`Plot ${plotData.name} is already occupied.`);
                // Show feedback to user?
                alert(`Plot ${plotData.name} is already occupied!`);
                landDrone(true); // Cancel the placement
            } else {
                console.warn(`Plot data not found for ID: ${plotId}`);
                 alert(`Plot data not found. Cannot place LLM.`);
                 landDrone(true); // Cancel the placement
            }
        } else {
            // Hit the ground or something else
            console.warn("Cannot place LLM here. Must be placed on an available plot.");
             alert("Cannot place LLM here. Aim for an available plot outline.");
             landDrone(true); // Cancel the placement
        }
    } else {
        console.warn("No valid placement location found below the drone.");
         alert("No valid placement location found below. Fly lower or over a plot.");
         landDrone(true); // Cancel the placement
    }
}