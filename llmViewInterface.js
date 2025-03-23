import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';

let viewScene, viewCamera, viewRenderer;
let viewModel = null;
let viewAnimation;

export function setupLLMViewInterface(llmId) {
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    // Get the details panel
    const detailsPanel = document.getElementById('llm-details-panel');
    
    // Update UI elements
    updateDetailsPanel(llm);
    
    // Set up 3D view
    const viewportContainer = document.querySelector('.llm-detail-viewport');
    if (!viewportContainer) {
        // Create viewport if it doesn't exist
        createViewport(detailsPanel);
    }
    
    // Initialize the 3D view
    initViewScene();
    
    // Create the model
    displayLLMModel(llm);
    
    // Show edit button and add event listener
    const editButton = document.querySelector('.edit-llm-btn');
    if (editButton) {
        editButton.setAttribute('data-id', llm.id);
        editButton.addEventListener('click', () => handleEditLLM(llm.id));
    }
    
    // Show the panel
    detailsPanel.classList.add('active');
}

function createViewport(detailsPanel) {
    // Create viewport container
    const contentDiv = detailsPanel.querySelector('.details-content');
    
    const viewportContainer = document.createElement('div');
    viewportContainer.className = 'llm-detail-viewport';
    
    // Insert the viewport before the attributes section
    const attributesSection = detailsPanel.querySelector('.llm-detail-attributes');
    contentDiv.insertBefore(viewportContainer, attributesSection);
}

function updateDetailsPanel(llm) {
    const nameEl = document.querySelector('.llm-detail-name');
    const modelEl = document.querySelector('.llm-detail-model');
    const createdAtEl = document.querySelector('.llm-detail-created');
    const attributesEl = document.querySelector('.llm-detail-attributes');
    
    nameEl.textContent = llm.name;
    modelEl.textContent = llm.model;
    createdAtEl.textContent = new Date(llm.createdAt).toLocaleDateString();
    
    // Add edit button if it doesn't exist
    if (!document.querySelector('.edit-llm-btn')) {
        const editButton = document.createElement('button');
        editButton.className = 'edit-llm-btn';
        editButton.textContent = 'Edit LLM';
        editButton.setAttribute('data-id', llm.id);
        
        // Add after the name
        nameEl.parentNode.insertBefore(editButton, nameEl.nextSibling);
    }
    
    // Display attributes
    attributesEl.innerHTML = '';
    if (llm.attributes) {
        Object.entries(llm.attributes).forEach(([name, value]) => {
            const attrItem = document.createElement('div');
            attrItem.className = 'detail-attribute-item';
            
            const attrBar = document.createElement('div');
            attrBar.className = 'detail-attribute-bar';
            
            const attrFill = document.createElement('div');
            attrFill.className = 'detail-attribute-fill';
            attrFill.style.width = `${(value / 20) * 100}%`;
            
            attrBar.appendChild(attrFill);
            
            attrItem.innerHTML = `
                <div class="detail-attribute-name">${name}: ${value}</div>
            `;
            attrItem.appendChild(attrBar);
            
            attributesEl.appendChild(attrItem);
        });
    }
}

function initViewScene() {
    const viewport = document.querySelector('.llm-detail-viewport');
    if (!viewport) return;
    
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
    
    // Start animation
    animateViewModel();
}

function displayLLMModel(llm) {
    // Remove existing model if any
    if (viewModel && viewModel.parent) {
        viewModel.parent.remove(viewModel);
        viewModel = null;
    }
    
    if (llm.customCharacterCode) {
        // Create from custom character code
        try {
            viewModel = createCustomCharacter(THREE, llm.customCharacterCode);
        } catch (error) {
            console.error("Error creating custom character:", error);
            viewModel = createStandardModel(llm);
        }
    } else {
        // Create standard model
        viewModel = createStandardModel(llm);
    }
    
    viewScene.add(viewModel);
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

function handleEditLLM(llmId) {
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    // Close the details panel
    document.getElementById('llm-details-panel').classList.remove('active');
    
    // Close the collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');
    
    // Open the creation UI in edit mode
    const createUI = document.getElementById('create-llm-ui');
    createUI.classList.add('active');
    createUI.setAttribute('data-edit-mode', 'true');
    createUI.setAttribute('data-edit-id', llmId);
    
    // Set up the creation interface with the LLM data
    setupLLMCreationInterface(llm);
    
    // Cancel animation
    if (viewAnimation) {
        cancelAnimationFrame(viewAnimation);
    }
}