import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js'; // Import icon function
import { config } from './config.js'; // Import config for potential map size

// --- State Variables ---
let droneActive = false;
let droneCutsceneActive = false; // NEW: Cutscene state
let droneCutsceneStartTime = 0; // NEW: Cutscene timer
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
let gameplayStartPosition; // Keep track of the gameplay start position for smooth transition

// --- Constants ---
const MAX_SPEED = 0.25;
const ACCELERATION = 0.02;
const DECELERATION = 0.95; // Multiplier for damping
const ROTATION_SPEED = 0.01;
const MAX_ROTATION_SPEED = 0.05;
const ROTATION_DAMPING = 0.90;
const VERTICAL_SPEED = 0.15;
const MIN_ALTITUDE = 1.0;
const CAMERA_FOLLOW_DISTANCE = 8;
const CAMERA_FOLLOW_HEIGHT = 4;
const CAMERA_LERP_FACTOR = 0.05;
const DRONE_BASE_COLOR = 0xffffff; // White
const DRONE_ACCENT_COLOR = 0xcccccc; // Light Grey
const DRONE_DARK_ACCENT_COLOR = 0x888888; // Darker Grey
const CUTSCENE_DURATION = 5000; // NEW: 5 seconds for cutscene

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

    document.getElementById('llm-collection-ui').classList.remove('active');

    createDroneUI(llm);
    droneContainer.classList.add('active');
    // NEW: Initially hide controls during cutscene
    const controlsElement = droneContainer.querySelector('.drone-controls-info');
    if (controlsElement) controlsElement.style.opacity = '0';

    originalCameraPosition = mainCityCamera.position.clone();
    originalCameraTarget = mainCityControls.target.clone();

    const mapSize = config.citySize || 500;

    // --- NEW: Define Cutscene Start/End ---
    const cutsceneStartPosition = new THREE.Vector3(0, 100, (mapSize / 2) + 150); // Start further back and higher
    //FIX: Face the city (0 radians Y)
    const cutsceneStartRotation = new THREE.Euler(0, 0, 0);
    // Gameplay Start Position (end of cutscene)
    gameplayStartPosition = new THREE.Vector3(0, 50, (mapSize / 2) + 50);
    //FIX: Face the city (0 radians Y)
    const gameplayStartRotation = new THREE.Euler(0, 0, 0);

    // Set initial state to cutscene start
    dronePosition.copy(cutsceneStartPosition);
    droneRotation.copy(cutsceneStartRotation);
    droneVelocity.set(0, 0, 0);
    droneAngularVelocity.set(0, 0, 0);
    resetControlState();

    initDroneScene(llm); // Creates droneModel

    // Position drone at cutscene start
    if (droneModel) {
        droneModel.position.copy(cutsceneStartPosition);
        droneModel.rotation.copy(cutsceneStartRotation);
    }

    // Position camera for cutscene START (instantly)
    positionCameraForCutscene(0); // Progress 0

    // Activate cutscene state
    droneActive = true;
    window.droneActive = true; // Set global flag
    droneCutsceneActive = true; // NEW
    droneCutsceneStartTime = performance.now(); // NEW

    // Disable OrbitControls immediately
    if (mainCityControls) mainCityControls.enabled = false;

    animateDrone(); // Start the dedicated drone animation loop
}

// --- Initialization Functions ---
function createDroneUI(llm) {
    // ... (UI creation code remains the same) ...
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
    // ... (drone model creation remains the same) ...
    createDroneWithLLM(llm);
}

function createDroneWithLLM(llm) {
    // ... (drone 3D model creation remains the same) ...
    droneModel = new THREE.Group();
    droneModel.name = "DroneWithLLM";

    // --- Drone Appearance Setup ---
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: DRONE_BASE_COLOR, metalness: 0.6, roughness: 0.4 });
    const armMaterial = new THREE.MeshStandardMaterial({ color: DRONE_ACCENT_COLOR, metalness: 0.5, roughness: 0.5 });
    const propellerHubMaterial = new THREE.MeshStandardMaterial({ color: DRONE_DARK_ACCENT_COLOR, metalness: 0.8, roughness: 0.2 });
    const propellerBladeMaterial = new THREE.MeshStandardMaterial({ color: DRONE_ACCENT_COLOR, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }); // Added transparency


    // Central Body (Smaller Cylinder)
    const centralBodyRadius = 0.3; // Smaller radius
    const centralBodyHeight = 0.2; // Shorter height
    const centralBody = new THREE.Mesh(
        new THREE.CylinderGeometry(centralBodyRadius * 0.8, centralBodyRadius, centralBodyHeight, 12), // Slightly tapered
        bodyMaterial
    );
    centralBody.castShadow = true;
    droneModel.add(centralBody);

    // Arms (Thinner, extending from central body edge)
    const propDistance = 1.0; // Distance from center to propeller center
    const armWidth = 0.08; // Thinner arm width
    const armHeight = 0.08; // Thinner arm height
    const armLength = propDistance; // Length of the arm from center

    // Propeller Positions (rotated by 45 degrees)
    const angleRad = Math.PI / 4; // 45 degrees
    const propellerPositions = [
         { x: propDistance * Math.sin(angleRad), z: -propDistance * Math.cos(angleRad) }, // Front-Right
         { x: -propDistance * Math.sin(angleRad), z: -propDistance * Math.cos(angleRad) }, // Front-Left
         { x: -propDistance * Math.sin(angleRad), z: propDistance * Math.cos(angleRad) }, // Back-Left
         { x: propDistance * Math.sin(angleRad), z: propDistance * Math.cos(angleRad) }  // Back-Right
    ];

    // Create Arms connecting center to propeller positions
    propellerPositions.forEach((propPos, index) => {
        const armRotationY = Math.atan2(propPos.x, propPos.z); // Calculate rotation based on position

        // Arm Geometry - Create it along the Z axis initially
        const armGeometry = new THREE.BoxGeometry(armWidth, armHeight, armLength);

        const arm = new THREE.Mesh(armGeometry, armMaterial);
        // Position the arm's center halfway between the origin and the propeller position
        arm.position.set(propPos.x / 2, 0, propPos.z / 2);
        // Rotate the arm to point towards the propeller position
        arm.rotation.y = armRotationY;
        arm.castShadow = true;
        droneModel.add(arm);

        // Propeller at the calculated propeller position
        const propeller = createPropeller(propellerHubMaterial, propellerBladeMaterial);
        propeller.position.set(propPos.x, armHeight / 2 + 0.05, propPos.z); // Position slightly above arm plane
        droneModel.add(propeller);
    });


    // LLM Model (Scaled slightly smaller, positioned lower)
    llmModel = renderLLMCharacter(THREE, llm);
    llmModel.scale.set(0.4, 0.4, 0.4); // Make LLM smaller relative to drone
    llmModel.position.set(0, -0.8, 0); // Hang further below the central body
    llmModel.castShadow = true;
    llmModel.receiveShadow = true;
    droneModel.add(llmModel);

    // Ensure all parts cast shadows
    droneModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });


    if (mainCityScene) {
        mainCityScene.add(droneModel);
        droneModel.position.copy(dronePosition);
        droneModel.rotation.copy(droneRotation);
    } else {
        console.error("Main city scene not available when creating drone.");
    }
}

function createPropeller(hubMaterial, bladeMaterial) {
    const propellerGroup = new THREE.Group();
    propellerGroup.name = "Propeller";

    // Hub
    const hubRadius = 0.1;
    const hubHeight = 0.08;
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(hubRadius, hubRadius, hubHeight, 8),
        hubMaterial // Use passed material
    );
    hub.castShadow = true;
    propellerGroup.add(hub);

    const blades = new THREE.Group();
    blades.name = "Blades";
    propellerGroup.add(blades);

    // Blades (adjusted size)
    const bladeLength = 0.6; // Shorter blade length
    const bladeWidth = 0.1; // Narrower blade
    const bladeThickness = 0.01;
    const bladeGeometry = new THREE.BoxGeometry(bladeLength, bladeThickness, bladeWidth);

    // --- Apply slight pitch to blades ---
    const pitchAngle = Math.PI / 12; // ~15 degrees pitch

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial); // Use passed material
    blade1.rotation.z = pitchAngle; // Pitch one way
    blade1.castShadow = true;
    blades.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial); // Use passed material
    blade2.rotation.y = Math.PI / 2;
    blade2.rotation.z = -pitchAngle; // Pitch the other way
    blade2.castShadow = true;
    blades.add(blade2);

    // Position blades slightly above the hub
    blades.position.y = hubHeight / 2 + bladeThickness / 2;

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
    const placeBtn = droneContainer.querySelector('.drone-land-btn');
    if (placeBtn) placeBtn.addEventListener('click', handlePlaceAttempt);
}

// ... (removeInputListeners, resetControlState, handleKeyDown, handleKeyUp, setupTouchButtonListeners, handleTouchStart, handleTouchEnd remain the same) ...
function removeInputListeners() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    // Touch listeners are implicitly removed when the UI is destroyed
    const placeBtn = droneContainer?.querySelector('.drone-land-btn'); // Use optional chaining
    if (placeBtn) placeBtn.removeEventListener('click', handlePlaceAttempt);
}

function resetControlState() {
    for (const key in droneControls) {
        droneControls[key] = false;
    }
    touchActiveControls = {};
}

function handleKeyDown(event) {
    // NEW: Ignore controls during cutscene
    if (!droneActive || droneCutsceneActive) return;
    // Ignore inputs if an input field is focused
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        return;
    }

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
        case 'p': handlePlaceAttempt(); break;
        case 'escape': deactivateDroneTransport(true); break; // Cancel
        default: handled = false;
    }
    if (handled) event.preventDefault();
}

function handleKeyUp(event) {
    // NEW: Ignore controls during cutscene (though unlikely to press during it)
    if (!droneActive || droneCutsceneActive) return;

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
    if (!droneContainer) return; // Check if container exists
    droneContainer.querySelectorAll('.drone-touch-btn').forEach(btn => {
        const control = btn.getAttribute('data-control');
        if (control) { // Ensure control exists
            btn.addEventListener('touchstart', (e) => handleTouchStart(e, control), { passive: false }); // Need passive: false for preventDefault
            btn.addEventListener('touchend', (e) => handleTouchEnd(e, control));
            btn.addEventListener('touchcancel', (e) => handleTouchEnd(e, control)); // Handle cancellation
            // Mouse fallback for testing
            btn.addEventListener('mousedown', (e) => handleTouchStart(e, control));
            btn.addEventListener('mouseup', (e) => handleTouchEnd(e, control));
            btn.addEventListener('mouseleave', (e) => handleTouchEnd(e, control)); // Handle leaving button
        }
    });
}

function handleTouchStart(event, control) {
    // NEW: Ignore controls during cutscene
    if (droneCutsceneActive) return;
    event.preventDefault();
    droneControls[control] = true;
    touchActiveControls[control] = true; // Mark as active by touch
    // Visual feedback
    if (event.target instanceof HTMLElement) {
        event.target.style.backgroundColor = 'rgba(60, 179, 113, 0.8)';
    }
}

function handleTouchEnd(event, control) {
     // NEW: Ignore controls during cutscene
     if (droneCutsceneActive) return;
    event.preventDefault();
    // Only deactivate if it was activated by touch (prevents interference with keyboard)
    // Check if the control exists in touchActiveControls before deleting
    if (touchActiveControls.hasOwnProperty(control)) {
        droneControls[control] = false;
        delete touchActiveControls[control];
    }
    // Reset visual feedback - Need to find the button again if event.target isn't reliable
    if (droneContainer) {
        const btn = droneContainer.querySelector(`.drone-touch-btn[data-control="${control}"]`);
        if (btn instanceof HTMLElement) {
            btn.style.backgroundColor = 'rgba(60, 179, 113, 0.4)';
        }
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
    // Apply rotation to the drone model itself
    droneModel.rotation.y += droneAngularVelocity.y;

    // --- Translation ---
    // Get drone's current forward and right vectors based on its rotation
    const forwardVector = new THREE.Vector3();
    droneModel.getWorldDirection(forwardVector); // Gets the direction the local negative Z-axis is pointing
    // forwardVector.negate(); // Negate if model faces +Z locally for forward movement
    // Assuming model faces -Z locally for forward, do not negate

    const rightVector = new THREE.Vector3().crossVectors(droneModel.up, forwardVector).normalize(); // Cross drone's up with its forward for right

    let targetVelocity = new THREE.Vector3();
    if (droneControls.forward) targetVelocity.add(forwardVector);
    if (droneControls.backward) targetVelocity.sub(forwardVector);
    if (droneControls.left) targetVelocity.sub(rightVector);
    if (droneControls.right) targetVelocity.add(rightVector);

    // Normalize horizontal movement if needed (prevent faster diagonal movement)
    const horizontalMagnitudeSq = targetVelocity.x * targetVelocity.x + targetVelocity.z * targetVelocity.z;
    if (horizontalMagnitudeSq > 1e-6) { // Use a small epsilon to avoid normalizing zero vectors
        const scale = 1.0 / Math.sqrt(horizontalMagnitudeSq);
        targetVelocity.x *= scale;
        targetVelocity.z *= scale;
    }

    // Apply vertical movement
    let verticalVelocityInput = 0;
    if (droneControls.up) verticalVelocityInput += VERTICAL_SPEED;
    if (droneControls.down) verticalVelocityInput -= VERTICAL_SPEED;

    // Accelerate towards target velocity
    droneVelocity.x += (targetVelocity.x * MAX_SPEED - droneVelocity.x) * ACCELERATION;
    droneVelocity.z += (targetVelocity.z * MAX_SPEED - droneVelocity.z) * ACCELERATION;
    // Apply vertical velocity directly, but apply damping later
    droneVelocity.y += (verticalVelocityInput - droneVelocity.y) * ACCELERATION;

    // Apply damping (friction)
    droneVelocity.x *= DECELERATION;
    droneVelocity.z *= DECELERATION;
    droneVelocity.y *= DECELERATION; // Damp vertical velocity too

    // Clamp horizontal speed
    const currentSpeedSq = droneVelocity.x * droneVelocity.x + droneVelocity.z * droneVelocity.z;
    if (currentSpeedSq > MAX_SPEED * MAX_SPEED) {
        const scale = MAX_SPEED / Math.sqrt(currentSpeedSq);
        droneVelocity.x *= scale;
        droneVelocity.z *= scale;
    }
    // Clamp vertical speed separately if needed (optional)
    // droneVelocity.y = THREE.MathUtils.clamp(droneVelocity.y, -VERTICAL_SPEED, VERTICAL_SPEED);

    // Apply final velocity to position
    droneModel.position.add(droneVelocity);

    // Enforce altitude constraint
    if (droneModel.position.y < MIN_ALTITUDE) {
        droneModel.position.y = MIN_ALTITUDE;
        droneVelocity.y = Math.max(0, droneVelocity.y); // Stop downward velocity if hitting floor
    }

    // Boundary constraints (simple rectangular for now)
    const mapBoundary = (config.citySize || 500) / 2;
    if (droneModel.position.x < -mapBoundary) droneModel.position.x = -mapBoundary;
    if (droneModel.position.x > mapBoundary) droneModel.position.x = mapBoundary;
    if (droneModel.position.z < -mapBoundary) droneModel.position.z = -mapBoundary;
    if (droneModel.position.z > mapBoundary) droneModel.position.z = mapBoundary;

    // Animate propellers based on overall movement and vertical thrust
    const verticalThrust = droneControls.up ? 1 : (droneControls.down ? -0.5 : 0);
    const horizontalSpeed = Math.sqrt(currentSpeedSq);
    // Increase base speed, make vertical thrust effect stronger
    const propellerSpeed = 1.0 + Math.abs(droneVelocity.y) * 8 + verticalThrust * 2 + horizontalSpeed * 5;
    animatePropellers(propellerSpeed);
}

// NEW: Helper to animate propellers
function animatePropellers(speed) {
    if (!droneModel) return;
    droneModel.traverse(child => {
        if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
            // Alternate rotation direction for stability effect
            const parentPosition = child.parent.position;
            // Simple check based on x position relative to center (approximate)
            const direction = (parentPosition.x * parentPosition.z >= 0) ? 1 : -1; // Alternate based on quadrant
            child.rotation.y += speed * direction * 0.25; // Increased speed multiplier
        }
    });
}

// --- Cutscene Logic ---
function updateDroneCutscene(elapsedTime) {
    if (!droneModel || !gameplayStartPosition) return; // Ensure gameplayStartPosition is defined

    const progress = Math.min(elapsedTime / CUTSCENE_DURATION, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

    const mapSize = config.citySize || 500;
    const cutsceneStartPosition = new THREE.Vector3(0, 100, (mapSize / 2) + 150);
    // const gameplayStartPosition = new THREE.Vector3(0, 50, (mapSize / 2) + 50); // Now a global variable

    // Interpolate drone position
    droneModel.position.lerpVectors(cutsceneStartPosition, gameplayStartPosition, easeProgress);

    // Keep rotation fixed during cutscene (facing city - Y=0)
    droneModel.rotation.set(0, 0, 0);

    // Animate propellers faster during cutscene
    animatePropellers(15); // Fixed high speed for cutscene

    // Update camera position for cutscene
    positionCameraForCutscene(easeProgress);

    // Check if cutscene is finished
    if (progress >= 1) {
        droneCutsceneActive = false;
        // Set final gameplay position and rotation accurately from gameplayStartPosition
        // No need to copy again as lerp handles the final step
        droneModel.position.copy(gameplayStartPosition);
        // Ensure final rotation is set correctly (Y=0 to face city)
        droneModel.rotation.set(0, 0, 0);

        // Copy the final drone state to the global state variables
        dronePosition.copy(droneModel.position);
        droneRotation.copy(droneModel.rotation);
        droneVelocity.set(0,0,0); // Reset velocity
        droneAngularVelocity.set(0,0,0); // Reset angular velocity

        // Fade in UI controls
        const controlsElement = droneContainer?.querySelector('.drone-controls-info');
        if (controlsElement) {
            controlsElement.style.transition = 'opacity 0.5s ease-in';
            controlsElement.style.opacity = '1';
        }
        // Setup input listeners *after* cutscene finishes
        setupInputListeners();
        console.log("Drone cutscene finished. Player control enabled.");
    }
}

// --- Animation Loop ---
function animateDrone() {
    if (!droneActive) return;
    droneAnimationId = requestAnimationFrame(animateDrone);

    const currentTime = performance.now();

    if (droneCutsceneActive) {
        const cutsceneElapsedTime = currentTime - droneCutsceneStartTime;
        updateDroneCutscene(cutsceneElapsedTime);
    } else {
        updateDronePhysics();
        positionCameraForDroneView(); // Update camera smoothly
    }

    // Rendering is handled by the main cityScene loop
}

// --- Placement & Deactivation ---
function handlePlaceAttempt() {
    // NEW: Ignore place attempt during cutscene
    if (!droneActive || droneCutsceneActive || !droneModel) return;

    // ... (rest of placement logic remains the same) ...
     // Raycast downwards from drone position
    const raycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(mainCityScene.children, true); // Check all scene children recursively

    let targetPlot = null;
    let intersectPoint = null; // Store intersection point

    for (const intersect of intersects) {
        let obj = intersect.object;
        // Traverse up to find the actual plot object or the ground
        while (obj && (!obj.userData || obj.userData.type !== 'lot') && obj.name !== 'primaryGround' && obj.name !== 'construction_site') { // Also check for construction site parent
            obj = obj.parent;
        }

        if (obj && obj.userData && obj.userData.type === 'lot') {
            targetPlot = cityData.lots.find(lot => lot.id === obj.userData.id);
            if (targetPlot) {
                intersectPoint = intersect.point; // Store intersection point on the plot
                break;
            }
        } else if (obj && obj.name === 'primaryGround') {
            // If we hit the ground first, it means we are not over a plot outline
            break; // Stop searching
        }
    }


    if (targetPlot) {
        if (targetPlot.available) {
            // Check if LLM meets requirements (implement later if needed)
            console.log(`Placing LLM ${currentLLMTransporting.name} on plot ${targetPlot.name}`);
            placeLLMOnPlot(targetPlot, intersectPoint); // Pass intersection point
            deactivateDroneTransport(false); // Deactivate after successful placement
        } else {
            console.log(`Plot ${targetPlot.name} is already occupied.`);
            // Optionally provide user feedback (e.g., flash UI red)
            const landBtn = droneContainer?.querySelector('.drone-land-btn');
            if(landBtn) {
                landBtn.style.backgroundColor = '#ff4444'; // Flash red
                setTimeout(() => { if(landBtn) landBtn.style.backgroundColor = '#3cb371'; }, 500);
            }
        }
    } else {
        console.log("Not hovering over a valid plot.");
        // Optionally provide user feedback
         const landBtn = droneContainer?.querySelector('.drone-land-btn');
         if(landBtn) {
             landBtn.style.backgroundColor = '#ffaa44'; // Flash orange
             setTimeout(() => { if(landBtn) landBtn.style.backgroundColor = '#3cb371'; }, 500);
         }
    }
}

// ... (placeLLMOnPlot remains the same) ...
function placeLLMOnPlot(plotData, placementPoint) {
    if (!currentLLMTransporting || !mainCityScene) return;

    // Create a new instance of the LLM model for the plot
    const placedLLMModel = renderLLMCharacter(THREE, currentLLMTransporting);

    // Use the precise intersection point for placement, adjusting Y to be on the ground (0)
    placedLLMModel.position.set(placementPoint.x, 0, placementPoint.z);

    // Optionally rotate the LLM to face a certain direction (e.g., towards center)
    const directionToCenter = new THREE.Vector3(0 - placementPoint.x, 0, 0 - placementPoint.z).normalize();
    placedLLMModel.rotation.y = Math.atan2(directionToCenter.x, directionToCenter.z);

    placedLLMModel.castShadow = true; // Ensure it casts shadows
    placedLLMModel.receiveShadow = true; // Ensure it receives shadows
    mainCityScene.add(placedLLMModel);

    // Update plot data
    plotData.available = false;
    plotData.occupiedBy = currentLLMTransporting.id;

    // Remove the construction outline for this plot
    let plotOutlineToRemove = null;
    mainCityScene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot' && obj.userData.id === plotData.id) {
            // Remove all children (cones, tape) and then the group itself
            while (obj.children.length > 0) {
                obj.remove(obj.children[0]);
            }
            plotOutlineToRemove = obj;
        }
    });
    if (plotOutlineToRemove && plotOutlineToRemove.parent) {
        plotOutlineToRemove.parent.remove(plotOutlineToRemove);
        // TODO: Visually update the plot hover info if it's currently showing this plot
        // Might need to call a function in plotHoverInfo.js to refresh/hide
        import('./plotHoverInfo.js').then(module => {
            if (typeof module.hideInfoPanel === 'function') {
                // module.hideInfoPanel(); // Or a more specific update function if available
                 module.checkPlotHovers(); // Trigger a refresh
            }
        });
    }

    console.log(`LLM ${currentLLMTransporting.name} placed on plot ${plotData.name}.`);

    // TODO: Update cityData persistence if necessary
    // Assuming cityData has a save function or similar mechanism
    if (typeof cityData.saveGame === 'function') {
        // cityData.saveGame(); // Or trigger save through another mechanism
        console.log("City data state updated (but not persisted automatically).");
    }
}


function deactivateDroneTransport(cancel = false) {
    if (!droneActive) return;
    droneActive = false;
    droneCutsceneActive = false; // Ensure cutscene state is also reset
    window.droneActive = false; // Clear global flag

    removeInputListeners();

    if (droneAnimationId) {
        cancelAnimationFrame(droneAnimationId);
        droneAnimationId = null;
    }

    if (droneContainer) {
        droneContainer.classList.remove('active');
        // Delay removal slightly to allow fade-out animation
        setTimeout(() => {
            if (droneContainer && droneContainer.parentNode) {
                droneContainer.parentNode.removeChild(droneContainer);
            }
            droneContainer = null;
        }, 500); // Match CSS transition duration if any
    }

    // Clean up drone 3D model
    if (droneModel) {
        // Remove LLM model child first if it exists
        if (llmModel && llmModel.parent === droneModel) {
            droneModel.remove(llmModel);
        }
        // Remove the drone model from the scene
        if (droneModel.parent) {
            droneModel.parent.remove(droneModel);
        }
        // Dispose of geometries and materials to free memory (optional but good practice)
        droneModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.isMaterial) {
                    // Check if material is an array
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        droneModel = null;
        llmModel = null;
    }

    if (mainCityControls) {
        mainCityControls.enabled = true; // Re-enable orbit controls
        if (originalCameraPosition && originalCameraTarget) {
            // Smooth transition back
            const transitionDuration = 1000; // 1 second transition
            const startTime = performance.now(); // Use performance.now for higher precision
            const startCamPos = mainCityCamera.position.clone();
            const startTarget = mainCityControls.target.clone();

            function transitionBack() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / transitionDuration, 1);
                // Use an easing function (e.g., ease-out cubic)
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                // Interpolate camera position and target
                mainCityCamera.position.lerpVectors(startCamPos, originalCameraPosition, easeProgress);
                mainCityControls.target.lerpVectors(startTarget, originalCameraTarget, easeProgress);

                // Always look at the target and update controls
                mainCityCamera.lookAt(mainCityControls.target);
                mainCityControls.update();

                if (progress < 1 && !window.droneActive) { // Continue only if progress < 1 and drone hasn't reactivated
                    requestAnimationFrame(transitionBack);
                } else if (!window.droneActive) { // Ensure final snap if transition completes or is interrupted
                    mainCityCamera.position.copy(originalCameraPosition);
                    mainCityControls.target.copy(originalCameraTarget);
                    mainCityCamera.lookAt(mainCityControls.target);
                    mainCityControls.update();
                    console.log("Camera transition back complete.");
                } else {
                    console.log("Camera transition back interrupted by drone reactivation.");
                }
            }
            requestAnimationFrame(transitionBack);
        } else {
            // Fallback if original positions weren't stored
            mainCityControls.target.set(0, 0, 0);
            mainCityControls.update();
        }
    }

    if (cancel) console.log('Drone transport cancelled');
    currentLLMTransporting = null;
    // Reset original camera/target refs
    originalCameraPosition = null;
    originalCameraTarget = null;
}

// --- Camera Positioning ---
// NEW: Camera positioning specifically for the cutscene
function positionCameraForCutscene(progress) {
    if (!droneModel || !mainCityCamera || !mainCityControls) return;

    // Define camera start and end relative positions/targets for the cutscene
    const startOffset = new THREE.Vector3(0, 15, 30); // Start further back and higher
    const endOffset = new THREE.Vector3(0, CAMERA_FOLLOW_HEIGHT, CAMERA_FOLLOW_DISTANCE); // End at normal follow distance

    const startLookAtOffset = new THREE.Vector3(0, 10, 0); // Look higher initially
    const endLookAtOffset = new THREE.Vector3(0, 0.5, 0); // End looking slightly above drone

    // Interpolate offset and lookAt based on progress
    const currentOffset = new THREE.Vector3().lerpVectors(startOffset, endOffset, progress);
    const currentLookAtOffset = new THREE.Vector3().lerpVectors(startLookAtOffset, endLookAtOffset, progress);

    // Apply drone's rotation to the camera offset (keep camera behind drone)
    // Since drone rotation is 0 during cutscene, this won't change offset direction
    currentOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);

    // Calculate target camera position and look-at point
    const targetCamPos = droneModel.position.clone().add(currentOffset);
    const targetLookAt = droneModel.position.clone().add(currentLookAtOffset);

    // Apply position and target instantly during cutscene
    mainCityCamera.position.copy(targetCamPos);
    mainCityControls.target.copy(targetLookAt);
    mainCityCamera.lookAt(targetLookAt);
    mainCityControls.update(); // Update controls state
}

// Modified: Normal gameplay camera positioning
function positionCameraForDroneView(instant = false) {
    // NEW: Don't run if cutscene is active
    if (droneCutsceneActive || !droneModel || !mainCityCamera || !mainCityControls) return;

    // Ensure orbit controls are disabled while drone is active
    mainCityControls.enabled = false;

    // Calculate the desired camera offset based on drone's rotation
    const offset = new THREE.Vector3(0, CAMERA_FOLLOW_HEIGHT, CAMERA_FOLLOW_DISTANCE);
    // Apply the drone's rotation to the offset vector
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneModel.rotation.y);

    // Calculate the target camera position by adding the offset to the drone's position
    const targetCamPos = droneModel.position.clone().add(offset);

    // Calculate the target look-at point (slightly above the drone's center)
    const targetLookAt = droneModel.position.clone().add(new THREE.Vector3(0, 0.5, 0));

    if (instant) {
        // Instantly set camera position and target
        mainCityCamera.position.copy(targetCamPos);
        mainCityControls.target.copy(targetLookAt);
    } else {
        // Smoothly interpolate camera position and target
        mainCityCamera.position.lerp(targetCamPos, CAMERA_LERP_FACTOR);
        mainCityControls.target.lerp(targetLookAt, CAMERA_LERP_FACTOR);
    }

    // Always make the camera look at the (potentially interpolated) target
    mainCityCamera.lookAt(mainCityControls.target);

    // Update the OrbitControls state (even though disabled, target needs update)
    mainCityControls.update();
}

// Add alias for Place LLM button
function landDrone() {
    handlePlaceAttempt();
}