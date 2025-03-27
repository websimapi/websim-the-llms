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
        } else {
            // Display LLM list
            llms.forEach((llm, index) => {
                // Create list item
                const llmItem = document.createElement('div');
                llmItem.className = `llm-list-item ${llm.model}`;
                llmItem.setAttribute('data-id', llm.id);
                llmItem.innerHTML = `
                    <div class="llm-info">
                        <div style="display: flex; align-items: center;">
                            <div class="llm-model-icon">
                                ${getModelTypeIcon(llm.model)}
                            </div>
                            <h3>${llm.name}</h3>
                        </div>
                        <p class="llm-type">${llm.model}</p>
                        <p class="llm-created">Created: ${new Date(llm.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="llm-actions">
                        <button class="llm-edit-btn" data-id="${llm.id}">Edit</button>
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
                        const editSelectedBtn = document.getElementById('edit-selected-llm-btn');
                        if (editSelectedBtn) {
                            editSelectedBtn.disabled = !id;
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
            
            // Select specific LLM if ID provided, otherwise select first one
            if (selectLLMId) {
                selectModel(selectLLMId);
            } else if (llms.length > 0) {
                selectModel(llms[0].id);
            }
        }
    }, 100);
    
    // Add close button event listener
    document.querySelector('.collection-close').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        // Clean up carousel
        cleanupCarousel();
        // Set global variable to track that collection view is open
        window.createLLMOpenedFrom = 'plot';
    });
    
    // Add create new button event listener
    document.getElementById('create-new-llm-btn').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        document.getElementById('create-llm-ui').classList.add('active');
        // Set global variable to track that create LLM was opened from collection
        window.createLLMOpenedFrom = 'collection';
        // Initialize the creation interface
        setupLLMCreationInterface();
        
        // Clean up carousel
        cleanupCarousel();
    });
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

// Handle clicks in the viewport area
function handleViewportClick(event) {
    const renderer = document.querySelector('.collection-viewport canvas');
    if (!renderer) return;
    
    // Get normalized mouse coordinates
    const rect = renderer.getBoundingClientRect();
    const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, window.carouselCamera);
    
    // Find intersections with models
    const intersects = raycaster.intersectObjects(window.carouselScene.children, true);
    
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
        }
    }
}

function deleteLLM(id) {
    // Remove from data manager
    if (llmDataManager.deleteLLM(id)) {
        // Refresh the UI
        setupLLMCollectionView();
    }
}

function getModelTypeIcon(modelType) {
    switch(modelType) {
        case 'assistant':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 16h-4.83l-1.17 1.17-1.17-1.17H5V4h14v14z"/>
                <path d="M11 15h2v2h-2zm0-8h2v6h-2z"/>
            </svg>`;
        case 'creator':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/>
            </svg>`;
        case 'researcher':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M9.5 16c-1.93 0-3.5-1.57-3.5-3.5S7.57 9 9.5 9s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm5.5-1l5 5-1.5 1.5-5-5V15l-0.03-0.03c-1.45 1.28-3.36 2.03-5.47 2.03-4.56 0-8.25-3.69-8.25-8.25s3.69-8.25 8.25-8.25S17 4.19 17 8.75c0 2.11-0.76 4.02-2.05 5.47L15 14.24z"/>
            </svg>`;
        case 'companion':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
            </svg>`;
        case 'humanoid':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
            </svg>`;
        default:
            return '';
    }
}