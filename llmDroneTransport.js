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
const PLACEMENT_FINAL_DRONE_HEIGHT = 0.5; // Drone's height just above ground when done lowering

// Expose auto-navigating state globally
window.isAutoNavigating = isAutoNavigating;

export function activateDroneTransport(llmId) {
    if (droneActive) return;

    if (cameraTransitionId) {
        cancelAnimationFrame(cameraTransitionId);
        cameraTransitionId = null;
        console.log("Cancelled ongoing camera return transition.");
    }

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

    playTrack('city'); 

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

    initDroneScene(llm);
    positionCameraForDroneView(true);

    setupInputListeners();

    droneActive = true;
    window.droneActive = true;
    isAutoNavigating = false; 
    window.isAutoNavigating = false;
    autoNavReachedTarget = false;
    isHoveringValidPlot = false; 
    isPlacing = false; 

    animateDrone();
}

export function startAutoNavigation(targetPosition, targetPlotId) {
    if (!droneActive || isAutoNavigating || isPlacing) return; 

    console.log("Starting auto-navigation to:", targetPosition, "Plot ID:", targetPlotId);
    isAutoNavigating = true;
    window.isAutoNavigating = true;
    autoNavTargetPosition.copy(targetPosition);
    autoNavTargetPosition.y = AUTO_NAV_HOVER_ALTITUDE;
    autoNavTargetPlotId = targetPlotId;
    autoNavReachedTarget = false; 
    isHoveringValidPlot = false; 
    updatePlacementButtonState(); 

    disableManualControls();

    updateDroneUIButtonText("Cancel Auto-Pilot");
    const landButton = droneContainer.querySelector('.drone-land-btn');
    if (landButton) {
        landButton.onclick = cancelAutoNavigation; 
    }
}

export function cancelAutoNavigation() {
    if (!isAutoNavigating) return;

    console.log("Cancelling auto-navigation.");
    isAutoNavigating = false;
    window.isAutoNavigating = false;
    autoNavTargetPlotId = null;
    autoNavReachedTarget = false;
    isHoveringValidPlot = false; 
    droneVelocity.multiplyScalar(0.5); 

    enableManualControls();

    updateDroneUIButtonText("Place LLM"); 
    updatePlacementButtonState(); 
    const landButton = droneContainer.querySelector('.drone-land-btn');
    if (landButton) {
        landButton.onclick = handlePlaceAttempt; 
    }
}

function disableManualControls() {
    resetControlState(); 
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    disableTouchButtonListeners();
    disableJoystickListeners();
}

function enableManualControls() {
    setupInputListeners(); 
}

function disableTouchButtonListeners() {
    droneContainer.querySelectorAll('.drone-touch-btn').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    });
}

function enableTouchButtonListeners() {
    droneContainer.querySelectorAll('.drone-touch-btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
    setupTouchButtonListeners();
}

function disableJoystickListeners() {
    if (joystickContainerElement) {
        joystickContainerElement.removeEventListener('touchstart', handleJoystickStart);
        joystickContainerElement.removeEventListener('touchmove', handleJoystickMove);
        joystickContainerElement.removeEventListener('touchend', handleJoystickEnd);
        joystickContainerElement.removeEventListener('touchcancel', handleJoystickEnd);
        joystickContainerElement.removeEventListener('mousedown', handleJoystickStart);
        window.removeEventListener('mousemove', handleJoystickMove);
        window.removeEventListener('mouseup', handleJoystickEnd);
        joystickContainerElement.style.opacity = '0.5';
        joystickContainerElement.style.pointerEvents = 'none';
        if (joystickActive) handleJoystickEnd(); 
    }
}

function enableJoystickListeners() {
    if (joystickContainerElement) {
        joystickContainerElement.style.opacity = '1';
        joystickContainerElement.style.pointerEvents = 'auto';
        setupJoystickListeners();
    }
}

function updateDroneUIButtonText(text) {
    const landButton = droneContainer.querySelector('.drone-land-btn');
    if (landButton) {
        landButton.textContent = text;
    }
}

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
                <p><strong>Click/Tap</strong> an available plot to auto-fly</p>
                <p>Use <strong>WASD</strong> or <strong>Joystick</strong> to move</p>
                <p>Use <strong>E/Q</strong> or <strong>▲/▼</strong> to change altitude</p>
                <p>Use <strong>←/→</strong> or <strong>↺/↻</strong> to rotate</p>
                <p>Press <strong>P</strong> or <strong>Button Below</strong> to place LLM</p>
                <p>Press <strong>Esc</strong> or <strong>Cancel Button</strong> to cancel</p>
            </div>

            <div class="drone-touch-controls">
                <div class="drone-joystick-container">
                    <div class="drone-joystick-thumb"></div>
                </div>

                <div class="drone-action-buttons">
                    <button class="drone-touch-btn" data-control="up">▲</button>
                    <button class="drone-touch-btn" data-control="rotateLeft">↺</button>
                    <button class="drone-touch-btn" data-control="down">▼</button>
                    <button class="drone-touch-btn" data-control="rotateRight">↻</button>
                </div>

                <button class="drone-touch-btn" data-control="forward"></button>
                <button class="drone-touch-btn" data-control="backward"></button>
                <button class="drone-touch-btn" data-control="left"></button>
                <button class="drone-touch-btn" data-control="right"></button>
            </div>

            <button class="drone-land-btn">Place LLM</button>
        </div>
    `;
    document.body.appendChild(droneContainer);

    joystickContainerElement = droneContainer.querySelector('.drone-joystick-container');
    joystickThumb = droneContainer.querySelector('.drone-joystick-thumb');

    const landButton = droneContainer.querySelector('.drone-land-btn');
    if (landButton) {
        landButton.onclick = handlePlaceAttempt;
    }
}

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
        propeller.position.set(propPos.x, armHeight / 2 + 0.05, propPos.z);
        droneModel.add(propeller);
    });

    llmModel = renderLLMCharacter(THREE, llm);

    llmModel.position.set(0, -(centralBodyHeight / 2 + 1.7), 0); 

    llmModel.castShadow = true;
    llmModel.receiveShadow = true;
    droneModel.add(llmModel);

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

function createPropeller(hubMaterial, bladeMaterial) {
    const propellerGroup = new THREE.Group();
    propellerGroup.name = "Propeller";

    const hubRadius = 0.1;
    const hubHeight = 0.08;
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(hubRadius, hubRadius, hubHeight, 8),
        hubMaterial
    );
    hub.castShadow = true;
    propellerGroup.add(hub);

    const blades = new THREE.Group();
    blades.name = "Blades";
    propellerGroup.add(blades);

    const bladeLength = 0.6;
    const bladeWidth = 0.1;
    const bladeThickness = 0.01;
    const bladeGeometry = new THREE.BoxGeometry(bladeLength, bladeThickness, bladeWidth);

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.castShadow = true;
    blades.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade2.rotation.y = Math.PI / 2;
    blade2.castShadow = true;
    blades.add(blade2);

    blades.position.y = hubHeight / 2 + bladeThickness / 2;

    return propellerGroup;
}

function setupInputListeners() {
    resetControlState(); 
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    enableTouchButtonListeners(); 
    enableJoystickListeners(); 
}

function removeInputListeners() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    disableTouchButtonListeners();
    disableJoystickListeners();
}

function resetControlState() {
    for (const key in droneControls) {
        droneControls[key] = false;
    }
    touchActiveControls = {};
    if (joystickActive) {
        handleJoystickEnd();
    }
}

function handleKeyDown(event) {
    if (!droneActive || isAutoNavigating) return; 

    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        return;
    }

    const key = event.key.toLowerCase();
    let handled = true;

    switch (key) {
        case 'w': droneControls.backward = true; break;
        case 's': droneControls.forward = true; break;
        case 'a': droneControls.left = true; break;
        case 'd': droneControls.right = true; break;
        case 'q': droneControls.down = true; break;
        case 'e': droneControls.up = true; break;
        case 'arrowleft': droneControls.rotateLeft = true; break;
        case 'arrowright': droneControls.rotateRight = true; break;
        case 'p': handlePlaceAttempt(); break;
        case 'escape': deactivateDroneTransport(true); break;
        default: handled = false;
    }
    if (handled) event.preventDefault();
}

function handleKeyUp(event) {
    if (!droneActive || isAutoNavigating) return; 

    const key = event.key.toLowerCase();
    switch (key) {
        case 'w': droneControls.backward = false; break;
        case 's': droneControls.forward = false; break;
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
        if (!['forward', 'backward', 'left', 'right'].includes(control)) {
            btn.removeEventListener('touchstart', handleTouchStartWrapper);
            btn.removeEventListener('touchend', handleTouchEndWrapper);
            btn.removeEventListener('touchcancel', handleTouchEndWrapper);
            btn.removeEventListener('mousedown', handleTouchStartWrapper);
            btn.removeEventListener('mouseup', handleTouchEndWrapper);
            btn.removeEventListener('mouseleave', handleTouchEndWrapper);

            btn.addEventListener('touchstart', handleTouchStartWrapper, { passive: false });
            btn.addEventListener('touchend', handleTouchEndWrapper);
            btn.addEventListener('touchcancel', handleTouchEndWrapper);
            btn.addEventListener('mousedown', handleTouchStartWrapper);
            btn.addEventListener('mouseup', handleTouchEndWrapper);
            btn.addEventListener('mouseleave', handleTouchEndWrapper);

            btn.dataset.controlRef = control;
        }
    });
}

function handleTouchStartWrapper(e) {
    if (isAutoNavigating) return; 
    handleTouchStart(e, e.currentTarget.dataset.controlRef);
}

function handleTouchEndWrapper(e) {
    if (isAutoNavigating) return; 
    handleTouchEnd(e, e.currentTarget.dataset.controlRef);
}

function handleTouchStart(event, control) {
    event.preventDefault();
    event.stopPropagation();
    droneControls[control] = true;
    touchActiveControls[control] = true;
    const targetButton = event.currentTarget;
    if (targetButton) targetButton.style.backgroundColor = 'rgba(60, 179, 113, 0.8)';
}

function handleTouchEnd(event, control) {
    event.preventDefault();
    event.stopPropagation();
    if (touchActiveControls.hasOwnProperty(control)) {
        droneControls[control] = false;
        delete touchActiveControls[control];
    }
    const btn = droneContainer.querySelector(`.drone-touch-btn[data-control="${control}"]`);
    if (btn) {
        btn.style.backgroundColor = 'rgba(60, 179, 113, 0.4)';
    }
}

function setupJoystickListeners() {
    if (!joystickContainerElement || !joystickThumb) return;

    const rect = joystickContainerElement.getBoundingClientRect();
    joystickOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
    joystickRadius = rect.width / 2;

    joystickContainerElement.removeEventListener('touchstart', handleJoystickStart);
    joystickContainerElement.removeEventListener('touchmove', handleJoystickMove);
    joystickContainerElement.removeEventListener('touchend', handleJoystickEnd);
    joystickContainerElement.removeEventListener('touchcancel', handleJoystickEnd);
    joystickContainerElement.removeEventListener('mousedown', handleJoystickStart);
    window.removeEventListener('mousemove', handleJoystickMove);
    window.removeEventListener('mouseup', handleJoystickEnd);

    joystickContainerElement.addEventListener('touchstart', handleJoystickStart, { passive: false });
    joystickContainerElement.addEventListener('touchmove', handleJoystickMove, { passive: false });
    joystickContainerElement.addEventListener('touchend', handleJoystickEnd);
    joystickContainerElement.addEventListener('touchcancel', handleJoystickEnd);

    joystickContainerElement.addEventListener('mousedown', handleJoystickStart);
    window.addEventListener('mousemove', handleJoystickMove);
    window.addEventListener('mouseup', handleJoystickEnd);
}

function handleJoystickStart(event) {
    if (isAutoNavigating) return; 

    event.preventDefault();
    joystickActive = true;
    const rect = joystickContainerElement.getBoundingClientRect();
    joystickOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
    handleJoystickMove(event);
}

function handleJoystickMove(event) {
    if (!joystickActive || isAutoNavigating) return; 

    event.preventDefault();

    let clientX, clientY;
    if (event.touches) {
        if (event.touches.length === 0) return;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const deltaX = clientX - joystickOrigin.x;
    const deltaY = clientY - joystickOrigin.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    let displacement = Math.min(distance, JOYSTICK_MAX_DISPLACEMENT);
    const clampedX = Math.cos(angle) * displacement;
    const clampedY = Math.sin(angle) * displacement;

    joystickThumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    const threshold = JOYSTICK_MAX_DISPLACEMENT * 0.2;
    const controlStrength = displacement / JOYSTICK_MAX_DISPLACEMENT;

    if (clampedY < -threshold) {
        droneControls.backward = true;
        droneControls.forward = false;
    } else if (clampedY > threshold) {
        droneControls.forward = true;
        droneControls.backward = false;
    } else {
        droneControls.forward = false;
        droneControls.backward = false;
    }

    if (clampedX < -threshold) {
        droneControls.left = true;
        droneControls.right = false;
    } else if (clampedX > threshold) {
        droneControls.right = true;
        droneControls.left = false;
    } else {
        droneControls.left = false;
        droneControls.right = false;
    }
}

function handleJoystickEnd(event) {
    if (!joystickActive && event && event.type !== 'mouseup' && event.type !== 'mouseleave') return;
    joystickActive = false;

    if (joystickThumb) { 
        joystickThumb.style.transform = 'translate(0, 0)';
    }

    droneControls.forward = false;
    droneControls.backward = false;
    droneControls.left = false;
    droneControls.right = false;
}

function updateDroneState() {
    if (!droneModel || !droneActive) return; 

    if (isAutoNavigating) {
        updateAutoNavigationPhysics();
    } else {
        updateManualPhysics();
    }

    if (droneModel.position.y < MIN_ALTITUDE) {
        droneModel.position.y = MIN_ALTITUDE;
        droneVelocity.y = Math.max(0, droneVelocity.y);
    }

    const mapBoundary = (config.citySize || 500) / 2;
    droneModel.position.x = THREE.MathUtils.clamp(droneModel.position.x, -mapBoundary, mapBoundary);
    droneModel.position.z = THREE.MathUtils.clamp(droneModel.position.z, -mapBoundary, mapBoundary);

    droneModel.traverse(child => {
        if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
            const parentPosition = child.parent.position;
            const direction = (parentPosition.x > 0) ? 1 : -1;
            const speedSq = droneVelocity.lengthSq();
            const propellerSpeed = 1.0 + Math.abs(droneVelocity.y) * 8 + (droneControls.up ? 1 : (droneControls.down ? -0.5 : 0)) * 2 + Math.sqrt(speedSq) * 5;
            child.rotation.y += propellerSpeed * direction * 0.25;
        }
    });

    if (!isPlacing) {
        checkHoveringPlot();
        updatePlacementButtonState(); 
    }
}

function updateManualPhysics() {
    let targetRotationY = 0;
    if (droneControls.rotateLeft) targetRotationY += ROTATION_SPEED;
    if (droneControls.rotateRight) targetRotationY -= ROTATION_SPEED;

    droneAngularVelocity.y += targetRotationY;
    droneAngularVelocity.y *= ROTATION_DAMPING;
    droneAngularVelocity.y = THREE.MathUtils.clamp(droneAngularVelocity.y, -MAX_ROTATION_SPEED, MAX_ROTATION_SPEED);
    droneModel.rotation.y += droneAngularVelocity.y;

    const forwardVector = new THREE.Vector3();
    droneModel.getWorldDirection(forwardVector).negate(); 

    const rightVector = new THREE.Vector3().crossVectors(mainCityCamera.up, forwardVector).normalize();

    let targetVelocityInput = new THREE.Vector3();
    if (droneControls.forward) targetVelocityInput.add(forwardVector);
    if (droneControls.backward) targetVelocityInput.sub(forwardVector);
    if (droneControls.left) targetVelocityInput.sub(rightVector);
    if (droneControls.right) targetVelocityInput.add(rightVector);

    const horizontalMagnitudeSq = targetVelocityInput.x * targetVelocityInput.x + targetVelocityInput.z * targetVelocityInput.z;
    if (horizontalMagnitudeSq > 1e-6) {
        const scale = 1.0 / Math.sqrt(horizontalMagnitudeSq);
        targetVelocityInput.x *= scale;
        targetVelocityInput.z *= scale;
    }

    let verticalVelocityInput = 0;
    if (droneControls.up) verticalVelocityInput += VERTICAL_SPEED;
    if (droneControls.down) verticalVelocityInput -= VERTICAL_SPEED;

    droneVelocity.x += (targetVelocityInput.x * MAX_SPEED - droneVelocity.x) * ACCELERATION;
    droneVelocity.z += (targetVelocityInput.z * MAX_SPEED - droneVelocity.z) * ACCELERATION;
    droneVelocity.y += (verticalVelocityInput - droneVelocity.y) * ACCELERATION;

    droneVelocity.x *= DECELERATION;
    droneVelocity.z *= DECELERATION;
    droneVelocity.y *= DECELERATION;

    const currentSpeedSq = droneVelocity.x * droneVelocity.x + droneVelocity.z * droneVelocity.z;
    if (currentSpeedSq > MAX_SPEED * MAX_SPEED) {
        const scale = MAX_SPEED / Math.sqrt(currentSpeedSq);
        droneVelocity.x *= scale;
        droneVelocity.z *= scale;
    }

    droneModel.position.add(droneVelocity);
}

function updateAutoNavigationPhysics() {
    const directionToTarget = new THREE.Vector3().subVectors(autoNavTargetPosition, droneModel.position);
    const distanceToTarget = directionToTarget.length();

    if (distanceToTarget < AUTO_NAV_STOP_THRESHOLD && !autoNavReachedTarget) {
        droneVelocity.set(0, 0, 0);
        droneAngularVelocity.set(0, 0, 0);
        isAutoNavigating = false; 
        window.isAutoNavigating = false;
        autoNavReachedTarget = true; 

        enableManualControls();
        updateDroneUIButtonText("Place LLM");
        const landButton = droneContainer.querySelector('.drone-land-btn');
        if (landButton) landButton.onclick = handlePlaceAttempt;

        checkHoveringPlot();
        updatePlacementButtonState();
    } else if (distanceToTarget < AUTO_NAV_ARRIVAL_THRESHOLD) {
        droneVelocity.multiplyScalar(0.90); 
        droneAngularVelocity.y *= 0.85;
        droneModel.rotation.y += droneAngularVelocity.y; 
        droneModel.position.add(droneVelocity); 
    } else {
        let deltaRotation = Math.atan2(directionToTarget.x, directionToTarget.z) - droneModel.rotation.y;

        while (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2;
        while (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2;

        const rotationStep = THREE.MathUtils.clamp(deltaRotation, -AUTO_NAV_ROTATION_SPEED, AUTO_NAV_ROTATION_SPEED);
        droneModel.rotation.y += rotationStep;

        directionToTarget.normalize();
        droneVelocity.x += (directionToTarget.x * AUTO_NAV_SPEED - droneVelocity.x) * ACCELERATION * 2; 
        droneVelocity.z += (directionToTarget.z * AUTO_NAV_SPEED - droneVelocity.z) * ACCELERATION * 2;
        droneVelocity.y += (directionToTarget.y * AUTO_NAV_SPEED - droneVelocity.y) * ACCELERATION * 2; 

        const currentSpeedSq = droneVelocity.x * droneVelocity.x + droneVelocity.z * droneVelocity.z + droneVelocity.y * droneVelocity.y;
        if (currentSpeedSq > AUTO_NAV_SPEED * AUTO_NAV_SPEED) {
            const scale = AUTO_NAV_SPEED / Math.sqrt(currentSpeedSq);
            droneVelocity.multiplyScalar(scale);
        }

        droneModel.position.add(droneVelocity);
    }
}

function checkHoveringPlot() {
    if (!droneActive || !droneModel || isPlacing) {
        isHoveringValidPlot = false;
        return;
    }

    const raycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(mainCityScene.children, true);

    let foundValidPlot = false;
    for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj && (!obj.userData || (obj.userData.type !== 'lot' && obj.userData.type !== 'lot_target')) && obj.name !== 'primaryGround') {
            obj = obj.parent;
        }

        if (obj && obj.userData && (obj.userData.type === 'lot' || obj.userData.type === 'lot_target')) {
            const plotData = cityData.lots.find(lot => lot.id === obj.userData.id);
            if (plotData && plotData.available) {
                const distFromCenterX = Math.abs(droneModel.position.x - plotData.x);
                const distFromCenterZ = Math.abs(droneModel.position.z - plotData.z);
                if (distFromCenterX < plotData.width / 2 && distFromCenterZ < plotData.height / 2) {
                    foundValidPlot = true;
                    break; 
                }
            }
        }
        if (obj && obj.name === 'primaryGround') {
            break;
        }
    }

    isHoveringValidPlot = foundValidPlot;
}

function updatePlacementButtonState() {
    const landButton = droneContainer?.querySelector('.drone-land-btn');
    if (landButton) {
        if (isHoveringValidPlot && !isAutoNavigating && !isPlacing) {
            landButton.disabled = false;
            landButton.style.opacity = '1';
            landButton.style.cursor = 'pointer';
        } else {
            landButton.disabled = true;
            landButton.style.opacity = '0.5';
            landButton.style.cursor = 'not-allowed';
            if (!isAutoNavigating && !isPlacing) {
                landButton.textContent = "Place LLM";
            } else if (isAutoNavigating) {
                landButton.textContent = "Cancel Auto-Pilot"; 
                landButton.disabled = false; 
                landButton.style.opacity = '1';
                landButton.style.cursor = 'pointer';
            } else if (isPlacing) {
                landButton.textContent = "Placing...";
            }
        }
    }
}

function handlePlaceAttempt() {
    if (!isHoveringValidPlot || isAutoNavigating || isPlacing) return;

    console.log("Starting placement sequence...");
    isPlacing = true;
    placementStartTime = performance.now();
    updatePlacementButtonState(); 

    disableManualControls();

    startPlacementSequence();
}

function startPlacementSequence() {
    if (!droneModel) {
        console.error("Cannot start placement: Drone model not found.");
        isPlacing = false;
        updatePlacementButtonState();
        enableManualControls();
        return;
    }

    const startY = droneModel.position.y;
    const targetY = PLACEMENT_FINAL_DRONE_HEIGHT;
    const duration = PLACEMENT_DURATION;
    let placementFrameId = null;

    function animatePlacement() {
        if (!isPlacing || !droneModel) { 
            if (placementFrameId) cancelAnimationFrame(placementFrameId);
            console.log("Placement animation cancelled or drone missing.");
            return;
        }

        const elapsed = performance.now() - placementStartTime;
        let progress = Math.min(elapsed / duration, 1);
        progress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        droneModel.position.y = THREE.MathUtils.lerp(startY, targetY, progress);

        const propellerSpeed = (1.0 - progress) * 2.0 + 0.5; 
        droneModel.traverse(child => {
            if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
                const parentPosition = child.parent.position;
                const direction = (parentPosition.x > 0) ? 1 : -1;
                child.rotation.y += propellerSpeed * direction * 0.25;
            }
        });

        if (progress < 1) {
            placementFrameId = requestAnimationFrame(animatePlacement);
        } else {
            console.log("Lowering complete. Placing LLM.");

            const finalRaycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0));
            const finalIntersects = finalRaycaster.intersectObjects(mainCityScene.children, true);

            let targetPlot = null;
            let groundIntersectPoint = null; 

            for (const intersect of finalIntersects) {
                let obj = intersect.object;
                while (obj && (!obj.userData || (obj.userData.type !== 'lot' && obj.userData.type !== 'lot_target')) && obj.name !== 'primaryGround') {
                    obj = obj.parent;
                }
                if (obj && obj.userData && (obj.userData.type === 'lot' || obj.userData.type === 'lot_target')) {
                    if (!cityData || !Array.isArray(cityData.lots)) {
                        console.error("Critical Error: cityData or cityData.lots is not available in animatePlacement!");
                        targetPlot = null;
                        break;
                    }
                    const plotData = cityData.lots.find(lot => lot.id === obj.userData.id);
                    if (plotData && plotData.available) {
                        targetPlot = plotData;
                        groundIntersectPoint = intersect.point; 
                        break;
                    }
                }
                if (obj && obj.name === 'primaryGround') {
                     if (!targetPlot && isHoveringValidPlot) {
                         const nearbyPlot = cityData.lots.find(lot => {
                             const dx = Math.abs(droneModel.position.x - lot.x);
                             const dz = Math.abs(droneModel.position.z - lot.z);
                             return lot.available && dx < lot.width / 2 && dz < lot.height / 2;
                         });
                         if (nearbyPlot) {
                             targetPlot = nearbyPlot;
                             groundIntersectPoint = intersect.point; 
                             console.log("Placement: Hit ground, but determined plot based on hover:", targetPlot.name);
                         }
                     }
                    break;
                }
            }

            if (targetPlot && groundIntersectPoint) {
                placeLLMOnPlot(targetPlot, groundIntersectPoint); 
            } else {
                console.error("Placement failed: Could not find valid plot or ground beneath final position.");
                isPlacing = false;
                enableManualControls(); 
                updatePlacementButtonState(); 
            }
        }
    }

    animatePlacement();
}

function placeLLMOnPlot(plotData, groundPoint) { 
    if (!currentLLMTransporting || !mainCityScene) return;

    if (!cityData || !Array.isArray(cityData.lots)) {
        console.error("Critical Error: cityData or cityData.lots is not available in placeLLMOnPlot!");
        deactivateDroneTransport(true); 
        return;
    }

    const placedLLMModel = renderLLMCharacter(THREE, currentLLMTransporting);

    placedLLMModel.position.set(groundPoint.x, droneModel.position.y, groundPoint.z); 

    let offsetToGround = 0;
    let modelOriginY = placedLLMModel.position.y;
    try {
        placedLLMModel.updateMatrixWorld(true); 
        const box = new THREE.Box3().setFromObject(placedLLMModel);
        const lowestPointY = box.min.y;
        offsetToGround = modelOriginY - lowestPointY; 
        console.log(`Model BBox Min Y: ${lowestPointY}, Origin Y: ${modelOriginY}, Calculated Offset: ${offsetToGround}`);
        if (isNaN(offsetToGround)) {
             console.warn("OffsetToGround calculation resulted in NaN. Using fallback.");
             offsetToGround = 0.85; 
         }
    } catch (error) {
        console.error("Error calculating bounding box for placement:", error);
        offsetToGround = 0.85; 
    }

    placedLLMModel.position.y = groundPoint.y + offsetToGround + 0.01;

    const directionToCenter = new THREE.Vector3(plotData.x - placedLLMModel.position.x, 0, plotData.z - placedLLMModel.position.z).normalize();
    if (directionToCenter.lengthSq() > 0.001) {
        placedLLMModel.rotation.y = Math.atan2(directionToCenter.x, directionToCenter.z) + Math.PI; 
    } else {
        placedLLMModel.rotation.y = droneModel ? droneModel.rotation.y : 0; 
    }

    placedLLMModel.castShadow = true;
    placedLLMModel.receiveShadow = true;
    placedLLMModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    mainCityScene.add(placedLLMModel);

    const currentPlotData = cityData.lots.find(lot => lot.id === plotData.id);
    if (!currentPlotData) {
        console.error(`Critical Error: Could not find plot data with ID ${plotData.id} in cityData.lots during final placement update.`);
        deactivateDroneTransport(true); 
        return;
    }
    currentPlotData.available = false;
    currentPlotData.occupiedBy = currentLLMTransporting.id;

    console.log(`Removing click target for plot ID: ${currentPlotData.id}`);
    const objectsToRemove = []; 
    mainCityScene.traverse(obj => {
        if (obj && obj.userData && obj.userData.id === currentPlotData.id) {
            if (obj.name === 'plot_click_target') {
                objectsToRemove.push(obj); 
            }
        }
    });
    objectsToRemove.forEach(obj => {
        if (obj.parent) {
            disposeHierarchy(obj); 
            console.log(`Removed ${obj.name} (ID: ${obj.userData.id})`);
        }
    });

    import('./plotHoverInfo.js').then(module => {
        if (typeof module.hidePlotInfoPanel === 'function') {
            module.hidePlotInfoPanel();
        }
    });

    console.log(`LLM ${currentLLMTransporting.name} placed on plot ${currentPlotData.name}. Final Position:`, placedLLMModel.position);

    deactivateDroneTransport(false, placedLLMModel.position.clone());
}

function disposeHierarchy(object) {
    if (!object) {
        console.warn("disposeHierarchy called with null or undefined object.");
        return;
    }

    object.traverse(child => {
        if (child && child.isMesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (material) {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        }
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        }
    });
    if (object.parent) {
        object.parent.remove(object);
    }
}

export function deactivateDroneTransport(cancel = false, focusTarget = null) {
    if (!droneActive) return;

    if (isPlacing) {
        console.log("Cancelling placement sequence.");
        isPlacing = false; 
        enableManualControls(); 
    }

    if (isAutoNavigating) {
        cancelAutoNavigation();
    }

    droneActive = false;
    window.droneActive = false;
    isHoveringValidPlot = false; 

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
        }, 500);
    }

    if (droneModel) {
        if (llmModel && llmModel.parent === droneModel) {
            droneModel.remove(llmModel);
        }
        if (droneModel.parent) {
            droneModel.parent.remove(droneModel);
        }
        disposeHierarchy(droneModel); 
        droneModel = null;
        llmModel = null;
    }

    playTrack('city'); 

    if (mainCityControls) {
        mainCityControls.enabled = true;

        if (cancel || !focusTarget) { 
            if (originalCameraPosition && originalCameraTarget) {
                console.log("Starting camera transition back...");
                const transitionDuration = 1000;
                const startTime = performance.now();
                const startCamPos = mainCityCamera.position.clone();
                const startTarget = mainCityControls.target.clone();

                function transitionBack() {
                    if (window.droneActive) { 
                        console.log("Drone reactivated, cancelling camera return transition.");
                        cameraTransitionId = null;
                        return;
                    }
                    if (!originalCameraPosition || !originalCameraTarget) {
                        console.warn("Original camera state missing during transition. Stopping.");
                        cameraTransitionId = null;
                        if (mainCityControls) mainCityControls.enabled = true;
                        return;
                    }

                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / transitionDuration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);

                    mainCityCamera.position.lerpVectors(startCamPos, originalCameraPosition, easeProgress);
                    mainCityControls.target.lerpVectors(startTarget, originalCameraTarget, easeProgress);

                    mainCityCamera.lookAt(mainCityControls.target);
                    mainCityControls.update();

                    if (progress < 1) {
                        cameraTransitionId = requestAnimationFrame(transitionBack);
                    } else {
                        console.log("Camera transition back complete.");
                        mainCityCamera.position.copy(originalCameraPosition);
                        mainCityControls.target.copy(originalCameraTarget);
                        mainCityCamera.lookAt(mainCityControls.target);
                        mainCityControls.update();

                        originalCameraPosition = null;
                        originalCameraTarget = null;
                        cameraTransitionId = null;
                        mainCityControls.enabled = true;
                    }
                }
                if (cameraTransitionId) {
                    cancelAnimationFrame(cameraTransitionId);
                }
                cameraTransitionId = requestAnimationFrame(transitionBack);
            } else {
                console.warn("No valid original camera state to transition back to.");
                mainCityControls.target.set(0, 0, 0);
                mainCityControls.update();
                if (mainCityCamera) mainCityCamera.lookAt(mainCityControls.target);
                mainCityControls.enabled = true;
                originalCameraPosition = null;
                originalCameraTarget = null;
            }
        } else { 
            console.log("Placement successful. Focusing camera on placed LLM at:", focusTarget);

            mainCityControls.target.copy(focusTarget);

            const currentCamPos = mainCityCamera.position.clone();
            const direction = new THREE.Vector3().subVectors(currentCamPos, focusTarget).normalize();
            if (direction.lengthSq() > 0.001) {
                mainCityCamera.position.copy(focusTarget).add(direction.multiplyScalar(10)); 
            } else {
                mainCityCamera.position.copy(focusTarget).add(new THREE.Vector3(0, 5, 10));
            }
            mainCityCamera.position.y = Math.max(mainCityCamera.position.y, 3); 

            mainCityCamera.lookAt(mainCityControls.target);
            mainCityControls.update();

            originalCameraPosition = null;
            originalCameraTarget = null;
            if (cameraTransitionId) { 
                cancelAnimationFrame(cameraTransitionId);
                cameraTransitionId = null;
            }
        }
    }
    if (cancel) console.log('Drone transport cancelled');
    currentLLMTransporting = null;
}

function animateDrone() {
    if (!droneActive) return;
    droneAnimationId = requestAnimationFrame(animateDrone);

    if (!isPlacing) {
        updateDroneState();
        positionCameraForDroneView();
    }

    // Rendering is handled by the main cityScene loop
}

function positionCameraForDroneView(instant = false) {
    if (!droneModel || !mainCityCamera || !mainCityControls) return;

    mainCityControls.enabled = false;

    const offset = new THREE.Vector3(0, CAMERA_FOLLOW_HEIGHT, -CAMERA_FOLLOW_DISTANCE);

    offset.applyQuaternion(droneModel.quaternion);

    const targetCamPos = droneModel.position.clone().add(offset);

    const targetLookAt = droneModel.position.clone().add(new THREE.Vector3(0, 0.5, 0));

    if (instant) {
        mainCityCamera.position.copy(targetCamPos);
        mainCityControls.target.copy(targetLookAt);
    } else {
        mainCityCamera.position.lerp(targetCamPos, CAMERA_LERP_FACTOR);
        mainCityControls.target.lerp(targetLookAt, CAMERA_LERP_FACTOR);
    }

    mainCityCamera.lookAt(mainCityControls.target);
}