import { llmDataManager } from './llmDataManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';
import { setupLLMViewInterface } from './llmViewInterface.js';
import { createCollectionModels } from './llmCollectionViewUtils.js';

let collectionScene, collectionCamera, collectionRenderer;
let llmModels = [];
const modelPositions = [];
let collectionAnimationId;

export function setupLLMCollectionView() {
    // Initialize the LLM data manager
    llmDataManager.init();
    
    // Setup the collection UI
    const collectionUI = document.getElementById('llm-collection-ui');
    const collectionViewport = document.querySelector('.collection-viewport');
    const llmList = document.getElementById('llm-list');
    
    // Clear existing content
    llmList.innerHTML = '';
    collectionViewport.innerHTML = '';
    
    // Cancel any existing animation
    if (collectionAnimationId) {
        cancelAnimationFrame(collectionAnimationId);
    }
    
    // Get all LLMs 
    const llms = llmDataManager.getAllLLMs();
    
    if (llms.length === 0) {
        // Show empty state
        llmList.innerHTML = `
            <div class="empty-collection">
                <h3>No LLMs Created Yet</h3>
                <p>Create your first LLM by clicking the "Create New LLM" button below.</p>
            </div>
        `;
    } else {
        // Display LLM list
        llms.forEach((llm, index) => {
            // Create list item
            const llmItem = document.createElement('div');
            llmItem.className = 'llm-list-item';
            llmItem.innerHTML = `
                <div class="llm-info">
                    <h3>${llm.name}</h3>
                    <p class="llm-type">${llm.model}</p>
                    <p class="llm-created">Created: ${new Date(llm.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="llm-actions">
                    <button class="llm-view-btn" data-id="${llm.id}">View</button>
                    <button class="llm-delete-btn" data-id="${llm.id}">Delete</button>
                </div>
            `;
            llmList.appendChild(llmItem);
        });
        
        // Setup Three.js scene for collection view
        initCollectionScene(collectionViewport, llms);
        
        // Add event listeners for buttons
        document.querySelectorAll('.llm-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                viewLLMDetails(id);
            });
        });
        
        document.querySelectorAll('.llm-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const confirmed = confirm('Are you sure you want to delete this LLM?');
                if (confirmed) {
                    deleteLLM(id);
                }
            });
        });
    }
    
    // Show the collection UI
    collectionUI.classList.add('active');
    
    // Add close button event listener
    document.querySelector('.collection-close').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        // Cancel animation loop
        if (collectionAnimationId) {
            cancelAnimationFrame(collectionAnimationId);
        }
    });
    
    // Add create new button event listener
    document.getElementById('create-new-llm-btn').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        document.getElementById('create-llm-ui').classList.add('active');
        // Initialize the creation interface
        const setupLLMCreationInterface = window.setupLLMCreationInterface || 
            (typeof setupLLMCreationInterface === 'function' ? setupLLMCreationInterface : null);
        
        if (setupLLMCreationInterface) {
            setupLLMCreationInterface();
        }
        
        // Cancel animation loop
        if (collectionAnimationId) {
            cancelAnimationFrame(collectionAnimationId);
        }
    });
}

function initCollectionScene(viewport, llms) {
    // Setup Three.js scene
    collectionScene = new THREE.Scene();
    collectionScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    collectionCamera = new THREE.PerspectiveCamera(
        45, 
        viewport.clientWidth / viewport.clientHeight, 
        0.1, 
        1000
    );
    collectionCamera.position.set(0, 5, 10);
    collectionCamera.lookAt(0, 0, 0);
    
    // Setup renderer
    collectionRenderer = new THREE.WebGLRenderer({ antialias: true });
    collectionRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    collectionRenderer.shadowMap.enabled = true;
    viewport.appendChild(collectionRenderer.domElement);
    
    // Add orbit controls
    const controls = new OrbitControls(collectionCamera, collectionRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    collectionScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    collectionScene.add(directionalLight);
    
    // Create models using the utility function
    const { models, positions, scene: modelScene } = createCollectionModels(llms, llmDataManager, createCustomCharacter);
    
    // Add all model scene objects to our collection scene
    modelScene.children.forEach(child => {
        collectionScene.add(child);
    });
    
    llmModels = models;
    modelPositions.length = 0;
    positions.forEach(pos => modelPositions.push(pos));
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (collectionCamera && collectionRenderer && viewport) {
            collectionCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            collectionCamera.updateProjectionMatrix();
            collectionRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
    
    // Start animation loop
    animateCollection();
}

function viewLLMDetails(id) {
    // Cancel any existing animation
    if (collectionAnimationId) {
        cancelAnimationFrame(collectionAnimationId);
    }
    
    // Setup the details view
    setupLLMViewInterface(id);
}

function deleteLLM(id) {
    // Remove from data manager
    if (llmDataManager.deleteLLM(id)) {
        // Refresh the UI
        setupLLMCollectionView();
    }
}

function animateCollection() {
    if (!collectionScene || !collectionCamera || !collectionRenderer) return;
    
    collectionAnimationId = requestAnimationFrame(animateCollection);
    
    // Simple animations for models
    llmModels.forEach((model, index) => {
        if (!model || !modelPositions[index]) return;
        
        const time = Date.now() * 0.001;
        const offset = index * 0.5;
        
        // Simple hovering animation
        model.position.y = modelPositions[index].y + Math.sin(time + offset) * 0.1;
        
        // Subtle rotation
        model.rotation.y = -Math.atan2(
            modelPositions[index].z,
            modelPositions[index].x
        ) + Math.sin(time * 0.5 + offset) * 0.2;
    });
    
    collectionRenderer.render(collectionScene, collectionCamera);
}