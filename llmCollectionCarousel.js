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
        animationId = null; // Reset animation ID
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
        // Use ResizeObserver for more reliable viewport resizing
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (camera && renderer && width > 0 && height > 0) {
                     camera.aspect = width / height;
                     camera.updateProjectionMatrix();
                     renderer.setSize(width, height);
                }
            }
        });
        resizeObserver.observe(viewportElement);

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
        
        // Select the model at the new current index
        if (carouselLLMs[currentIndex]) {
            selectModel(carouselLLMs[currentIndex].id);
        }
    }
}

function navigateRight() {
    if (currentIndex < carouselLLMs.length - 1) {
        currentIndex++;
        updateCarouselModels();
        updateArrowVisibility();
        
        // Select the model at the new current index
        if (carouselLLMs[currentIndex]) {
            selectModel(carouselLLMs[currentIndex].id);
        }
    }
}

function updateArrowVisibility() {
    // Show/hide arrows based on position in carousel
    if (leftArrow && rightArrow) {
        leftArrow.style.opacity = currentIndex > 0 ? "1" : "0.3";
        leftArrow.style.pointerEvents = currentIndex > 0 ? "auto" : "none"; // Disable clicks when inactive
        rightArrow.style.opacity = currentIndex < carouselLLMs.length - 1 ? "1" : "0.3";
        rightArrow.style.pointerEvents = currentIndex < carouselLLMs.length - 1 ? "auto" : "none"; // Disable clicks when inactive
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
    
    // Clean up selection rings/highlights before adding new models
    clearSelectionIndicators();
    
    // Determine which LLMs to display (current, previous, next)
    const displayIndices = [];
    displayIndices.push(currentIndex);
    
    // Preload one model to the left and one to the right for smoother transition
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
            model.userData = { id: llm.id, index: index }; // Store LLM id and original index
            
            scene.add(model);
            llmModels.push(model); // Add to our list of active models
            
            // Add a selection indicator if this model is the currently selected one
            if (llm.id === selectedModelId) {
                addSelectionIndicator(model);
            }
            
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
    // Ensure scene exists before clearing indicators that might be attached to it
    if (scene) {
        clearSelectionIndicators();
    } else {
        // If scene doesn't exist, just clear indicators potentially attached to the model
        clearModelAttachedIndicators(model);
    }

    // Create a ring around the model
    const ringGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x3cb371,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Flat on the ground
    ring.position.y = -0.99; // Fixed position just above ground level
    ring.userData.isSelectionRing = true;
    ring.name = "selectionRing";

    // IMPORTANT: Store the model ID with the ring for identification
    ring.userData.modelId = model.userData.id;

    // Set position to match the model
    ring.position.x = model.position.x;
    ring.position.z = model.position.z;

    // Add ring to scene only if scene exists
    if (scene) {
        scene.add(ring);
    } else {
        console.warn("Scene not available, cannot add selection ring.");
    }

    // Add a highlight effect
    const highlight = new THREE.PointLight(0x3cb371, 1, 3);
    highlight.position.set(0, 1, 0); // Position relative to the model
    highlight.userData.isSelectionHighlight = true;
    highlight.name = "selectionHighlight";
    model.add(highlight); // Add light as child of the model

    // Add another light from below for more dramatic effect
    const bottomLight = new THREE.PointLight(0x3cb371, 0.5, 2);
    bottomLight.position.set(0, -0.5, 0); // Position relative to the model
    bottomLight.userData.isSelectionHighlight = true;
    bottomLight.name = "bottomHighlight";
    model.add(bottomLight); // Add light as child of the model

    // Store a reference to the selection indicators ON THE MODEL
    model.userData.selectionIndicators = {
        ring: scene ? ring : null, // Store ring only if added to scene
        lights: [highlight, bottomLight]
    };
}

// Renamed function to specifically clear indicators
function clearSelectionIndicators() {
    // Check if scene exists before operating on it
    if (scene) {
        // Remove rings from the scene
        const ringsToRemove = [];
        scene.traverse(child => {
            if (child.userData?.isSelectionRing) {
                ringsToRemove.push(child);
            }
        });
        ringsToRemove.forEach(ring => scene.remove(ring));
    }

    // Remove lights attached to models (this part is safe even if scene is null)
    llmModels.forEach(model => {
       clearModelAttachedIndicators(model);
    });
}

// Helper function to clear indicators attached directly to a model
function clearModelAttachedIndicators(model) {
     if (model?.userData?.selectionIndicators?.lights) {
        model.userData.selectionIndicators.lights.forEach(light => {
            // Check parentage before removing, in case model was already removed from scene hierarchy elsewhere
            if (light.parent === model) {
                model.remove(light);
            }
        });
        // Clear the reference on the model itself
        delete model.userData.selectionIndicators;
    }
     // Also ensure the ring reference is cleared if it exists, even if scene was null
     if (model?.userData?.selectionIndicators?.ring) {
         delete model.userData.selectionIndicators.ring;
     }
     // Final cleanup on the userData object if selectionIndicators is now empty
     if (model?.userData?.selectionIndicators && Object.keys(model.userData.selectionIndicators).length === 0) {
          delete model.userData.selectionIndicators;
     }
}

// Function to select a model by ID
export function selectModel(id) {
    if (id === selectedModelId && selectedModelId !== null) return; // Already selected

    // Set new selection ID
    selectedModelId = id;

    // Clear any previous selection indicators (respecting scene existence)
    clearSelectionIndicators();

    // Find the newly selected model among the currently displayed models
    const selectedModel = llmModels.find(model => model.userData.id === id);

    if (selectedModel) {
        // Add selection indicator to the correct model
        addSelectionIndicator(selectedModel);

        // Find the index of the selected LLM in the full list
        const llmIndex = carouselLLMs.findIndex(llm => llm.id === id);

        // If the selected model is not the one currently centered, pan the carousel
        if (llmIndex !== -1 && llmIndex !== currentIndex) {
            currentIndex = llmIndex;
            updateCarouselModels(); // Reload models based on new index
            updateArrowVisibility();
            // The selection indicator will be reapplied in updateCarouselModels
        }
    } else {
        // If the model isn't currently displayed (e.g., after delete/refresh),
        // try to find its index and pan to it.
        const llmIndex = carouselLLMs.findIndex(llm => llm.id === id);
        if (llmIndex !== -1) {
            currentIndex = llmIndex;
            updateCarouselModels(); // This will load and hopefully highlight the model
            updateArrowVisibility();
        } else {
            console.warn("Selected model ID not found in carousel:", id);
            selectedModelId = null; // Reset if ID is invalid
        }
    }

    // Update list view highlighting
    updateListSelection(selectedModelId); // Pass the potentially updated ID

    // Update the state of the "Edit Selected" button
    const editSelectedBtn = document.getElementById('edit-selected-llm-btn');
    if (editSelectedBtn) {
        editSelectedBtn.disabled = !selectedModelId;
    }
}

// Update the list view to highlight selected item
function updateListSelection(id) {
    // Remove previous highlights
    document.querySelectorAll('.llm-list-item').forEach(item => {
        item.classList.remove('selected');
    });

    if (id === null) return; // If nothing is selected, just clear highlights

    // Add highlight to selected item
    const selectedItem = document.querySelector(`.llm-list-item[data-id="${id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        // Optional: Scroll item into view if needed
        // selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Get the ID of the currently selected model
export function getSelectedModelId() {
    return selectedModelId;
}

function animateCarousel() {
    if (!scene || !camera || !renderer) {
        // Scene might have been cleaned up, stop animation
        if(animationId) cancelAnimationFrame(animationId);
        animationId = null;
        return;
    }
    
    // Make references available globally for the raycaster (if needed elsewhere)
    window.carouselScene = scene;
    window.carouselCamera = camera;
    
    animationId = requestAnimationFrame(animateCarousel);
    
    llmModels.forEach((model) => { // No need for index here
        if (!model) return;
        
        const time = Date.now() * 0.001;
        // Use the model's stored index relative to the current index
        const offset = model.userData.index - currentIndex;
        
        // Simple hover effect - only apply to the model, not its children directly
        const originY = calculatePosition(offset).y;
        model.position.y = originY + Math.sin(time + (model.userData.index * 0.5)) * 0.1;
        
        // Subtle rotation
        const baseRotation = calculatePosition(offset).rotation;
        model.rotation.y = baseRotation + Math.sin(time * 0.5 + (model.userData.index * 0.5)) * 0.1;
        
        // Update selection indicators if they exist on this model
        if (model.userData.selectionIndicators) {
             // Update ring position (it's in the scene, not child of model)
             if (model.userData.selectionIndicators.ring && model.userData.selectionIndicators.ring.parent === scene) {
                 model.userData.selectionIndicators.ring.position.x = model.position.x;
                 model.userData.selectionIndicators.ring.position.z = model.position.z;
                 
                 // Pulse the ring size slightly
                 const pulseFactor = 1 + Math.sin(time * 2) * 0.05;
                 model.userData.selectionIndicators.ring.scale.set(pulseFactor, 1, pulseFactor); // Use set for clarity
             }
             
             // Update lights attached to the model
             model.userData.selectionIndicators.lights?.forEach(light => {
                 if (light.userData?.isSelectionHighlight) {
                     // Pulse the light intensity
                     light.intensity = 1 + Math.sin(time * 2) * 0.3;
                 }
             });
        }
    });

    try {
        if(renderer) renderer.render(scene, camera);
    } catch (e) {
        console.error("Error during carousel render:", e);
        if(animationId) cancelAnimationFrame(animationId); // Stop animation on error
        animationId = null;
    }
}

export function cleanupCarousel() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Clean up models and selection indicators ONLY IF scene exists
    if (scene) {
        // Moved clearSelectionIndicators inside the check
        clearSelectionIndicators();

        llmModels.forEach(model => {
            if (model && model.parent) {
                model.parent.remove(model);
                // Dispose geometries and materials if necessary
                model.traverse(child => {
                    if (child.isMesh) {
                        child.geometry?.dispose();
                        if (child.material) {
                             if (Array.isArray(child.material)) {
                                 child.material.forEach(mat => mat.dispose());
                             } else {
                                 child.material.dispose();
                             }
                        }
                    }
                });
            }
        });
    } else {
        // If scene is already null, still try to clean indicators attached to models in memory
         llmModels.forEach(model => {
             clearModelAttachedIndicators(model);
         });
    }


    // Remove renderer canvas
    if (renderer && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    // Clear arrays and references AFTER cleanup attempts
    llmModels = [];
    carouselLLMs = [];
    scene = null;
    camera = null;
    renderer = null;
    selectedModelId = null;
    leftArrow = null;
    rightArrow = null;

    // Clear global references if they were set
    if (window.carouselScene === scene) window.carouselScene = null; // scene is already null here, so redundant but safe
    if (window.carouselCamera === camera) window.carouselCamera = null;
}