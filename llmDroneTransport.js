import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js';
import { config } from './config.js';
import { playTrack } from './musicPlayer.js'; // Import music player function
import { cityData } from './cityData.js'; // Import cityData for plot info

let droneActive = false;
let droneModel, llmModel;
let dronePosition = new THREE.Vector3(0, 15, 0);
let droneRotation = new THREE.Euler(0, 0, 0);
let droneVelocity = new THREE.Vector3();
let droneAngularVelocity = new THREE.Euler();
let droneAnimationId = null;
let cameraTransitionId = null;
let droneContainer;
let currentLLMTransporting = null;
let mainCityScene, mainCityCamera, mainCityControls;
let originalCameraPosition, originalCameraTarget;

// Auto-navigation state
let isAutoNavigating = false;
let autoNavTargetPosition = new THREE.Vector3();
let autoNavTargetPlotId = null;
let autoNavReachedTarget = false; // Flag to check if target reached
const AUTO_NAV_SPEED = 0.15; // Slightly slower than max manual speed
const AUTO_NAV_ROTATION_SPEED = 0.03;
const AUTO_NAV_ARRIVAL_THRESHOLD = 1.0; // Distance threshold to consider arrived
const AUTO_NAV_STOP_THRESHOLD = 0.5; // Distance threshold to fully stop
const AUTO_NAV_HOVER_ALTITUDE = 5.0; // Altitude to hover above plot center

let joystickActive = false;
let joystickThumb, joystickContainerElement;
let joystickOrigin = { x: 0, y: 0 };
let joystickRadius = 0;

const MAX_SPEED = 0.25;
const ACCELERATION = 0.02;
const DECELERATION = 0.95;
const ROTATION_SPEED = 0.01;
const MAX_ROTATION_SPEED = 0.05;
const ROTATION_DAMPING = 0.90;
const VERTICAL_SPEED = 0.15;
const MIN_ALTITUDE = 1.0;
const CAMERA_FOLLOW_DISTANCE = 8;
const CAMERA_FOLLOW_HEIGHT = 4;
const CAMERA_LERP_FACTOR = 0.05;
const DRONE_BASE_COLOR = 0xffffff;
const DRONE_ACCENT_COLOR = 0xcccccc;
const DRONE_DARK_ACCENT_COLOR = 0x888888;
const JOYSTICK_MAX_DISPLACEMENT = 35;

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
let touchActiveControls = {};

let isHoveringValidPlot = false; // New flag for placement readiness
let isPlacing = false; // New flag for placement sequence
let placementStartTime = 0; // Track placement animation time
const PLACEMENT_DURATION = 1500; // 1.5 seconds to lower and place

// Expose auto-navigating state globally
window.isAutoNavigating = isAutoNavigating;

// Add a variable to store the model's offset from the drone origin
let modelBottomOffset = -1.7; // Default offset, will be calculated

export function activateDroneTransport(llmId) {
    if (droneActive) return;

    if (cameraTransitionId) {
        cancelAnimationFrame(cameraTransitionId);
        cameraTransitionId = null;
        console.log("Cancelled ongoing camera return transition.");
    }

    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;

    // Assign global references *before* using them
    mainCityScene = window.cityScene;
    mainCityCamera = window.camera;
    mainCityControls = window.controls;

    if (!mainCityScene || !mainCityCamera || !mainCityControls) {
        console.error("Main city scene, camera, or controls not found. Cannot activate drone.");
        return;
    }

    currentLLMTransporting = llm;
    console.log(`Activating drone transport for LLM: ${llm.name}`);

    // --- Music Change ---
    playTrack('city'); // Ensure city music is playing for drone
    // --- End Music Change ---

    document.getElementById('llm-collection-ui').classList.remove('active');

    createDroneUI(llm);
    droneContainer.classList.add('active');

    originalCameraPosition = mainCityCamera.position.clone();
    originalCameraTarget = mainCityControls.target.clone();
    console.log("Stored original camera state:", originalCameraPosition, originalCameraTarget);

    const mapSize = config.citySize || 500;
    dronePosition.set(0, 50, mapSize / 2 + 50);
    droneRotation.set(0, Math.PI, 0);
    droneVelocity.set(0, 0, 0);
    droneAngularVelocity.set(0, 0, 0);
    resetControlState();

    initDroneScene(llm); // This now calculates modelBottomOffset inside createDroneWithLLM
    positionCameraForDroneView(true);

    setupInputListeners();

    droneActive = true;
    window.droneActive = true;
    isAutoNavigating = false; // Ensure auto-nav is off initially
    window.isAutoNavigating = false;
    autoNavReachedTarget = false; // Mark as reached
    isHoveringValidPlot = false; // Reset flag
    isPlacing = false; // Reset flag

    animateDrone();
}

// existing code: startAutoNavigation, cancelAutoNavigation, disable/enable controls, UI functions


function initDroneScene(llm) {
    createDroneWithLLM(llm);
}

function createDroneWithLLM(llm) {
    droneModel = new THREE.Group();
    droneModel.name = "DroneWithLLM";

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: DRONE_BASE_COLOR, metalness: 0.6, roughness: 0.4 });
    const armMaterial = new THREE.MeshStandardMaterial({ color: DRONE_ACCENT_COLOR, metalness: 0.5, roughness: 0.5 });
    const propellerHubMaterial = new THREE.MeshStandardMaterial({ color: DRONE_DARK_ACCENT_COLOR, metalness: 0.8, roughness: 0.2 });
    const propellerBladeMaterial = new THREE.MeshStandardMaterial({ color: DRONE_ACCENT_COLOR, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide });

    const centralBodyRadius = 0.3;
    const centralBodyHeight = 0.2;
    const centralBody = new THREE.Mesh(
        new THREE.CylinderGeometry(centralBodyRadius * 0.8, centralBodyRadius, centralBodyHeight, 12),
        bodyMaterial
    );
    centralBody.castShadow = true;
    droneModel.add(centralBody);

    const propDistance = 1.0;
    const armWidth = 0.08;
    const armHeight = 0.08;
    const armLength = propDistance;

    const angleRad = Math.PI / 4;
    const propellerPositions = [
        { x: propDistance * Math.sin(angleRad), z: -propDistance * Math.cos(angleRad) },
        { x: -propDistance * Math.sin(angleRad), z: -propDistance * Math.cos(angleRad) },
        { x: -propDistance * Math.sin(angleRad), z: propDistance * Math.cos(angleRad) },
        { x: propDistance * Math.sin(angleRad), z: propDistance * Math.cos(angleRad) }
    ];

    propellerPositions.forEach((propPos, index) => {
        const armRotationY = Math.atan2(propPos.x, propPos.z);

        const armGeometry = new THREE.BoxGeometry(armWidth, armHeight, armLength);

        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(propPos.x / 2, 0, propPos.z / 2);
        arm.rotation.y = armRotationY;
        arm.castShadow = true;
        droneModel.add(arm);

        const propeller = createPropeller(propellerHubMaterial, propellerBladeMaterial);
        propeller.position.set(propPos.x, armHeight / 2 + 0.05, propPos.z));
        droneModel.add(propeller);
    });

    // Render the LLM model
    llmModel = renderLLMCharacter(THREE, llm);

    // Calculate the bounding box *before* positioning to get its dimensions relative to its own origin
    const modelBox = new THREE.Box3().setFromObject(llmModel);
    const modelLocalMinY = modelBox.min.y; // The lowest point relative to the model's origin

    // Position the LLM model below the drone body.
    // Target Y position for the model's origin relative to the drone's origin.
    // Place it low enough so it hangs clearly below the drone body.
    const modelOriginTargetY = -(centralBodyHeight / 2 + 0.2); // e.g., 0.2 units below the drone body base
    llmModel.position.set(0, modelOriginTargetY, 0);

    llmModel.castShadow = true;
    llmModel.receiveShadow = true;
    droneModel.add(llmModel);

    // --- Calculate and store the offset ---
    // The offset is the Y distance from the *drone's* origin to the *model's* lowest point.
    // modelBottomOffset = model's origin Y (relative to drone) + model's lowest point Y (relative to model's origin)
    modelBottomOffset = modelOriginTargetY + modelLocalMinY;
    console.log(`Calculated model bottom offset from drone origin: ${modelBottomOffset}`);
    // --- End Offset Calculation ---

    droneModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    if (droneModel && mainCityScene) {
        mainCityScene.add(droneModel);
        droneModel.position.copy(dronePosition);
        droneModel.rotation.copy(droneRotation);
    } else if (!droneModel) {
        console.error("Failed to create drone model.");
    } else {
        console.error("Main city scene not available when creating drone.");
    }
}

// existing code: createPropeller, setupInputListeners, removeInputListeners


// Renamed and modified to handle both manual and auto navigation
function updateDroneState() {
    if (!droneModel || !droneActive) return; // Also check if drone is active

    // --- Placement Animation Logic ---
    // This block handles the drone's Y position during the placement sequence
    if (isPlacing) {
        const elapsed = performance.now() - placementStartTime;
        let progress = Math.min(elapsed / PLACEMENT_DURATION, 1);
        progress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2; // Ease-in-out

        // Calculate the drone's target Y for placement
        // Raycast *every frame* during placement to get current ground level? Might be overkill.
        // Let's calculate it once when placement starts and assume flat ground for now.
        // Revisit if landing on uneven terrain becomes an issue.
        const droneTargetYForPlacement = window.placementGroundLevel - modelBottomOffset + 0.05; // Use stored ground level

        // Interpolate Y position
        droneModel.position.y = THREE.MathUtils.lerp(window.placementStartY, droneTargetYForPlacement, progress);

        // Update propeller speed during placement
        const propellerSpeed = (1.0 - progress) * 2.0 + 0.5; // Gradually decrease speed
        droneModel.traverse(child => {
            if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
                const parentPosition = child.parent.position;
                const direction = (parentPosition.x > 0) ? 1 : -1);
                child.rotation.y += propellerSpeed * direction * 0.25;
            }
    });

    if (progress >= 1) {
        // --- Placement complete ---
        console.log("Lowering complete. Placing LLM.");
        // Final placement logic (raycast down from final position)
        const finalRaycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0));
        const finalIntersects = finalRaycaster.intersectObjects(mainCityScene.children, true);

        let targetPlot = null;
        let intersectPoint = null;

        for (const intersect of finalIntersects) {
            let obj = intersect.object;
            while (obj && (!obj.userData || (obj.userData.type !== 'lot' && obj.userData.type !== 'lot_target')) && obj.name !== 'primaryGround') {
                obj = obj.parent;
            }
            if (obj && obj.userData && (obj.userData.type === 'lot' || obj.userData.type === 'lot_target')) {
                if (!cityData || !Array.isArray(cityData.lots)) {
                    console.error("Critical Error: cityData or cityData.lots is not available in animatePlacement!");
                    targetPlot = null; break;
                }
                const plotData = cityData.lots.find(lot => lot.id === obj.userData.id);
                if (plotData && plotData.available) {
                    targetPlot = plotData;
                    intersectPoint = intersect.point;
                    break;
                }
            }
            if (obj && obj.name === 'primaryGround') break;
        }

        isPlacing = false; // Mark placement as finished *before* calling placeLLMOnPlot

        if (targetPlot && intersectPoint) {
            placeLLMOnPlot(targetPlot, intersectPoint); // Place at the precise intersect point
        } else {
            console.error("Placement failed: Could not find valid plot beneath final position.");
            enableManualControls();
            updatePlacementButtonState();
        }
    }
    // If placing, skip the rest of the physics updates for this frame
    return;
}

// --- Normal Physics Update (Manual or Auto-Nav) ---
if (isAutoNavigating) {
    updateAutoNavigationPhysics();
} else {
    updateManualPhysics();
}

// Common physics updates (altitude, boundaries)
if (droneModel.position.y < MIN_ALTITUDE) {
    droneModel.position.y = MIN_ALTITUDE;
    droneVelocity.y = Math.max(0, droneVelocity.y);
}

const mapBoundary = (config.citySize || 500) / 2;
droneModel.position.x = THREE.MathUtils.clamp(droneModel.position.x, -mapBoundary, mapBoundary);
droneModel.position.z = THREE.MathUtils.clamp(droneModel.position.z, -mapBoundary, mapBoundary);

// Propeller animation based on combined velocity/input
const verticalThrust = droneControls.up ? 1 : (droneControls.down ? -0.5 : 0);
const speedSq = droneVelocity.lengthSq();
const propellerSpeed = 1.0 + Math.abs(droneVelocity.y) * 8 + verticalThrust * 2 + Math.sqrt(speedSq) * 5;
droneModel.traverse(child => {
    if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
        const parentPosition = child.parent.position;
        const direction = (parentPosition.x > 0) ? 1 : -1);
        child.rotation.y += propellerSpeed * direction * 0.25;
    }
});

// Check if hovering over a valid plot *after* updating position
checkHoveringPlot();
updatePlacementButtonState(); // Update button based on hover check
}

// existing code: updateManualPhysics, updateAutoNavigationPhysics remain the same

function checkHoveringPlot() {
    if (!droneActive || !droneModel || isPlacing) {
        isHoveringValidPlot = false;
        return;
    }

    // Use a slightly longer raycast distance to ensure it hits the ground even if drone is high
    const rayLength = droneModel.position.y + 1.0;
    const raycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0), 0, rayLength);
    const intersects = raycaster.intersectObjects(mainCityScene.children, true);

    let foundValidPlot = false;
    let groundY = 0; // Store ground Y position

    for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj && (!obj.userData || (obj.userData.type !== 'lot' && obj.userData.type !== 'lot_target')) && obj.name !== 'primaryGround') {
            obj = obj.parent;
        }
        if (obj && obj.userData && (obj.userData.type === 'lot' || obj.userData.type === 'lot_target')) {
            if (!cityData || !Array.isArray(cityData.lots)) {
                console.error("Critical Error: cityData or cityData.lots is not available in checkHoveringPlot!");
                foundValidPlot = false; // Ensure we don't mark as valid
                break; // Exit loop
            }
            const plotData = cityData.lots.find(lot => lot.id === obj.userData.id);
            if (plotData && plotData.available) {
                // Check if drone is reasonably centered (within half plot dimensions)
                const distFromCenterX = Math.abs(droneModel.position.x - plotData.x);
                const distFromCenterZ = Math.abs(droneModel.position.z - plotData.z);
                if (distFromCenterX < plotData.width / 2 && distFromCenterZ < plotData.height / 2) {
                    foundValidPlot = true;
                    groundY = intersect.point.y; // Store the ground level Y
                    break; // Found a valid, available plot directly below
                }
            }
        }
        // Stop checking if we hit the ground or an invalid object first
        if (obj && obj.name === 'primaryGround') {
            groundY = intersect.point.y; // Store ground Y even if not over plot
            break;
        }
    }

    isHoveringValidPlot = foundValidPlot;
    window.currentGroundLevel = groundY; // Store ground level globally for placement animation access
}

// existing code: updatePlacementButtonState remains the same

function handlePlaceAttempt() {
    // Only allow placing if hovering, not auto-navigating, and not already placing
    if (!isHoveringValidPlot || isAutoNavigating || isPlacing) return;

    // --- Raycast down to get precise ground level BEFORE starting animation ---
    const raycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(mainCityScene.children, true);
    let groundLevel = 0; // Default ground level
    let foundGround = false;
    for (const intersect of intersects) {
        if (intersect.object.name === 'primaryGround' || (intersect.object.userData && (intersect.object.userData.type === 'lot' || intersect.object.userData.type === 'lot_target'))) {
            groundLevel = intersect.point.y;
            foundGround = true;
            break;
        }
    }
    if (!foundGround) {
        console.warn("Could not detect ground level before placement, using default 0.");
    }
    // --- Store ground level and start Y for animation ---
    window.placementGroundLevel = groundLevel;
    window.placementStartY = droneModel.position.y;

    console.log("Starting placement sequence...");
    isPlacing = true;
    placementStartTime = performance.now();
    updatePlacementButtonState(); // Disable button during placement

    // Disable manual controls during placement
    disableManualControls();

    // The actual animation now happens within updateDroneState
}

// This function is now only responsible for the final placement *after* the drone has landed
function placeLLMOnPlot(plotData, placementPoint) {
    if (!currentLLMTransporting || !mainCityScene) return;

    if (!cityData || !Array.isArray(cityData.lots)) {
        console.error("Critical Error: cityData or cityData.lots is not available in placeLLMOnPlot!");
        deactivateDroneTransport(true); return;
    }

    const placedLLMModel = renderLLMCharacter(THREE, currentLLMTransporting);

    // --- Calculate Offset and Place ---
    try {
        // Calculate local bounding box to find offset from origin to bottom
        const localBox = new THREE.Box3().setFromObject(placedLLMModel); // Box relative to model's origin
        const localMinY = localBox.min.y; // Y position of the bottom relative to origin (usually negative)
        const offsetToGround = -localMinY; // Make it positive: distance from origin down to bottom

        // Set final position: Ground point + offset + small epsilon
        placedLLMModel.position.copy(placementPoint);
        placedLLMModel.position.y = placementPoint.y + offsetToGround + 0.01;

        console.log(`Placed model at Y: ${placedLLMModel.position.y}. GroundY: ${placementPoint.y}, Offset: ${offsetToGround}`);
    } catch (error) {
        console.error("Error calculating bounding box for placement:", error);
        // Fallback: Place origin slightly above ground point
        placedLLMModel.position.copy(placementPoint);
        placedLLMModel.position.y = placementPoint.y + 0.01;
    }
    // --- End Placement Calculation ---


    // Optionally, orient the model
    const directionToCenter = new THREE.Vector3(plotData.x - placedLLMModel.position.x, 0, plotData.z - placedLLMModel.position.z).normalize();
    if (directionToCenter.lengthSq() > 0.001) {
        placedLLMModel.rotation.y = Math.atan2(directionToCenter.x, directionToCenter.z) + Math.PI; // Face away from center
    } else {
        placedLLMModel.rotation.y = droneModel ? droneModel.rotation.y : 0; // Default to drone orientation
    }

    // Enable shadows
    placedLLMModel.castShadow = true;
    placedLLMModel.receiveShadow = true;
    placedLLMModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    mainCityScene.add(placedLLMModel);

    // Update plot data
    const currentPlotData = cityData.lots.find(lot => lot.id === plotData.id);
    if (!currentPlotData) {
        console.error(`Critical Error: Could not find plot data with ID ${plotData.id} in cityData.lots during final placement update.`);
        deactivateDroneTransport(true); return;
    }
    currentPlotData.available = false;
    currentPlotData.occupiedBy = currentLLMTransporting.id;

    // Remove click target
    console.log(`Removing click target for plot ID: ${currentPlotData.id}`);
    const objectsToRemove = [];
    mainCityScene.traverse(obj => {
        if (obj && obj.userData && obj.userData.id === currentPlotData.id && obj.name === 'plot_click_target') {
            objectsToRemove.push(obj); // Add to removal list
        }
    });

    // Dispose and remove collected objects *after* traversal completes
    objectsToRemove.forEach(obj => {
        if (obj.parent) {
            disposeHierarchy(obj); // Dispose geometry/materials and remove from parent
            console.log(`Removed ${obj.name} (ID: ${obj.userData.id)})`);
        } else {
            console.warn(`Object ${obj.name} has no parent, cannot remove.`);
            disposeHierarchy(obj); // Still attempt disposal
        }
    });

    // Hide hover info panel
    import('./plotHoverInfo.js').then(module => {
        if (typeof module.hidePlotInfoPanel === 'function') {
            module.hidePlotInfoPanel();
        }
    });

    console.log(`LLM ${currentLLMTransporting.name} placed on plot ${currentPlotData.name}.`);

    // Deactivate drone after successful placement, focusing on the new model
    deactivateDroneTransport(false, placedLLMModel.position.clone());
}

// existing code: disposeHierarchy, deactivateDroneTransport, animateDrone, positionCameraForDroneView remain the same