import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';
import { getModelTypeIcon } from './llmCollectionView.js'; 
import { config } from './config.js'; 

let droneActive = false;
let droneModel, llmModel;
let dronePosition = new THREE.Vector3(0, 15, 0); 
let droneRotation = new THREE.Euler(0, 0, 0); 
let droneVelocity = new THREE.Vector3(); 
let droneAngularVelocity = new THREE.Euler(); 
let droneAnimationId = null;
let droneContainer;
let currentLLMTransporting = null;
let mainCityScene, mainCityCamera, mainCityControls;
let originalCameraPosition, originalCameraTarget;

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

    originalCameraPosition = mainCityCamera.position.clone();
    originalCameraTarget = mainCityControls.target.clone();

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

    animateDrone(); 
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
                <p>Use <strong>WASD</strong> to move horizontally</p>
                <p>Use <strong>E/Q</strong> to go up/down</p>
                <p>Use <strong>←/→</strong> keys to rotate</p>
                <p>Press <strong>P</strong> to place LLM</p>
                <p>Press <strong>Esc</strong> to cancel</p>
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
    llmModel.scale.set(0.4, 0.4, 0.4); 
    llmModel.position.set(0, -0.8, 0); 
    llmModel.castShadow = true;
    llmModel.receiveShadow = true;
    droneModel.add(llmModel);

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
    setupTouchButtonListeners();
    setupJoystickListeners();
    droneContainer.querySelector('.drone-land-btn').addEventListener('click', handlePlaceAttempt);
}

function removeInputListeners() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (joystickContainerElement) {
        joystickContainerElement.removeEventListener('touchstart', handleJoystickStart);
        joystickContainerElement.removeEventListener('touchmove', handleJoystickMove);
        joystickContainerElement.removeEventListener('touchend', handleJoystickEnd);
        joystickContainerElement.removeEventListener('mousedown', handleJoystickStart); 
        window.removeEventListener('mousemove', handleJoystickMove); 
        window.removeEventListener('mouseup', handleJoystickEnd); 
    }
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
    if (!droneActive) return;
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
    if (!droneActive) return;
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
            btn.addEventListener('touchstart', (e) => handleTouchStart(e, control), { passive: false }); 
            btn.addEventListener('touchend', (e) => handleTouchEnd(e, control));
            btn.addEventListener('touchcancel', (e) => handleTouchEnd(e, control)); 
            btn.addEventListener('mousedown', (e) => handleTouchStart(e, control));
            btn.addEventListener('mouseup', (e) => handleTouchEnd(e, control));
            btn.addEventListener('mouseleave', (e) => handleTouchEnd(e, control)); 
        }
    });
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

    joystickContainerElement.addEventListener('touchstart', handleJoystickStart, { passive: false });
    joystickContainerElement.addEventListener('touchmove', handleJoystickMove, { passive: false });
    joystickContainerElement.addEventListener('touchend', handleJoystickEnd);
    joystickContainerElement.addEventListener('touchcancel', handleJoystickEnd);

    joystickContainerElement.addEventListener('mousedown', handleJoystickStart); 
    window.addEventListener('mousemove', handleJoystickMove); 
    window.addEventListener('mouseup', handleJoystickEnd); 
}

function handleJoystickStart(event) {
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
    if (!joystickActive) return;
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
    if (!joystickActive && event.type !== 'mouseup' && event.type !== 'mouseleave') return; 
    joystickActive = false;

    joystickThumb.style.transform = 'translate(0, 0)';

    droneControls.forward = false;
    droneControls.backward = false;
    droneControls.left = false;
    droneControls.right = false;
}

function updateDronePhysics() {
    if (!droneModel) return;

    let targetRotationY = 0;
    if (droneControls.rotateLeft) targetRotationY += ROTATION_SPEED;
    if (droneControls.rotateRight) targetRotationY -= ROTATION_SPEED;

    droneAngularVelocity.y += targetRotationY;
    droneAngularVelocity.y *= ROTATION_DAMPING;
    droneAngularVelocity.y = THREE.MathUtils.clamp(droneAngularVelocity.y, -MAX_ROTATION_SPEED, MAX_ROTATION_SPEED);
    droneModel.rotation.y += droneAngularVelocity.y;

    const forwardVector = new THREE.Vector3();
    droneModel.getWorldDirection(forwardVector); 
    forwardVector.negate(); 

    const rightVector = new THREE.Vector3().crossVectors(mainCityCamera.up, forwardVector).normalize(); 

    let targetVelocity = new THREE.Vector3();
    if (droneControls.forward) targetVelocity.add(forwardVector); 
    if (droneControls.backward) targetVelocity.sub(forwardVector); 
    if (droneControls.left) targetVelocity.sub(rightVector);
    if (droneControls.right) targetVelocity.add(rightVector);

    const horizontalMagnitudeSq = targetVelocity.x * targetVelocity.x + targetVelocity.z * targetVelocity.z;
    if (horizontalMagnitudeSq > 1e-6) { 
        const scale = 1.0 / Math.sqrt(horizontalMagnitudeSq);
        targetVelocity.x *= scale;
        targetVelocity.z *= scale;
    }

    let verticalVelocityInput = 0;
    if (droneControls.up) verticalVelocityInput += VERTICAL_SPEED;
    if (droneControls.down) verticalVelocityInput -= VERTICAL_SPEED;

    droneVelocity.x += (targetVelocity.x * MAX_SPEED - droneVelocity.x) * ACCELERATION;
    droneVelocity.z += (targetVelocity.z * MAX_SPEED - droneVelocity.z) * ACCELERATION;
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

    if (droneModel.position.y < MIN_ALTITUDE) {
        droneModel.position.y = MIN_ALTITUDE;
        droneVelocity.y = Math.max(0, droneVelocity.y); 
    }

    const mapBoundary = (config.citySize || 500) / 2;
    if (droneModel.position.x < -mapBoundary) droneModel.position.x = -mapBoundary;
    if (droneModel.position.x > mapBoundary) droneModel.position.x = mapBoundary;
    if (droneModel.position.z < -mapBoundary) droneModel.position.z = -mapBoundary;
    if (droneModel.position.z > mapBoundary) droneModel.position.z = mapBoundary;

    const verticalThrust = droneControls.up ? 1 : (droneControls.down ? -0.5 : 0);
    const horizontalSpeed = Math.sqrt(currentSpeedSq);
    const propellerSpeed = 1.0 + Math.abs(droneVelocity.y) * 8 + verticalThrust * 2 + horizontalSpeed * 5;
    droneModel.traverse(child => {
        if (child.name === "Blades" && child.parent && child.parent.name === "Propeller") {
            const parentPosition = child.parent.position;
            const direction = (parentPosition.x > 0) ? 1 : -1;
            child.rotation.y += propellerSpeed * direction * 0.25; 
        }
    });
}

function animateDrone() {
    if (!droneActive) return;
    droneAnimationId = requestAnimationFrame(animateDrone);

    updateDronePhysics();
    positionCameraForDroneView(); 

    // Rendering is handled by the main cityScene loop
}

function handlePlaceAttempt() {
    if (!droneActive || !droneModel) return;

    const raycaster = new THREE.Raycaster(droneModel.position, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(mainCityScene.children, true); 

    let targetPlot = null;
    let intersectPoint = null; 

    for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj && (!obj.userData || obj.userData.type !== 'lot') && obj.name !== 'primaryGround' && obj.name !== 'construction_site') { 
            obj = obj.parent;
        }

        if (obj && obj.userData && obj.userData.type === 'lot') {
            targetPlot = cityData.lots.find(lot => lot.id === obj.userData.id);
            if (targetPlot) {
                intersectPoint = intersect.point; 
                break;
            }
        } else if (obj && obj.name === 'primaryGround') {
            break; 
        }
    }

    if (targetPlot) {
        if (targetPlot.available) {
            console.log(`Placing LLM ${currentLLMTransporting.name} on plot ${targetPlot.name}`);
            placeLLMOnPlot(targetPlot, intersectPoint); 
            deactivateDroneTransport(false); 
        } else {
            console.log(`Plot ${targetPlot.name} is already occupied.`);
        }
    } else {
        console.log("Not hovering over a valid plot.");
    }
}

function placeLLMOnPlot(plotData, placementPoint) {
    if (!currentLLMTransporting || !mainCityScene) return;

    const placedLLMModel = renderLLMCharacter(THREE, currentLLMTransporting);

    placedLLMModel.position.set(placementPoint.x, 0, placementPoint.z);

    const directionToCenter = new THREE.Vector3(0 - placementPoint.x, 0, 0 - placementPoint.z).normalize();
    placedLLMModel.rotation.y = Math.atan2(directionToCenter.x, directionToCenter.z);

    placedLLMModel.castShadow = true; 
    placedLLMModel.receiveShadow = true; 
    mainCityScene.add(placedLLMModel);

    plotData.available = false;
    plotData.occupiedBy = currentLLMTransporting.id;

    let plotOutlineToRemove = null;
    mainCityScene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot' && obj.userData.id === plotData.id) {
            while (obj.children.length > 0) {
                obj.remove(obj.children[0]);
            }
            plotOutlineToRemove = obj;
        }
    });
    if (plotOutlineToRemove && plotOutlineToRemove.parent) {
        plotOutlineToRemove.parent.remove(plotOutlineToRemove);
        import('./plotHoverInfo.js').then(module => {
            if (typeof module.hidePlotInfoPanel === 'function') {
                 module.hidePlotInfoPanel(); 
            }
        });
    }

    console.log(`LLM ${currentLLMTransporting.name} placed on plot ${plotData.name}.`);

    if (typeof cityData.saveGame === 'function') {
        console.log("City data state updated (but not persisted automatically).");
    }
}

export function deactivateDroneTransport(cancel = false) {
    if (!droneActive) return;
    droneActive = false;
    window.droneActive = false;

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
        droneModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.isMaterial) {
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
        mainCityControls.enabled = true; 
        if (originalCameraPosition && originalCameraTarget) {
            const transitionDuration = 1000; 
            const startTime = performance.now(); 
            const startCamPos = mainCityCamera.position.clone();
            const startTarget = mainCityControls.target.clone();

            function transitionBack() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / transitionDuration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                mainCityCamera.position.lerpVectors(startCamPos, originalCameraPosition, easeProgress);
                mainCityControls.target.lerpVectors(startTarget, originalCameraTarget, easeProgress);

                mainCityCamera.lookAt(mainCityControls.target);
                mainCityControls.update();

                if (progress < 1 && !window.droneActive) { 
                    requestAnimationFrame(transitionBack);
                } else if (!window.droneActive) { 
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
            mainCityControls.target.set(0, 0, 0);
            mainCityControls.update();
            if (mainCityCamera) mainCityCamera.lookAt(mainCityControls.target);
        }
    }

    if (cancel) console.log('Drone transport cancelled');
    currentLLMTransporting = null;
    originalCameraPosition = null;
    originalCameraTarget = null;
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

    mainCityControls.update();
}

function landDrone() {
    handlePlaceAttempt();
}