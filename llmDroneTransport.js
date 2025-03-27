import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';
import { llmDataManager } from './llmDataManager.js';

let droneActive = false;
let droneModel, llmModel;
let droneScene, droneCamera, droneRenderer;
let droneControls = { forward: false, backward: false, left: false, right: false, up: false, down: false };
let dronePosition = new THREE.Vector3(0, 15, 0);
let droneRotation = new THREE.Euler(0, 0, 0);
let droneSpeed = 0.25;
let droneAnimationId = null;
let originalCameraPosition, originalCameraTarget;
let droneContainer;

export function activateDroneTransport(llmId) {
    if (droneActive) return;
    
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    console.log(`Activating drone transport for LLM: ${llm.name}`);
    
    // Close collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');
    
    // Create drone UI container if it doesn't exist
    createDroneUI();
    
    // Show the drone UI
    droneContainer.classList.add('active');
    
    // Save original camera position from city scene
    if (window.camera) {
        originalCameraPosition = window.camera.position.clone();
        originalCameraTarget = window.controls ? window.controls.target.clone() : new THREE.Vector3(0, 0, 0);
    }
    
    // Initialize drone scene, which will be overlaid on city scene
    initDroneScene(llm);
    
    // Set up keyboard and touch controls
    setupDroneControls();
    
    droneActive = true;
}

function createDroneUI() {
    // Remove existing container if any
    const existingContainer = document.getElementById('drone-transport-ui');
    if (existingContainer) existingContainer.remove();
    
    // Create container
    droneContainer = document.createElement('div');
    droneContainer.id = 'drone-transport-ui';
    droneContainer.className = 'drone-transport-ui';
    
    // Add controls info
    droneContainer.innerHTML = `
        <div class="drone-controls-info">
            <div class="drone-controls-title">Drone Transport</div>
            <div class="drone-instructions">
                <p>Use WASD to move horizontally</p>
                <p>Use E/Q to go up/down</p>
                <p>Use arrow keys to rotate</p>
            </div>
            <div class="drone-touch-controls">
                <div class="touch-control-row">
                    <button class="drone-touch-btn" data-control="up">↑</button>
                </div>
                <div class="touch-control-row">
                    <button class="drone-touch-btn" data-control="left">←</button>
                    <button class="drone-touch-btn" data-control="down">↓</button>
                    <button class="drone-touch-btn" data-control="right">→</button>
                </div>
            </div>
            <button class="drone-land-btn">Land Drone</button>
        </div>
    `;
    
    document.body.appendChild(droneContainer);
    
    // Add event listener for landing button
    droneContainer.querySelector('.drone-land-btn').addEventListener('click', landDrone);
    
    // Add event listeners for touch controls
    droneContainer.querySelectorAll('.drone-touch-btn').forEach(btn => {
        const control = btn.getAttribute('data-control');
        
        btn.addEventListener('touchstart', () => {
            droneControls[control] = true;
        });
        
        btn.addEventListener('touchend', () => {
            droneControls[control] = false;
        });
        
        // Mouse events for desktop testing
        btn.addEventListener('mousedown', () => {
            droneControls[control] = true;
        });
        
        btn.addEventListener('mouseup', () => {
            droneControls[control] = false;
        });
    });
}

function initDroneScene(llm) {
    // Create the drone model
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
    
    // Add to the main city scene
    if (window.currentHumanoidScene) {
        window.currentHumanoidScene.add(droneModel);
    }
    
    // Position the drone
    droneModel.position.copy(dronePosition);
}

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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(event) {
    if (!droneActive) return;
    
    switch(event.key) {
        case 'w': droneControls.forward = true; break;
        case 's': droneControls.backward = true; break;
        case 'a': droneControls.left = true; break;
        case 'd': droneControls.right = true; break;
        case 'q': droneControls.down = true; break;
        case 'e': droneControls.up = true; break;
        case 'ArrowLeft': rotateY(0.1); break;
        case 'ArrowRight': rotateY(-0.1); break;
        case 'ArrowUp': rotateX(-0.1); break;
        case 'ArrowDown': rotateX(0.1); break;
        case 'Escape': landDrone(); break;
    }
}

function handleKeyUp(event) {
    if (!droneActive) return;
    
    switch(event.key) {
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

function updateDronePosition() {
    if (!droneModel) return;
    
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
    
    // Update camera position to follow drone
    if (window.camera) {
        // Calculate camera position behind and above the drone
        const offset = new THREE.Vector3(0, 3, 5);
        offset.applyEuler(droneModel.rotation);
        
        const targetPos = droneModel.position.clone().add(offset);
        
        // Smoothly move camera to target position
        window.camera.position.lerp(targetPos, 0.05);
        
        // Look at the drone
        window.camera.lookAt(droneModel.position);
    }
    
    // Animate propellers
    if (droneModel) {
        droneModel.traverse(child => {
            if (child.userData && child.userData.isPropeller) {
                child.rotation.y += 0.3; // Rotate propellers
            }
        });
    }
}

function animateDrone() {
    if (!droneActive) return;
    
    droneAnimationId = requestAnimationFrame(animateDrone);
    
    updateDronePosition();
}

function landDrone() {
    droneActive = false;
    
    // Remove event listeners
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    
    // Stop animation
    if (droneAnimationId) {
        cancelAnimationFrame(droneAnimationId);
    }
    
    // Hide drone UI
    droneContainer.classList.remove('active');
    
    // Remove drone model
    if (droneModel && droneModel.parent) {
        droneModel.parent.remove(droneModel);
    }
    
    // Restore camera position
    if (window.camera && originalCameraPosition) {
        window.camera.position.copy(originalCameraPosition);
        if (window.controls) {
            window.controls.target.copy(originalCameraTarget);
            window.controls.update();
        }
    }
    
    console.log('Drone has landed');
}