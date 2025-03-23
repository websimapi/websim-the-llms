// New file to handle LLM view details with retry logic
import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';

let viewScene, viewCamera, viewRenderer;
let viewModel = null;
let viewAnimation;
let retryCount = 0;
const MAX_RETRIES = 3;

export function renderLLMModel(llm, isRetry = false) {
    if (!viewScene) return false;
    
    // Clear loading state from previous attempts
    const viewport = document.querySelector('.llm-detail-viewport');
    if (viewport) {
        // Remove any existing loading/error indicators
        const existingIndicators = viewport.querySelectorAll('.view-model-indicator');
        existingIndicators.forEach(el => el.remove());
    }
    
    // Show loading indicator
    showViewportMessage('Loading model...', 'loading');
    
    // Remove existing model if any
    if (viewModel && viewModel.parent) {
        viewModel.parent.remove(viewModel);
        viewModel = null;
    }
    
    try {
        if (llm.customCharacterCode) {
            // Create from custom character code
            viewModel = createCustomCharacter(THREE, llm.customCharacterCode);
        } else {
            // Create standard model
            viewModel = createStandardModel(llm);
        }
        
        // Check if model was successfully created
        if (!viewModel) {
            throw new Error('Failed to create model');
        }
        
        viewScene.add(viewModel);
        
        // Clear any existing loading/error messages
        clearViewportMessages();
        
        // Reset retry count on success
        retryCount = 0;
        return true;
    } catch (error) {
        console.error("Error rendering LLM model:", error);
        
        if (!isRetry) {
            // If this wasn't already a retry attempt, start retry process
            return retryRenderModel(llm);
        } else {
            // Show error message if this was already a retry
            showViewportMessage('Error loading model. Please try again.', 'error');
            // Add retry button
            addRetryButton(llm);
            return false;
        }
    }
}

function retryRenderModel(llm) {
    retryCount++;
    
    if (retryCount <= MAX_RETRIES) {
        showViewportMessage(`Retry attempt ${retryCount}/${MAX_RETRIES}...`, 'loading');
        
        // Wait a moment before retrying
        setTimeout(() => {
            const success = renderLLMModel(llm, true);
            if (!success && retryCount < MAX_RETRIES) {
                retryRenderModel(llm);
            }
        }, 500);
        return true;
    } else {
        showViewportMessage('Failed to load model after multiple attempts.', 'error');
        addRetryButton(llm);
        retryCount = 0;
        return false;
    }
}

function addRetryButton(llm) {
    const viewport = document.querySelector('.llm-detail-viewport');
    if (!viewport) return;
    
    // Check if button already exists
    if (viewport.querySelector('.retry-button')) return;
    
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.textContent = 'Retry Loading';
    retryButton.addEventListener('click', () => {
        retryCount = 0;
        renderLLMModel(llm);
    });
    
    viewport.appendChild(retryButton);
}

function showViewportMessage(message, type = 'info') {
    const viewport = document.querySelector('.llm-detail-viewport');
    if (!viewport) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `view-model-indicator ${type}`;
    messageEl.textContent = message;
    viewport.appendChild(messageEl);
}

function clearViewportMessages() {
    const viewport = document.querySelector('.llm-detail-viewport');
    if (!viewport) return;
    
    const messages = viewport.querySelectorAll('.view-model-indicator');
    messages.forEach(msg => msg.remove());
    
    // Also remove retry button
    const retryButton = viewport.querySelector('.retry-button');
    if (retryButton) retryButton.remove();
}

function createStandardModel(llm) {
    // Create a robot model based on the stored properties
    const group = new THREE.Group();
    
    const color = new THREE.Color(llm.color || 0x3cb371);
    
    // Create head
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.3),
        metalness: 0.7,
        roughness: 0.3
    });
    
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        headMaterial
    );
    head.position.y = 1.8;
    group.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.85, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.85, 0.2);
    group.add(rightEye);
    
    // Create body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.8),
        metalness: 0.5,
        roughness: 0.5
    });
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        bodyMaterial
    );
    body.position.y = 1.2;
    group.add(body);
    
    // Create simple limbs
    const limbsMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Add simple arms and legs
    const arms = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 0.2),
        limbsMaterial
    );
    arms.position.y = 1.3;
    group.add(arms);
    
    const legs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 1),
        limbsMaterial
    );
    legs.position.y = 0.5;
    group.add(legs);
    
    return group;
}

export function setupViewScene(viewport) {
    if (!viewport) return false;
    
    // Clear existing content
    viewport.innerHTML = '';
    
    // Set up THREE.js scene
    viewScene = new THREE.Scene();
    viewScene.background = new THREE.Color(0x111111);
    
    // Set up camera
    viewCamera = new THREE.PerspectiveCamera(
        45,
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    viewCamera.position.set(0, 1.5, 4);
    viewCamera.lookAt(0, 1, 0);
    
    // Set up renderer
    viewRenderer = new THREE.WebGLRenderer({ antialias: true });
    viewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    viewRenderer.shadowMap.enabled = true;
    viewport.appendChild(viewRenderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    viewScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    viewScene.add(directionalLight);
    
    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -1;
    viewScene.add(floor);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (viewCamera && viewRenderer && viewport) {
            viewCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            viewCamera.updateProjectionMatrix();
            viewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
    
    return true;
}

export function startViewAnimation() {
    // Start animation
    animateViewModel();
}

export function stopViewAnimation() {
    // Cancel animation
    if (viewAnimation) {
        cancelAnimationFrame(viewAnimation);
        viewAnimation = null;
    }
}

function animateViewModel() {
    if (!viewScene || !viewCamera || !viewRenderer) return;
    
    viewAnimation = requestAnimationFrame(animateViewModel);
    
    // Simple idle animation
    if (viewModel) {
        const time = Date.now() * 0.001;
        
        // Gentle bobbing motion
        viewModel.position.y = Math.sin(time) * 0.05;
        
        // Gentle rotation
        viewModel.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    viewRenderer.render(viewScene, viewCamera);
}