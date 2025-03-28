import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js'; // Import icon function
import { config } from './config.js'; // Import config for potential map size
import { showConfirmationModal } from './confirmationModal.js'; // Import confirmation modal

// --- State Variables ---
let droneActive = false;
let droneModel, llmModel;
let dronePosition = new THREE.Vector3(0, 15, 0); // Current position
let droneRotation = new THREE.Euler(0, 0, 0); // Current rotation
let droneVelocity = new THREE.Vector3(); // Current velocity
let droneAngularVelocity = new THREE.Euler(); // Current angular velocity
let droneAnimationId = null;
let droneContainer;
let currentLLMTransporting = null;
let mainCityScene, mainCityCamera, mainCityControls;
let originalCameraPosition, originalCameraTarget;

// --- Constants ---
const MAX_SPEED = 0.25;
const ACCELERATION = 0.02;
const DECELERATION = 0.95; // Multiplier for damping
const ROTATION_SPEED = 0.01;
const MAX_ROTATION_SPEED = 0.05;
const ROTATION_DAMPING = 0.90;
const VERTICAL_SPEED = 0.15;
const MIN_ALTITUDE = 1.0;
const PLACEMENT_RAY_DISTANCE = 50; // How far down to check for a plot
const CAMERA_FOLLOW_DISTANCE = 8;
const CAMERA_FOLLOW_HEIGHT = 4;
const CAMERA_LERP_FACTOR = 0.05;

// --- Control State ---
let droneControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateLeft: false,
    rotateRight: false,
};
let touchActiveControls = {}; // Track active touch controls

// --- Public Functions ---

export function activateDroneTransport(llmId) {
    if (droneActive) return;

    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;

    mainCityScene = window.cityScene;
    mainCityCamera = window.camera;
    mainCityControls = window.controls;

    if (!mainCityScene || !mainCityCamera || !mainCityControls) {
        console.error("Main city scene, camera, or controls not found. Cannot activate drone.");
        return;
    }

    currentLLMTransporting = llm;
    console.log(`Activating drone transport for LLM: ${llm.name}`);

    // Ensure collection UI is hidden
    const collectionUI = document.getElementById('llm-collection-ui');
    if (collectionUI) collectionUI.classList.remove('active');

    createDroneUI(llm);
    droneContainer.classList.add('active');

    originalCameraPosition = mainCityCamera.position.clone();
    originalCameraTarget = mainCityControls.target.clone();

    const mapSize = config.citySize || 500;
    dronePosition.set(0, 50, mapSize / 2 - 10);
    droneRotation.set(0, Math.PI, 0);
    droneVelocity.set(0, 0, 0);
    droneAngularVelocity.set(0, 0, 0);
    resetControlState();

    initDroneScene(llm);
    positionCameraForDroneView(true); // Instant positioning

    setupInputListeners(); // Setup keyboard/touch

    droneActive = true;
    window.droneActive = true; // Set global flag

    animateDrone(); // Start the dedicated drone animation loop
}

// --- Initialization Functions ---

function createDroneUI(llm) {
    const existingContainer = document.getElementById('drone-transport-ui');
    if (existingContainer) existingContainer.remove();

    droneContainer = document.createElement('div');
    droneContainer.id = 'drone-transport-ui';
    droneContainer.className = 'drone-transport-ui';

    let profileImageHTML;
    if (llm.profileImageUrl) {
        profileImageHTML = `<img src="${llm.profileImageUrl}" alt="${llm.name}">`;
    } else {
        profileImageHTML = `<div class="placeholder-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2C9.8,2,8,3.8,8,6c0,1.1,0.4,2.1,1.2,2.8C7.3,9.5,6,11.4,6,13.5V16c0,1.1,0.9,2,2,2h1v3c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1v-3h1c1.1,0,2-0.9,2-2v-2.5c0-2.1-1.3-4-3.2-4.7C17.6,8.1,18,7.1,18,6C18,3.8,16.2,2,14,2H12z M12,4h2c1.1,0,2,0.9,2,2s-0.9,2-2,2h-2C10.9,8,10,7.1,10,6S10.9,4,12,4z M9,13.5c0-1.4,1.1-2.5,2.5-2.5h3c1.4,0,2.5,1.1,2.5,2.5V16H9V13.5z" fill="currentColor"/></svg></div>`;
    }
    const modelIconSVG = getModelTypeIcon(llm.model);

    droneContainer.innerHTML = `
        <div class="drone-controls-info">
            <div class="drone-controls-title">Drone Transport</div>
            <div class="drone-llm-info">
                <div class="drone-llm-profile-image">${profileImageHTML}</div>
                <div class="drone-llm-text-info">
                    <div class="llm-info-name">${llm.name}</div>
                    <div class="llm-info-model-container">
                        <div class="drone-llm-model-icon ${llm.model}">${modelIconSVG}</div>
                        <span class="llm-info-model">${llm.model}</span>
                        <div class="drone-llm-color-dot" style="background-color: ${llm.color || '#3cb371'};"></div>
                    </div>
                </div>
            </div>
            <div class="drone-instructions">
                <p>Use <strong>WASD</strong> to move horizontally</p>
                <p>Use <strong>E/Q</strong> to go up/down</p>
                <p>Use <strong>←/→</strong> keys to rotate</p>
                <p>Press <strong>P</strong> to place LLM</p>
                <p>Press <strong>Esc</strong> to cancel</p>
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
                     <button class="drone-touch-btn" data-control="rotateLeft">↺</button>
                     <button class="drone-touch-btn" data-control="rotateRight">↻</button>
                </div>
            </div>
            <button class="drone-land-btn">Place LLM</button>
        </div>
    `;
    document.body.appendChild(droneContainer);
}

function initDroneScene(llm) {
    createDroneWithLLM(llm);
}

function createDroneWithLLM(llm) {
    droneModel = new THREE.Group();
    droneModel.name = "DroneWithLLM";

    const droneBody = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 })
    );
    droneBody.castShadow = true;
    droneModel.add(droneBody);

    const propellerPositions = [
        { x: -0.8, y: 0.25, z: -0.8 }, { x: 0.8, y: 0.25, z: -0.8 },
        { x: -0.8, y: 0.25, z: 0.8 }, { x: 0.8, y: 0.25, z: 0.8 }
    ];
    propellerPositions.forEach(pos => {
        const propeller = createPropeller();
        propeller.position.set(pos.x, pos.y, pos.z);
        droneModel.add(propeller);
    });

    llmModel = renderLLMCharacter(THREE, llm);
    llmModel.scale.set(0.5, 0.5, 0.5);
    llmModel.position.set(0, -1.5, 0);
    llmModel.castShadow = true;
    droneModel.add(llmModel);

    if (mainCityScene) {
        mainCityScene.add(droneModel);
        droneModel.position.copy(dronePosition);
        droneModel.rotation.copy(droneRotation);
    } else {
        console.error("Main city scene not available when creating drone.");
    }
}

function createPropeller() {
    const propellerGroup = new THREE.Group();
    propellerGroup.name = "Propeller";

    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    hub.castShadow = true;
    propellerGroup.add(hub);

    const blades = new THREE.Group();
    blades.name = "Blades";
    propellerGroup.add(blades);

    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.6 });
    const bladeGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.1);
    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.castShadow = true;
    blades.add(blade1);
    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade2.rotation.y = Math.PI / 2;
    blade2.castShadow = true;
    blades.add(blade2);

    return propellerGroup;
}

// --- Control Input Handling ---

function setupInputListeners() {
    resetControlState();
    // Keyboard
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Touch (via UI buttons)
    setupTouchButtonListeners();
    // Place button
    const landButton = droneContainer.querySelector('.drone-land-btn');
    if(landButton) landButton.addEventListener('click', handlePlaceAttempt);
}

function removeInputListeners() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    // Touch listeners are implicitly removed when the UI is destroyed
    const landButton = droneContainer?.querySelector('.drone-land-btn');
    if(landButton) landButton.removeEventListener('click', handlePlaceAttempt);
}

function resetControlState() {
    for (const key in droneControls) {
        droneControls[key] = false;
    }
    touchActiveControls = {};
}

function handleKeyDown(event) {
    if (!droneActive) return;
    // Ignore input if confirmation modal is active
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal && confirmationModal.classList.contains('active')) return;

    const key = event.key.toLowerCase();
    let handled = true;

    switch (key) {
        case 'w': droneControls.forward = true; break;
        case 's': droneControls.backward = true; break;
        case 'a': droneControls.left = true; break;
        case 'd': droneControls.right = true; break;
        case 'q': droneControls.down = true; break;
        case 'e': droneControls.up = true; break;
        case 'arrowleft': droneControls.rotateLeft = true; break;
        case 'arrowright': droneControls.rotateRight = true; break;
        case 'p': handlePlaceAttempt(); break; // Added 'p' key listener
        case 'escape': deactivateDroneTransport(true); break; // Cancel
        default: handled = false;
    }
    if (handled) event.preventDefault();
}

function handleKeyUp(event) {
    if (!droneActive) return;
    const key = event.key.toLowerCase();
    switch (key) {
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

function setupTouchButtonListeners() {
    droneContainer.querySelectorAll('.drone-touch-btn').forEach(btn => {
        const control = btn.getAttribute('data-control');
        btn.addEventListener('touchstart', (e) => handleTouchStart(e, control));
        btn.addEventListener('touchend', (e) => handleTouchEnd(e, control));
        // Mouse fallback for testing
        btn.addEventListener('mousedown', (e) => handleTouchStart(e, control));
        btn.addEventListener('mouseup', (e) => handleTouchEnd(e, control));
        btn.addEventListener('mouseleave', (e) => handleTouchEnd(e, control)); // Handle leaving button
    });
}

function handleTouchStart(event, control) {
    event.preventDefault();
    droneControls[control] = true;
    touchActiveControls[control] = true; // Mark as active by touch
}

function handleTouchEnd(event, control) {
    event.preventDefault();
    // Only deactivate if it was activated by touch (prevents interference with keyboard)
    if (touchActiveControls[control]) {
        droneControls[control] = false;
        delete touchActiveControls[control];
    }
}

// --- Movement & Update Logic ---

function updateDronePhysics() {
    if (!droneModel) return;

    // --- Rotation ---
    let targetRotationY = 0;
    if (droneControls.rotateLeft) targetRotationY += ROTATION_SPEED;
    if (droneControls.rotateRight) targetRotationY -= ROTATION_SPEED;

    // Apply angular velocity and damping
    droneAngularVelocity.y += targetRotationY;
    droneAngularVelocity.y *= ROTATION_DAMPING;
    droneAngularVelocity.y = THREE.MathUtils.clamp(droneAngularVelocity.y, -MAX_ROTATION_SPEED, MAX_ROTATION_SPEED);
    droneModel.rotation.y += droneAngularVelocity.y;

    // --- Translation ---
    const forwardVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);
    const rightVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);

    let targetVelocity = new THREE.Vector3();
    if (droneControls.forward) targetVelocity.add(forwardVector);
    if (droneControls.backward) targetVelocity.sub(forwardVector);
    if (droneControls.left) targetVelocity.sub(rightVector);
    if (droneControls.right) targetVelocity.add(rightVector);

    // Normalize horizontal movement if needed
    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize();
    }

    // Apply vertical movement
    let verticalVelocity = 0;
    if (droneControls.up) verticalVelocity += VERTICAL_SPEED;
    if (droneControls.down) verticalVelocity -= VERTICAL_SPEED;

    // Accelerate towards target velocity
    droneVelocity.x += (targetVelocity.x * MAX_SPEED - droneVelocity.x) * ACCELERATION;
    droneVelocity.z += (targetVelocity.z * MAX_SPEED - droneVelocity.z) * ACCELERATION;
    droneVelocity.y += (verticalVelocity - droneVelocity.y) * ACCELERATION; // Vertical acceleration

    // Apply damping (friction)
    droneVelocity.x *= DECELERATION;
    droneVelocity.z *= DECELERATION;
    droneVelocity.y *= DECELERATION; // Damp vertical velocity too

    // Clamp speed
    const currentSpeedSq = droneVelocity.x * droneVelocity.x + droneVelocity.z * droneVelocity.z;
    if (currentSpeedSq > MAX_SPEED * MAX_SPEED) {
        const scale = MAX_SPEED / Math.sqrt(currentSpeedSq);
        droneVelocity.x *= scale;
        droneVelocity.z *= scale;
    }

    // Apply final velocity to position
    droneModel.position.add(droneVelocity);

    // Enforce altitude constraint
    if (droneModel.position.y < MIN_ALTITUDE) {
        droneModel.position.y = MIN_ALTITUDE;
        droneVelocity.y = Math.max(0, droneVelocity.y); // Stop downward velocity if hitting floor
    }

    // Animate propellers based on vertical thrust/movement
    const propellerSpeed = 0.5 + Math.abs(droneVelocity.y) * 5 + (droneVelocity.lengthSq() * 2); // Base speed + vertical + horizontal
    droneModel.traverse(child => {
        if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
            child.rotation.y += propellerSpeed;
        }
    });
}

function positionCameraForDroneView(instant = false) {
    if (!droneModel || !mainCityCamera || !mainCityControls) return;

    mainCityControls.enabled = false; // Ensure controls remain disabled

    const offset = new THREE.Vector3(0, CAMERA_FOLLOW_HEIGHT, CAMERA_FOLLOW_DISTANCE);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);

    const targetCamPos = droneModel.position.clone().add(offset);
    const targetLookAt = droneModel.position.clone().add(new THREE.Vector3(0, 0.5, 0)); // Look slightly above drone center

    if (instant) {
        mainCityCamera.position.copy(targetCamPos);
        mainCityControls.target.copy(targetLookAt); // Important: Update OrbitControls target
    } else {
        mainCityCamera.position.lerp(targetCamPos, CAMERA_LERP_FACTOR);
        mainCityControls.target.lerp(targetLookAt, CAMERA_LERP_FACTOR); // Lerp the target as well
    }
    mainCityCamera.lookAt(mainCityControls.target); // Always look at the (potentially lerped) target
    mainCityControls.update(); // Update controls state
}

// --- Animation Loop ---

function animateDrone() {
    if (!droneActive) return;
    droneAnimationId = requestAnimationFrame(animateDrone);

    updateDronePhysics();
    positionCameraForDroneView(); // Update camera smoothly

    // Rendering is handled by the main cityScene loop
}

// --- Placement & Deactivation ---

function handlePlaceAttempt() {
    if (!droneActive || !droneModel) return;

    // Raycast downwards from drone position
    const raycaster = new THREE.Raycaster(
        droneModel.position, // Start slightly above drone center
        new THREE.Vector3(0, -1, 0), // Direction downwards
        0, // Near plane (start immediately below)
        PLACEMENT_RAY_DISTANCE // Max distance to check
    );

    // Ensure plot outlines are included in the raycast targets
    const objectsToCheck = [];
    mainCityScene.traverse(obj => {
        // Include both the plot outlines and the ground/other terrain
        if (obj.userData?.type === 'lot' || obj.name === 'primaryGround' || obj.name === 'distantTerrain' || obj.name === 'horizonTerrain') {
            objectsToCheck.push(obj);
        }
    });

    const intersects = raycaster.intersectObjects(objectsToCheck, true); // Check recursively

    let targetPlotData = null;
    let intersectedPlotObject = null;

    for (const intersect of intersects) {
        let obj = intersect.object;
        // Traverse up to find the actual plot object group
        while (obj && (!obj.userData || obj.userData.type !== 'lot')) {
            if (obj === mainCityScene) break; // Stop if we reach the scene root
            obj = obj.parent;
        }
        if (obj && obj.userData && obj.userData.type === 'lot') {
            // Import cityData dynamically or ensure it's available globally
            import('./cityData.js').then(module => {
                const cityData = module.cityData;
                const plotData = cityData.lots.find(lot => lot.id === obj.userData.id);
                if (plotData) {
                    targetPlotData = plotData;
                    intersectedPlotObject = obj; // Store the intersected THREE object
                }
            }).catch(err => console.error("Error importing cityData:", err));
            break; // Found the first plot, stop checking
        }
    }

    if (targetPlotData) {
         if (targetPlotData.available) {
             // Confirm placement with the user
             const message = `Place ${currentLLMTransporting.name} on ${targetPlotData.name}?`;
             showConfirmationModal(message,
                 () => { // onConfirm
                     console.log(`Confirmed placement of LLM ${currentLLMTransporting.name} on plot ${targetPlotData.name}`);
                     placeLLMOnPlot(targetPlotData, intersectedPlotObject);
                     deactivateDroneTransport(false); // Deactivate after successful placement
                 },
                 () => { // onCancel
                     console.log(`Placement cancelled by user.`);
                 }
             );
         } else {
              console.log(`Plot ${targetPlotData.name} is already occupied.`);
              // TODO: Optionally provide user feedback (e.g., flash UI red)
              flashUIElement('.drone-controls-info', 'error');
         }
    } else {
        console.log("Not hovering over a valid plot or too high.");
        // TODO: Optionally provide user feedback
        flashUIElement('.drone-controls-info', 'warn');
    }
}

// Flash UI element border color
function flashUIElement(selector, type = 'error', duration = 500) {
    const element = document.querySelector(selector);
    if (!element) return;
    const originalBorder = element.style.borderColor;
    let flashColor = '#ff4444'; // Default error
    if (type === 'warn') flashColor = '#f1c40f'; // Warning yellow

    element.style.borderColor = flashColor;
    setTimeout(() => {
        element.style.borderColor = originalBorder || '#3cb371'; // Restore original or default
    }, duration);
}

// Modified to accept the plot's THREE.js object
function placeLLMOnPlot(plotData, plotObject) {
    if (!currentLLMTransporting || !mainCityScene || !plotObject) return;

    // Create a new instance of the LLM model for the plot
    const placedLLMModel = renderLLMCharacter(THREE, currentLLMTransporting);
    placedLLMModel.position.set(plotData.x, 0.01, plotData.z); // Place slightly above ground at plot center
    // Optionally rotate the LLM to face a certain direction
    placedLLMModel.rotation.y = Math.random() * Math.PI * 2;
    placedLLMModel.castShadow = true; // Ensure it casts shadows
    mainCityScene.add(placedLLMModel);

    // Update plot data (this should ideally persist somewhere)
    plotData.available = false;
    plotData.occupiedBy = currentLLMTransporting.id;

    // Remove the construction outline (the plotObject group)
     if (plotObject && plotObject.parent) {
         plotObject.parent.remove(plotObject);
         console.log(`Removed construction outline for plot ${plotData.name}.`);
         // Clean up geometry/material if needed (might not be necessary if just removing group)
         // plotObject.traverse(child => {
         //     if (child.isMesh) {
         //         child.geometry?.dispose();
         //         child.material?.dispose();
         //     }
         // });
     } else {
         console.warn(`Could not find plot object in scene to remove for plot ${plotData.name}.`);
     }

    console.log(`LLM ${currentLLMTransporting.name} placed on plot ${plotData.name}.`);

    // TODO: Update cityData persistence if necessary (e.g., save to localStorage or call an update function in cityData.js)
    // Example: if (cityData.save) cityData.save();
}

function deactivateDroneTransport(cancel = false) {
    if (!droneActive) return;
    droneActive = false;
    window.droneActive = false; // Clear global flag

    removeInputListeners();

    if (droneAnimationId) {
        cancelAnimationFrame(droneAnimationId);
        droneAnimationId = null;
    }

    if (droneContainer) {
        droneContainer.classList.remove('active');
        setTimeout(() => {
            if (droneContainer && droneContainer.parentNode) {
                droneContainer.parentNode.removeChild(droneContainer);
            }
            droneContainer = null;
        }, 500); // Delay removal for fade-out animation
    }

    if (droneModel && droneModel.parent) {
        // Clean up drone model resources
        droneModel.traverse(child => {
            if (child.isMesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m?.dispose());
                } else {
                    child.material?.dispose();
                }
            }
        });
        droneModel.parent.remove(droneModel);
    }
    droneModel = null;
    llmModel = null; // Reference to LLM model inside drone is also cleared

    if (mainCityControls) {
        mainCityControls.enabled = true; // Re-enable orbit controls
        if (originalCameraPosition && originalCameraTarget) {
            // Smooth transition back (or instant snap if preferred)
             const transitionDuration = 1000;
             const startTime = Date.now();
             function transitionBack() {
                 const elapsed = Date.now() - startTime;
                 const progress = Math.min(elapsed / transitionDuration, 1);
                 const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                 // Check if drone became active again during transition
                 if (window.droneActive) return;

                 mainCityCamera.position.lerpVectors(mainCityCamera.position, originalCameraPosition, easeProgress * 0.1);
                 mainCityControls.target.lerpVectors(mainCityControls.target, originalCameraTarget, easeProgress * 0.1);
                 mainCityCamera.lookAt(mainCityControls.target);
                 mainCityControls.update();

                 if (progress < 1) {
                     requestAnimationFrame(transitionBack);
                 } else { // Final snap
                      mainCityCamera.position.copy(originalCameraPosition);
                      mainCityControls.target.copy(originalCameraTarget);
                      mainCityCamera.lookAt(mainCityControls.target);
                      mainCityControls.update();
                 }
             }
             requestAnimationFrame(transitionBack);
        } else {
             mainCityControls.target.set(0,0,0); // Fallback
             mainCityControls.update();
        }
    }

    if (cancel) console.log('Drone transport cancelled');
    currentLLMTransporting = null;
}

// Add alias for Place LLM button (if needed elsewhere)
function landDrone() {
    handlePlaceAttempt();
}