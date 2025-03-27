import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js'; // Import icon function

let droneActive = false;
let droneModel, llmModel;
let droneScene, droneCamera, droneRenderer; // These might not be needed if we overlay on main scene
let droneControls = { forward: false, backward: false, left: false, right: false, up: false, down: false };
let dronePosition = new THREE.Vector3(0, 20, -80); // Start further back and higher up
let droneRotation = new THREE.Euler(0, 0, 0);
let droneSpeed = 0.25;
let droneAnimationId = null;
let originalCameraPosition, originalCameraTarget;
let droneContainer;
let currentLLMTransporting = null; // Keep track of the LLM being transported
let mainCitySceneRef, mainCityCameraRef, mainCityControlsRef; // References to main scene objects

export function activateDroneTransport(llmId) {
    if (droneActive) return;
    
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    currentLLMTransporting = llm; // Store the LLM being transported
    
    console.log(`Activating drone transport for LLM: ${llm.name}`);
    
    // Get references to main city scene objects
    mainCitySceneRef = window.currentHumanoidScene || window.cityScene || window.scene; // Find the main scene
    mainCityCameraRef = window.camera || window.humanoidCamera; // Find the main camera
    mainCityControlsRef = window.controls; // Find the main controls

    if (!mainCitySceneRef || !mainCityCameraRef || !mainCityControlsRef) {
        console.error("Main city scene, camera, or controls not found!");
        return; // Cannot proceed without main scene references
    }

    // Close collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');
    
    // Create drone UI container if it doesn't exist, pass LLM data
    createDroneUI(llm);
    
    // Show the drone UI
    droneContainer.classList.add('active');
    
    // Save original camera position from city scene
    originalCameraPosition = mainCityCameraRef.position.clone();
    originalCameraTarget = mainCityControlsRef.target.clone();
    
    // Disable main controls immediately
    mainCityControlsRef.enabled = false;

    // Initialize drone model and position
    initDroneScene(llm); // This adds the drone to the main scene
    
    // Set up keyboard and touch controls
    setupDroneControls();
    
    // Immediately set camera to drone 3rd person view
    setInitialCameraView();

    droneActive = true;
    // Start animation loop (already called within initDroneScene via animateDrone)
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                     <path d="M12,2C9.8,2,8,3.8,8,6c0,1.1,0.4,2.1,1.2,2.8C7.3,9.5,6,11.4,6,13.5V16c0,1.1,0.9,2,2,2h1v3c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1v-3h1c1.1,0,2-0.9,2-2v-2.5c0-2.1-1.3-4-3.2-4.7C17.6,8.1,18,7.1,18,6C18,3.8,16.2,2,14,2H12z M12,4h2c1.1,0,2,0.9,2,2s-0.9,2-2,2h-2C10.9,8,10,7.1,10,6S10.9,4,12,4z M9,13.5c0-1.4,1.1-2.5,2.5-2.5h3c1.4,0,2.5,1.1,2.5,2.5V16H9V13.5z" fill="currentColor"/>
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
                <p>Use WASD to move horizontally</p>
                <p>Use E/Q to go up/down</p>
                <p>Use arrow keys to rotate</p>
                <p>Press 'P' to place LLM</p>
                <p>Press 'Esc' to cancel</p>
            </div>
            <div class="drone-touch-controls">
                <div class="touch-control-row">
                    <button class="drone-touch-btn" data-control="up">▲</button>
                </div>
                <div class="touch-control-row">
                    <button class="drone-touch-btn" data-control="left">◀</button>
                    <button class="drone-touch-btn" data-control="down">▼</button>
                    <button class="drone-touch-btn" data-control="right">▶</button>
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
    });
}

// New function to handle rotation controls from touch/mouse
function handleRotationControl(control) {
    const rotationAmount = 0.1;
    if (control === 'rotate-left') {
        rotateY(rotationAmount);
    } else if (control === 'rotate-right') {
        rotateY(-rotationAmount);
    }
}

function initDroneScene(llm) {
    // Reset drone position to the defined starting point
    dronePosition = new THREE.Vector3(0, 20, -80); // Ensure consistent starting position

    // Create the drone model and add it to the main scene
    createDroneWithLLM(llm);
    
    // Start animation loop
    animateDrone();
}

function createDroneWithLLM(llm) {
    // Create drone group
    droneModel = new THREE.Group();
    droneModel.name = "DroneWithLLM";
    
    // Create drone body
    const droneBody = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    droneModel.add(droneBody);
    
    // Create propellers
    const propellerPositions = [
        { x: -0.8, y: 0, z: -0.8 },
        { x: 0.8, y: 0, z: -0.8 },
        { x: -0.8, y: 0, z: 0.8 },
        { x: 0.8, y: 0, z: 0.8 }
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
    droneModel.add(llmModel);
    
    // Add to the main city scene using the reference
     if (mainCitySceneRef) {
         // Ensure drone model starts at the correct position
         droneModel.position.copy(dronePosition);
         mainCitySceneRef.add(droneModel);
     } else {
          console.error("Could not find main city scene to add drone to.");
     }
}

// Function to create propeller remains the same
function createPropeller() {
    const propellerGroup = new THREE.Group();
    
    // Propeller hub
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    propellerGroup.add(hub);
    
    // Propeller blades
    const blade1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.05, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    blade1.userData.isPropeller = true;
    propellerGroup.add(blade1);
    
    const blade2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.05, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    blade2.userData.isPropeller = true;
    propellerGroup.add(blade2);
    
    return propellerGroup;
}

function setupDroneControls() {
    // Keyboard controls
    // Remove previous listeners if they exist to avoid duplicates
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(event) {
    if (!droneActive) return;
    
    switch(event.key.toLowerCase()) { // Use lowercase for consistency
        case 'w': droneControls.forward = true; break;
        case 's': droneControls.backward = true; break;
        case 'a': droneControls.left = true; break;
        case 'd': droneControls.right = true; break;
        case 'q': droneControls.down = true; break;
        case 'e': droneControls.up = true; break;
        case 'arrowleft': rotateY(0.1); break;
        case 'arrowright': rotateY(-0.1); break;
        case 'arrowup': rotateX(-0.1); break;
        case 'arrowdown': rotateX(0.1); break;
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

function rotateX(amount) {
    if (droneModel) {
        // Limit pitch rotation to avoid flipping over
        const newRotation = droneModel.rotation.x + amount;
        droneModel.rotation.x = Math.max(-0.3, Math.min(0.3, newRotation));
    }
}

function setInitialCameraView() {
    if (!mainCityCameraRef || !droneModel) return;

    // Calculate initial camera position behind and above the drone
    const offset = new THREE.Vector3(0, 5, 8); // Adjusted offset for 3rd person view
    // Apply drone's *initial* rotation (likely none, but good practice)
    offset.applyEuler(droneModel.rotation);

    const cameraPos = droneModel.position.clone().add(offset);

    // Set camera position directly
    mainCityCameraRef.position.copy(cameraPos);

    // Set camera target to the drone's position
    mainCityCameraRef.lookAt(droneModel.position);

    // Update controls target to match camera's focus (optional but helps consistency)
    if(mainCityControlsRef) {
        mainCityControlsRef.target.copy(droneModel.position);
        mainCityControlsRef.update(); // Important after manual camera/target changes
    }
}

function updateDronePosition() {
    if (!droneModel || !mainCityCameraRef || !mainCityControlsRef) return;
    
    // Define movement vectors
    const moveSpeed = droneSpeed;
    const direction = new THREE.Vector3(0, 0, 0);
    
    // Calculate forward direction based on drone's rotation
    const forwardDir = new THREE.Vector3(0, 0, -1);
    forwardDir.applyEuler(droneModel.rotation);
    
    // Calculate right direction
    const rightDir = new THREE.Vector3(1, 0, 0);
    rightDir.applyEuler(droneModel.rotation);
    
    // Apply controls to direction
    if (droneControls.forward) direction.add(forwardDir);
    if (droneControls.backward) direction.sub(forwardDir);
    if (droneControls.right) direction.add(rightDir);
    if (droneControls.left) direction.sub(rightDir);
    if (droneControls.up) direction.y += 1;
    if (droneControls.down) direction.y -= 1;
    
    // Normalize direction if moving diagonally
    if (direction.length() > 0) direction.normalize();
    
    // Apply movement
    droneModel.position.add(direction.multiplyScalar(moveSpeed));
    
    // Keep drone above ground (adjust based on terrain if needed)
    if (droneModel.position.y < 1.0) {
         droneModel.position.y = 1.0;
     }

    // --- Update Camera Position ---
    // Calculate desired camera position behind and above the drone
    const offset = new THREE.Vector3(0, 5, 8); // Adjusted offset
    offset.applyEuler(droneModel.rotation); // Apply drone's rotation to the offset

    const targetCameraPos = droneModel.position.clone().add(offset);

    // Smoothly move camera to target position using lerp for smoother follow
    mainCityCameraRef.position.lerp(targetCameraPos, 0.08); // Adjust lerp factor (0.05 - 0.1) for desired smoothness

    // Smoothly update the controls target to the drone's position
    mainCityControlsRef.target.lerp(droneModel.position, 0.1);

    // Make the camera look towards the drone's position
    // We don't call lookAt directly inside the loop with lerp,
    // as the controls.update() handles the camera orientation based on target.
    // If not using OrbitControls, you would call: mainCityCameraRef.lookAt(droneModel.position);

    // Update the controls to reflect the new target
    mainCityControlsRef.update(); // Essential for OrbitControls to work with changing target

    // Animate propellers
    droneModel.traverse(child => {
        if (child.userData && child.userData.isPropeller) {
            child.rotation.y += 0.3; // Rotate propellers
        }
    });
}

function animateDrone() {
    if (!droneActive) return;
    
    droneAnimationId = requestAnimationFrame(animateDrone);
    
    updateDronePosition();
    // Note: Rendering is handled by the main city scene's animation loop
}

function landDrone(cancel = false) {
    if (!droneActive) return; // Prevent running multiple times
    droneActive = false;
    
    // Remove event listeners
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    
    // Stop animation
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
    
    // Store the final position before removing the drone
    const finalDronePosition = droneModel ? droneModel.position.clone() : new THREE.Vector3();

    // Remove drone model from the scene
    if (droneModel && droneModel.parent) {
        droneModel.parent.remove(droneModel);
    }
    droneModel = null;
    llmModel = null; // Clear reference to LLM model attached to drone

    // Restore main camera controls and position
    if (mainCityControlsRef) {
        mainCityControlsRef.enabled = true; // Re-enable controls first
        if (originalCameraPosition && originalCameraTarget) {
             // Smoothly transition back to original view instead of snapping
             // This requires adding a temporary transition state in the main loop or using a library like GSAP/Tween.js
             // For simplicity, we'll snap back for now.
             mainCityControlsRef.object.position.copy(originalCameraPosition);
             mainCityControlsRef.target.copy(originalCameraTarget);
             mainCityControlsRef.update();
        } else {
            // Fallback if original positions weren't saved
             mainCityControlsRef.target.set(0, 0, 0);
             mainCityControlsRef.object.position.set(15, 25, 30); // Default position
             mainCityControlsRef.update();
        }
    }

    if (cancel) {
        console.log('Drone transport cancelled');
    } else {
        console.log(`LLM Placed (Attempted) at: ${finalDronePosition.x.toFixed(2)}, ${finalDronePosition.y.toFixed(2)}, ${finalDronePosition.z.toFixed(2)}`);
        // TODO: Implement logic to check if over a valid plot and place the LLM
    }
    
    currentLLMTransporting = null; // Clear the currently transported LLM
    // Clear main scene references
    mainCitySceneRef = null;
    mainCityCameraRef = null;
    mainCityControlsRef = null;
}

// Ensure cleanup on window unload or similar event if needed
window.addEventListener('beforeunload', () => {
    if (droneActive) {
        landDrone(true); // Cancel transport if user leaves page
    }
});