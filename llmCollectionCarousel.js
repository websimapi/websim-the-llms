import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';

// State for carousel
let carouselLLMs = [];
let currentIndex = 0;
let llmModels = [];
let scene, camera, renderer, animationId;
let leftArrow, rightArrow;
let selectedModelId = null; // Track selected model ID

export function setupLLMCarousel(viewportElement, llms) {
    // Store LLMs and reset index
    carouselLLMs = [...llms];
    currentIndex = 0;
    selectedModelId = null; // Reset selection when carousel initializes
    
    // Clear existing content and models
    viewportElement.innerHTML = '';
    llmModels = [];
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Only proceed if we have LLMs to display
    if (carouselLLMs.length === 0) {
        displayEmptyState(viewportElement);
        return;
    }
    
    // Initialize Three.js scene
    initCarouselScene(viewportElement);
    
    // Add navigation arrows
    addNavigationArrows(viewportElement);
    
    // Load initial models
    updateCarouselModels();
    
    // Start animation
    animateCarousel();
    
    // Select first LLM by default
    if (carouselLLMs.length > 0) {
        selectModel(carouselLLMs[0].id);
    }
}

function initCarouselScene(viewportElement) {
    try {
        // Setup Three.js scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        
        // Setup camera
        camera = new THREE.PerspectiveCamera(
            45, 
            viewportElement.clientWidth / viewportElement.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 2, 7);
        camera.lookAt(0, 1, 0);
        
        // Setup renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
        renderer.shadowMap.enabled = true;
        viewportElement.appendChild(renderer.domElement);
        
        // Explicitly set renderer size based on parent
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 5, 3);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Add floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.position.y = -1;
        scene.add(floor);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (camera && renderer && viewportElement) {
                camera.aspect = viewportElement.clientWidth / viewportElement.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
            }
        });
    } catch (error) {
        console.error('Error initializing carousel scene:', error);
    }
}

function addNavigationArrows(viewportElement) {
    // Create left arrow
    leftArrow = document.createElement('button');
    leftArrow.className = 'carousel-arrow left-arrow';
    leftArrow.innerHTML = '&lt;';
    leftArrow.addEventListener('click', navigateLeft);
    viewportElement.appendChild(leftArrow);
    
    // Create right arrow
    rightArrow = document.createElement('button');
    rightArrow.className = 'carousel-arrow right-arrow';
    rightArrow.innerHTML = '&gt;';
    rightArrow.addEventListener('click', navigateRight);
    viewportElement.appendChild(rightArrow);
    
    // Update arrow visibility
    updateArrowVisibility();
}

function navigateLeft() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCarouselModels();
        updateArrowVisibility();
    }
}

function navigateRight() {
    if (currentIndex < carouselLLMs.length - 1) {
        currentIndex++;
        updateCarouselModels();
        updateArrowVisibility();
    }
}

function updateArrowVisibility() {
    // Show/hide arrows based on position in carousel
    if (leftArrow && rightArrow) {
        leftArrow.style.opacity = currentIndex > 0 ? "1" : "0.3";
        rightArrow.style.opacity = currentIndex < carouselLLMs.length - 1 ? "1" : "0.3";
    }
}

function updateCarouselModels() {
    // Remove existing models
    llmModels.forEach(model => {
        if (model && model.parent) {
            model.parent.remove(model);
        }
    });
    llmModels = [];
    
    // Determine which LLMs to display (current, previous, next)
    const displayIndices = [];
    displayIndices.push(currentIndex);
    
    if (currentIndex > 0) {
        displayIndices.unshift(currentIndex - 1);
    }
    
    if (currentIndex < carouselLLMs.length - 1) {
        displayIndices.push(currentIndex + 1);
    }
    
    // Create and position models
    displayIndices.forEach((index, i) => {
        const llm = carouselLLMs[index];
        
        const position = calculatePosition(index - currentIndex);
        
        try {
            const model = renderLLMCharacter(THREE, llm);
            
            model.position.set(position.x, position.y, position.z);
            model.rotation.y = position.rotation;
            model.userData = { id: llm.id, index: index };
            
            scene.add(model);
            llmModels.push(model);
        } catch (error) {
            console.error('Error creating model for LLM:', llm.name, error);
        }
    });
}

function calculatePosition(offset) {
    // Calculate position based on offset from center
    const x = offset * 3; // Horizontal spacing
    const z = Math.abs(offset) * 2; // Push off-center models back
    const y = 0;
    const rotation = -offset * 0.3; // Turn model slightly toward camera
    
    return { x, y, z, rotation };
}

function displayEmptyState(viewportElement) {
    // Display a message when no LLMs are available
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-carousel';
    emptyMessage.innerHTML = `
        <p>No LLMs have been created yet.</p>
        <p>Create your first LLM to see it here!</p>
    `;
    viewportElement.appendChild(emptyMessage);
}

function addSelectionIndicator(model) {
    // Create a ring around the model - now using THREE.js objects for consistent rendering
    const ringGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3cb371,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Flat on the ground
    ring.position.y = -0.99; // Just above the floor
    ring.userData.isSelectionRing = true;
    ring.name = "selectionRing";
    model.add(ring);
    
    // Add a highlight effect
    const highlight = new THREE.PointLight(0x3cb371, 1, 3);
    highlight.position.set(0, 1, 0);
    highlight.userData.isSelectionHighlight = true;
    highlight.name = "selectionHighlight";
    model.add(highlight);
    
    // Add another light from below for more dramatic effect
    const bottomLight = new THREE.PointLight(0x3cb371, 0.5, 2);
    bottomLight.position.set(0, -0.5, 0);
    bottomLight.userData.isSelectionHighlight = true;
    bottomLight.name = "bottomHighlight";
    model.add(bottomLight);
    
    // Store a reference to the selection indicators
    model.userData.selectionIndicators = [ring, highlight, bottomLight];
}

// Function to select a model by ID
export function selectModel(id) {
    if (id === selectedModelId) return; // Already selected
    
    // Remove selection from previous model
    clearSelection();
    
    // Set new selection
    selectedModelId = id;
    
    // Find model with this ID
    const selectedModel = llmModels.find(model => model.userData.id === id);
    if (selectedModel) {
        // Find the index of the selected LLM
        const llmIndex = carouselLLMs.findIndex(llm => llm.id === id);
        if (llmIndex !== -1 && llmIndex !== currentIndex) {
            // Pan to the selected model if it's not the current one
            currentIndex = llmIndex;
            updateCarouselModels();
            updateArrowVisibility();
        }
    }
    
    // Update list view highlighting
    updateListSelection(id);
}

function clearSelection() {
    // Remove indicators from previously selected model
    llmModels.forEach(model => {
        if (model.userData.selectionIndicators) {
            model.userData.selectionIndicators.forEach(indicator => {
                model.remove(indicator);
            });
            delete model.userData.selectionIndicators;
        }
    });
    
    selectedModelId = null;
}

// Update the list view to highlight selected item
function updateListSelection(id) {
    // Remove previous highlights
    document.querySelectorAll('.llm-list-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add highlight to selected item
    const selectedItem = document.querySelector(`.llm-list-item[data-id="${id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
}

// Get the ID of the currently selected model
export function getSelectedModelId() {
    return selectedModelId;
}

function animateCarousel() {
    if (!scene || !camera || !renderer) {
        console.error('Cannot animate: scene, camera, or renderer is missing');
        return;
    }
    
    // Make references available globally for the raycaster
    window.carouselScene = scene;
    window.carouselCamera = camera;
    
    animationId = requestAnimationFrame(animateCarousel);
    
    llmModels.forEach((model, index) => {
        if (!model) return;
        
        const time = Date.now() * 0.001;
        const offset = index * 0.5;
        
        // Simple hover effect
        const originY = calculatePosition(model.userData.index - currentIndex).y;
        model.position.y = originY + Math.sin(time + offset) * 0.1;
        
        // Subtle rotation
        const baseRotation = calculatePosition(model.userData.index - currentIndex).rotation;
        model.rotation.y = baseRotation + Math.sin(time * 0.5 + offset) * 0.1;
        
        // Check if this model should have selection indicators
        if (model.userData.id === selectedModelId) {
            // If it doesn't have selection indicators, add them
            if (!model.userData.selectionIndicators) {
                addSelectionIndicator(model);
            }
            
            // Animate the existing selection indicators
            if (model.userData.selectionIndicators) {
                model.userData.selectionIndicators.forEach(indicator => {
                    if (indicator.userData.isSelectionRing) {
                        // Pulse the ring size slightly
                        const scale = 1 + Math.sin(time * 2) * 0.05;
                        indicator.scale.set(scale, scale, scale);
                    }
                    
                    if (indicator.userData.isSelectionHighlight) {
                        // Pulse the light intensity
                        indicator.intensity = 1 + Math.sin(time * 2) * 0.3;
                    }
                });
            }
        } else {
            // If this model has selection indicators but shouldn't, remove them
            if (model.userData.selectionIndicators) {
                model.userData.selectionIndicators.forEach(indicator => {
                    model.remove(indicator);
                });
                delete model.userData.selectionIndicators;
            }
        }
    });

    renderer.render(scene, camera);
}

export function cleanupCarousel() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Clean up all models
    if (scene) {
        llmModels.forEach(model => {
            if (model && model.parent) {
                model.parent.remove(model);
            }
        });
    }
    
    llmModels = [];
    scene = null;
    camera = null;
    renderer = null;
}