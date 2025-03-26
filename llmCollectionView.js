import { llmDataManager } from './llmDataManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';
import { setupLLMViewInterface } from './llmViewInterface.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { setupLLMCarousel, cleanupCarousel, selectModel, getSelectedModelId } from './llmCollectionCarousel.js';

let collectionAnimationId;

export function setupLLMCollectionView(selectLLMId = null) {
    // Initialize the LLM data manager
    llmDataManager.init();

    // Setup the collection UI
    const collectionUI = document.getElementById('llm-collection-ui');
    collectionUI.classList.add('active');

    // Wait a moment for the UI to be visible before initializing the viewport
    setTimeout(() => {
        const collectionViewport = document.querySelector('.collection-viewport');
        const llmList = document.getElementById('llm-list');
        const editSelectedBtn = document.getElementById('edit-selected-llm-btn'); // Get edit button

        // Clear existing content
        llmList.innerHTML = '';
        collectionViewport.innerHTML = '';

        // Cancel any existing animation
        if (collectionAnimationId) {
            cancelAnimationFrame(collectionAnimationId);
        }

        // Clean up any existing carousel
        cleanupCarousel();

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
             // Disable edit button if list is empty
             if (editSelectedBtn) editSelectedBtn.disabled = true;
        } else {
            // Display LLM list
            llms.forEach((llm, index) => {
                // Create list item
                const llmItem = document.createElement('div');
                llmItem.className = 'llm-list-item';
                llmItem.setAttribute('data-id', llm.id);
                llmItem.innerHTML = `
                    <div class="llm-info">
                        <h3>${llm.name}</h3>
                        <p class="llm-type">${llm.model}</p>
                        <p class="llm-created">Created: ${new Date(llm.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="llm-actions">
                        <!-- Edit button removed from list item -->
                        <button class="llm-delete-btn" data-id="${llm.id}">Delete</button>
                    </div>
                `;
                llmList.appendChild(llmItem);

                // Add click event to select LLM
                llmItem.addEventListener('click', (e) => {
                    // Don't trigger if clicking on a button
                    if (e.target.tagName !== 'BUTTON') {
                        const id = llmItem.getAttribute('data-id');
                        selectModel(id);

                        // Update button state when selection changes
                        if (editSelectedBtn) {
                            editSelectedBtn.disabled = !id; // Enable if id exists, disable otherwise
                        }
                    }
                });
            });

            // Setup carousel
            setupLLMCarousel(collectionViewport, llms);

            // Add profile images to the list items
            import('./llmProfileImageDisplay.js').then(module => {
                if (typeof module.addProfileImagesToLLMList === 'function') {
                    module.addProfileImagesToLLMList();
                } else {
                    console.error('addProfileImagesToLLMList function not found in module');
                }
            }).catch(error => {
                console.error('Error importing llmProfileImageDisplay module:', error);
            });

            // Add click event to viewport for model selection
            collectionViewport.addEventListener('click', handleViewportClick);

            // Add event listeners for buttons
             // Removed edit button listeners from list items

            document.querySelectorAll('.llm-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const confirmed = confirm('Are you sure you want to delete this LLM?');
                    if (confirmed) {
                        deleteLLM(id);
                    }
                });
            });

            // Add event listener for the main "Edit Selected" button
            if (editSelectedBtn) {
                // Remove previous listener first to avoid duplicates
                editSelectedBtn.replaceWith(editSelectedBtn.cloneNode(true));
                const newEditSelectedBtn = document.getElementById('edit-selected-llm-btn'); // Get the new cloned button

                newEditSelectedBtn.addEventListener('click', () => {
                     const selectedId = getSelectedModelId();
                     if (selectedId) {
                         handleEditLLM(selectedId);
                     }
                 });
                // Initial state: disabled if nothing selected
                newEditSelectedBtn.disabled = !getSelectedModelId();
            }


            // Select specific LLM if ID provided, otherwise select first one
            if (selectLLMId) {
                selectModel(selectLLMId);
            } else if (llms.length > 0) {
                selectModel(llms[0].id);
            }
            // Ensure edit button state is correct after initial selection
             if (editSelectedBtn) editSelectedBtn.disabled = !getSelectedModelId();
        }
    }, 100);

    // Add close button event listener
    document.querySelector('.collection-close').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        // Clean up carousel
        cleanupCarousel();
    });

    // Add create new button event listener
    document.getElementById('create-new-llm-btn').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        document.getElementById('create-llm-ui').classList.add('active');
        // Initialize the creation interface
        setupLLMCreationInterface();

        // Clean up carousel
        cleanupCarousel();
    });
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
    // Cleanup carousel resources
    cleanupCarousel();
}

// Handle clicks in the viewport area
function handleViewportClick(event) {
    const renderer = document.querySelector('.collection-viewport canvas');
    if (!renderer || !window.carouselCamera) return; // Add check for camera

    // Get normalized mouse coordinates
    const rect = renderer.getBoundingClientRect();
    const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };

    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, window.carouselCamera); // Use carousel camera

    // Find intersections with models
    const intersects = raycaster.intersectObjects(window.carouselScene.children, true); // Use carousel scene

    if (intersects.length > 0) {
        // Find the model that was clicked
        let model = intersects[0].object;

        // Traverse up to find the parent model with userData
        while (model && (!model.userData || !model.userData.id)) {
            model = model.parent;

            // If we've reached the top without finding a valid model, break
            if (!model) break;
        }

        if (model && model.userData && model.userData.id) {
            // Select the exact model that was clicked
            selectModel(model.userData.id);

             // Enable the edit button when a model is selected via viewport click
             const editSelectedBtn = document.getElementById('edit-selected-llm-btn');
             if (editSelectedBtn) editSelectedBtn.disabled = false;
        }
    }
}

function deleteLLM(id) {
    // Remove from data manager
    if (llmDataManager.deleteLLM(id)) {
         const currentSelectedId = getSelectedModelId();
        // Refresh the UI
         setupLLMCollectionView(currentSelectedId === id ? null : currentSelectedId); // Reselect previous or first if deleted one was selected
    }
}