import { llmDataManager } from './llmDataManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';
import { setupLLMViewInterface } from './llmViewInterface.js';
import { createCollectionModels } from './llmCollectionViewUtils.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { initLLMCarousel, nextCarouselModel, prevCarouselModel } from './llmCarouselView.js';

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
                    <button class="llm-edit-btn" data-id="${llm.id}">Edit</button>
                    <button class="llm-delete-btn" data-id="${llm.id}">Delete</button>
                </div>
            `;
            llmList.appendChild(llmItem);
        });
        
        // Setup Three.js scene for collection view
        initCollectionScene(collectionViewport, llms);
        
        // Add event listeners for buttons
        document.querySelectorAll('.llm-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                handleEditLLM(id);
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
        setupLLMCreationInterface();
        
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
    
    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -1;
    collectionScene.add(floor);
    
    // Initialize the carousel
    initLLMCarousel(llms, collectionScene);
    
    // Add carousel navigation buttons
    if (llms.length > 3) {
        addCarouselControls(viewport);
    }
    
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

function addCarouselControls(viewport) {
    // Create left arrow
    const leftArrow = document.createElement('button');
    leftArrow.className = 'carousel-arrow left-arrow';
    leftArrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
    viewport.appendChild(leftArrow);
    
    // Create right arrow
    const rightArrow = document.createElement('button');
    rightArrow.className = 'carousel-arrow right-arrow';
    rightArrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    viewport.appendChild(rightArrow);
    
    // Add event listeners
    leftArrow.addEventListener('click', prevCarouselModel);
    rightArrow.addEventListener('click', nextCarouselModel);
}

function viewLLMDetails(id) {
    setupLLMViewInterface(id);
}

function handleEditLLM(id) {
    const llm = llmDataManager.getLLMById(id);
    if (!llm) return;
    
    // Close the collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');
    
    // Open the creation UI in edit mode
    const createUI = document.getElementById('create-llm-ui');
    createUI.classList.add('active');
    createUI.setAttribute('data-edit-mode', 'true');
    createUI.setAttribute('data-edit-id', id);
    
    // Set up the creation interface with the LLM data
    setupLLMCreationInterface(llm);
    
    // Cancel animation if active
    if (collectionAnimationId) {
        cancelAnimationFrame(collectionAnimationId);
    }
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
    const time = Date.now() * 0.001;
    
    // Apply gentle floating animation to all visible models in carousel
    collectionScene.traverse((child) => {
        if (child.userData && child.userData.id && child.visible) {
            const offset = child.position.x * 0.1; // Different timing based on position
            child.position.y = Math.sin(time + offset) * 0.1;
        }
    });
    
    collectionRenderer.render(collectionScene, collectionCamera);
}