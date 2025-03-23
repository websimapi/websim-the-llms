import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { createStandardModel } from './llmViewUtils.js';

let viewScene, viewCamera, viewRenderer;
let viewModel = null;
let viewAnimation;
let viewControls;

export function setupLLMViewInterface(llmId) {
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    // Get the details panel
    const detailsPanel = document.getElementById('llm-details-panel');
    
    // Add close button event listener
    const closeButton = detailsPanel.querySelector('.details-close');
    closeButton.addEventListener('click', () => {
        detailsPanel.classList.remove('active');
        // Cancel animation loop when closing
        if (viewAnimation) {
            cancelAnimationFrame(viewAnimation);
            viewAnimation = null;
        }
    });
    
    // Update UI elements
    updateDetailsPanel(llm);
    
    // Show the panel first to ensure DOM elements exist
    detailsPanel.classList.add('active');
    
    // Set up 3D view (delay slightly to ensure DOM is ready)
    setTimeout(() => {
        initViewScene();
        
        // Only display model after scene is initialized
        if (viewScene) {
            displayLLMModel(llm);
        }
        
        // Show edit button and add event listener
        const editButton = document.querySelector('.edit-llm-btn');
        if (editButton) {
            editButton.setAttribute('data-id', llm.id);
            editButton.addEventListener('click', () => handleEditLLM(llm.id));
        }
    }, 100); // Increase timeout to ensure DOM and Three.js scene are ready
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
    if (!viewport) {
        console.error("LLM detail viewport not found");
        return;
    }
    
    // Clear existing content and destroy previous scene
    viewport.innerHTML = '';
    if (viewRenderer) {
        viewport.removeChild(viewRenderer.domElement);
        viewRenderer.dispose();
    }
    
    if (viewAnimation) {
        cancelAnimationFrame(viewAnimation);
        viewAnimation = null;
    }
    
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
    
    // Add orbit controls
    viewControls = new OrbitControls(viewCamera, viewRenderer.domElement);
    viewControls.enableDamping = true;
    viewControls.dampingFactor = 0.05;
    viewControls.minDistance = 2;
    viewControls.maxDistance = 10;
    
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
}

function displayLLMModel(llm) {
    if (!viewScene) {
        console.error("View scene not initialized");
        return;
    }
    
    // Remove existing model if any
    if (viewModel && viewScene.getObjectById(viewModel.id)) {
        viewScene.remove(viewModel);
    }
    viewModel = null;
    
    try {
        if (llm.customCharacterCode) {
            // Create from custom character code
            viewModel = createCustomCharacter(THREE, llm.customCharacterCode);
        } else {
            // Create standard model
            viewModel = createStandardModel(llm);
        }
        
        if (viewModel) {
            viewScene.add(viewModel);
            // Start animation now that we have a valid model
            if (!viewAnimation) {
                animateViewModel();
            }
        }
    } catch (error) {
        console.error("Error creating LLM model:", error);
        // Create fallback model
        viewModel = createStandardModel({
            color: 0x3cb371,
            name: llm.name || "Unknown LLM"
        });
        viewScene.add(viewModel);
        animateViewModel();
    }
}

function animateViewModel() {
    if (!viewScene || !viewCamera || !viewRenderer) {
        console.error("Cannot animate: scene, camera or renderer is missing");
        return;
    }
    
    viewAnimation = requestAnimationFrame(animateViewModel);
    
    // Update controls if they exist
    if (viewControls) {
        viewControls.update();
    }
    
    // Simple idle animation for the model
    if (viewModel) {
        const time = Date.now() * 0.001;
        
        // Gentle bobbing motion
        viewModel.position.y = Math.sin(time) * 0.05;
        
        // Only add rotation if controls aren't being used
        if (!viewControls || !viewControls.enabled) {
            viewModel.rotation.y = Math.sin(time * 0.5) * 0.2;
        }
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