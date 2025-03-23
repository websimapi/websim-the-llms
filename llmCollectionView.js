import { llmDataManager } from './llmDataManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';

let collectionScene, collectionCamera, collectionRenderer;
let llmModels = [];
const modelPositions = [];

export function setupLLMCollectionView() {
    // Initialize the LLM data manager
    llmDataManager.init();
    
    // Setup the collection UI
    const collectionUI = document.getElementById('llm-collection-ui');
    const collectionViewport = document.querySelector('.collection-viewport');
    const llmList = document.getElementById('llm-list');
    
    // Clear existing content
    llmList.innerHTML = '';
    
    // Setup Three.js scene for collection view
    initCollectionScene(collectionViewport);
    
    // Get all LLMs and display them
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
            
            // Create 3D model for the LLM
            createLLMModel(llm, index);
        });
        
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
    });
    
    // Start animation loop
    animateCollection();
}

function initCollectionScene(viewport) {
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
    viewport.innerHTML = '';
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
    collectionScene.add(floor);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (collectionCamera && collectionRenderer && viewport) {
            collectionCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            collectionCamera.updateProjectionMatrix();
            collectionRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
}

function createLLMModel(llm, index) {
    // Position models in a semi-circle
    const numPositions = Math.max(10, llmDataManager.getAllLLMs().length);
    const angle = (Math.PI) * (index / (numPositions - 1)) - Math.PI/2;
    const radius = 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    let llmModel;
    
    if (llm.customCharacterCode) {
        // Create custom character from stored code
        try {
            llmModel = createCustomCharacter(THREE, llm.customCharacterCode);
        } catch (error) {
            console.error("Error creating custom character:", error);
            // Create fallback model
            llmModel = createFallbackModel(llm);
        }
    } else {
        // Create standard model based on stored properties
        llmModel = createStandardModel(llm);
    }
    
    // Position the model
    llmModel.position.set(x, 0, z);
    llmModel.rotation.y = -angle;
    llmModel.userData = { id: llm.id };
    
    collectionScene.add(llmModel);
    llmModels.push(llmModel);
    modelPositions.push({ x, y: 0, z });
}

function createStandardModel(llm) {
    // Create a simple robot model based on the LLM properties
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

function createFallbackModel(llm) {
    // Very simple fallback model
    const group = new THREE.Group();
    
    const color = new THREE.Color(llm.color || 0x3cb371);
    
    // Create body
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 1.7),
        new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.85;
    group.add(body);
    
    // Add a nameplate
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(llm.name, canvas.width / 2, canvas.height / 2 + 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const nameMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    
    const nameplate = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.25),
        nameMaterial
    );
    nameplate.position.set(0, 2, 0);
    nameplate.rotation.y = Math.PI;
    group.add(nameplate);
    
    return group;
}

function viewLLMDetails(id) {
    const llm = llmDataManager.getLLMById(id);
    if (!llm) return;
    
    // Focus camera on the selected LLM
    const model = llmModels.find(model => model.userData.id === id);
    if (model) {
        // Create a simple animation to focus on the selected model
        const startPos = { 
            x: collectionCamera.position.x, 
            y: collectionCamera.position.y, 
            z: collectionCamera.position.z 
        };
        const endPos = { 
            x: model.position.x, 
            y: model.position.y + 2, 
            z: model.position.z + 3 
        };
        
        const duration = 1000; // ms
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            collectionCamera.position.x = startPos.x + (endPos.x - startPos.x) * easeProgress;
            collectionCamera.position.y = startPos.y + (endPos.y - startPos.y) * easeProgress;
            collectionCamera.position.z = startPos.z + (endPos.z - startPos.z) * easeProgress;
            
            collectionCamera.lookAt(model.position);
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }
        
        animateCamera();
        
        // Display LLM details in a modal or info panel
        const detailsPanel = document.getElementById('llm-details-panel');
        const nameEl = document.querySelector('.llm-detail-name');
        const modelEl = document.querySelector('.llm-detail-model');
        const createdAtEl = document.querySelector('.llm-detail-created');
        const attributesEl = document.querySelector('.llm-detail-attributes');
        
        nameEl.textContent = llm.name;
        modelEl.textContent = llm.model;
        createdAtEl.textContent = new Date(llm.createdAt).toLocaleDateString();
        
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
        
        detailsPanel.classList.add('active');
        
        // Add close button functionality
        document.querySelector('.details-close').addEventListener('click', () => {
            detailsPanel.classList.remove('active');
        });
    }
}

function deleteLLM(id) {
    // Remove from data manager
    if (llmDataManager.deleteLLM(id)) {
        // Remove model from scene
        const modelIndex = llmModels.findIndex(model => model.userData.id === id);
        if (modelIndex !== -1) {
            collectionScene.remove(llmModels[modelIndex]);
            llmModels.splice(modelIndex, 1);
        }
        
        // Refresh the UI
        setupLLMCollectionView();
    }
}

function animateCollection() {
    if (!collectionScene || !collectionCamera || !collectionRenderer) return;
    
    requestAnimationFrame(animateCollection);
    
    // Simple animations for models
    llmModels.forEach((model, index) => {
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