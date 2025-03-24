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
                llmItem.className = 'llm-list-item';
                llmItem.setAttribute('data-id', llm.id);
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
            
            // Add click event to viewport for model selection
            collectionViewport.addEventListener('click', handleViewportClick);
            
            // Add edit selected button
            addEditSelectedButton();
            
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
            if (!model) break; // Guard against null if we reach the top
        }
        
        if (model && model.userData && model.userData.id) {
            // Select the model that was clicked
            selectModel(model.userData.id);
            return; // Exit after selecting
        }
    }
}

// Add edit selected button
function addEditSelectedButton() {
    const footer = document.querySelector('.collection-footer');
    
    // Create edit selected button if it doesn't exist
    if (!document.getElementById('edit-selected-llm-btn')) {
        const editSelectedBtn = document.createElement('button');
        editSelectedBtn.id = 'edit-selected-llm-btn';
        editSelectedBtn.className = 'collection-button secondary';
        editSelectedBtn.textContent = 'Edit Selected';
        editSelectedBtn.disabled = true; // Initially disabled
        
        // Add click handler
        editSelectedBtn.addEventListener('click', () => {
            const selectedId = getSelectedModelId();
            if (selectedId) {
                handleEditLLM(selectedId);
            }
        });
        
        // Insert before the create new button
        footer.insertBefore(editSelectedBtn, document.getElementById('create-new-llm-btn'));
    }
    
    // Add selection change listener to update button state
    const observer = new MutationObserver((mutations) => {
        const editSelectedBtn = document.getElementById('edit-selected-llm-btn');
        if (editSelectedBtn) {
            const selectedId = getSelectedModelId();
            editSelectedBtn.disabled = !selectedId;
        }
    });
    
    observer.observe(document.getElementById('llm-list'), { 
        attributes: true, 
        subtree: true,
        attributeFilter: ['class']
    });
}

function deleteLLM(id) {
    // Remove from data manager
    if (llmDataManager.deleteLLM(id)) {
        // Refresh the UI
        setupLLMCollectionView();
    }
}