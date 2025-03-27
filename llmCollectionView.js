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
            
            // Add "Create New LLM" entry at the bottom of the list
            const createNewItem = document.createElement('div');
            createNewItem.className = 'llm-list-item create-new-item';
            createNewItem.innerHTML = `
                <div class="llm-info">
                    <div style="display: flex; align-items: center;">
                        <div class="llm-model-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                        </div>
                        <h3>Create New LLM</h3>
                    </div>
                </div>
            `;
            llmList.appendChild(createNewItem);
            
            // Add "Transport to Plot" button at the top of the list
            const transportItem = document.createElement('div');
            transportItem.className = 'llm-list-item transport-item';
            transportItem.innerHTML = `
                <div class="llm-info">
                    <div style="display: flex; align-items: center;">
                        <div class="llm-model-icon">
                            <svg class="drone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M12,12c-1.7,0-3,1.3-3,3s1.3,3,3,3s3-1.3,3-3S13.7,12,12,12z" fill="currentColor"/>
                                <circle cx="12" cy="13.5" r="0.5" fill="#333"/>
                                <rect x="6.5" y="11.5" width="11" height="1" rx="0.5" fill="currentColor"/>
                                <rect x="11.5" y="7" width="1" height="11" rx="0.5" fill="currentColor"/>
                                <g class="propeller">
                                    <circle cx="6.5" cy="11.5" r="1" fill="#333"/>
                                    <ellipse cx="6.5" cy="11.5" rx="3" ry="0.5" fill="currentColor"/>
                                    <ellipse cx="6.5" cy="11.5" rx="0.5" ry="3" fill="currentColor"/>
                                </g>
                                <g class="propeller">
                                    <circle cx="17.5" cy="11.5" r="1" fill="#333"/>
                                    <ellipse cx="17.5" cy="11.5" rx="3" ry="0.5" fill="currentColor"/>
                                    <ellipse cx="17.5" cy="11.5" rx="0.5" ry="3" fill="currentColor"/>
                                </g>
                                <g class="propeller">
                                    <circle cx="12" cy="7.5" r="1" fill="#333"/>
                                    <ellipse cx="12" cy="7.5" rx="3" ry="0.5" fill="currentColor"/>
                                    <ellipse cx="12" cy="7.5" rx="0.5" ry="3" fill="currentColor"/>
                                </g>
                                <g class="propeller">
                                    <circle cx="12" cy="17.5" r="1" fill="#333"/>
                                    <ellipse cx="12" cy="17.5" rx="3" ry="0.5" fill="currentColor"/>
                                    <ellipse cx="12" cy="17.5" rx="0.5" ry="3" fill="currentColor"/>
                                </g>
                            </svg>
                        </div>
                        <h3>Transport to Plot</h3>
                    </div>
                </div>
                <div class="transport-status"></div>
            `;
            llmList.insertBefore(transportItem, llmList.firstChild);
            
            // Add click event for transport item
            transportItem.addEventListener('click', () => {
                if (getSelectedModelId()) {
                    transportLLMToPlot(getSelectedModelId());
                } else {
                    alert("Please select an LLM to transport");
                }
            });
            
            // Add click event for create new item
            createNewItem.addEventListener('click', () => {
                document.getElementById('llm-collection-ui').classList.remove('active');
                document.getElementById('create-llm-ui').classList.add('active');
                // Set global variable to track that create LLM was opened from collection
                window.createLLMOpenedFrom = 'collection';
                // Initialize the creation interface
                setupLLMCreationInterface();
                
                // Clean up carousel
                cleanupCarousel();
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
            
            // Update LLM list to show plot assignments
            updatePlotAssignments();
            
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
                <path d="M11 15h2v2h-2zm0-8h2v6h-2z"/>
            </svg>`;
        case 'humanoid':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
            </svg>`;
        default:
            return '';
    }
}

// New function to update the display of plot assignments
function updatePlotAssignments() {
    const allLLMs = llmDataManager.getAllLLMs();
    
    // Update each LLM item to show its plot assignment
    document.querySelectorAll('.llm-list-item').forEach(item => {
        const id = item.getAttribute('data-id');
        if (!id) return; // Skip items without IDs (like buttons)
        
        const llm = allLLMs.find(l => l.id === id);
        if (!llm) return;
        
        // Check if this LLM has a plot assignment
        if (llm.plotId) {
            // Get the plot data
            const plot = cityData.lots.find(lot => lot.id === llm.plotId);
            
            // Create or update plot assignment indicator
            let statusEl = item.querySelector('.plot-assignment');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.className = 'plot-assignment';
                // Add it after llm-info but before actions
                const infoEl = item.querySelector('.llm-info');
                if (infoEl && infoEl.nextSibling) {
                    item.insertBefore(statusEl, infoEl.nextSibling);
                } else {
                    item.appendChild(statusEl);
                }
            }
            
            statusEl.innerHTML = `
                <div class="plot-icon">📍</div>
                <div class="plot-name">${plot ? plot.name : 'Unknown Plot'}</div>
            `;
        }
    });
}

// New function to transport an LLM to a plot
function transportLLMToPlot(llmId) {
    // Close the collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');
    
    // Initialize the drone transport mode
    initDroneTransport(llmId);
}

// New function to initialize drone transportation mode
function initDroneTransport(llmId) {
    // Store current LLM ID for later use
    window.currentTransportLLMId = llmId;
    
    // Create drone UI overlay
    const droneOverlay = document.createElement('div');
    droneOverlay.className = 'drone-transport-overlay';
    droneOverlay.innerHTML = `
        <div class="drone-controls">
            <div class="drone-info">
                <h3>Drone Transport Mode</h3>
                <p>Select a plot for your LLM</p>
            </div>
            <button class="drone-cancel-btn">Cancel</button>
        </div>
        <div class="drone-model-container"></div>
    `;
    document.body.appendChild(droneOverlay);
    
    // Load the LLM's 3D model in the drone view
    const llm = llmDataManager.getLLMById(llmId);
    if (llm) {
        // Start gyroscope control on mobile devices
        if (window.innerWidth <= 768 && window.DeviceOrientationEvent) {
            initGyroscopeControl();
        }
        
        // Start drone transportation animation
        startDroneAnimation(llm);
    }
    
    // Add cancel button functionality
    droneOverlay.querySelector('.drone-cancel-btn').addEventListener('click', () => {
        cancelDroneTransport();
    });
    
    // Make plot hover info trigger plot selection
    if (window.plotHoverHandlers) {
        window.plotHoverHandlers.onPlotClick = handlePlotSelection;
    }
}

// Function to initialize gyroscope control for mobile
function initGyroscopeControl() {
    // Request permission if needed (iOS requires this)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleGyroscope);
                }
            })
            .catch(console.error);
    } else {
        // Listen for device orientation events
        window.addEventListener('deviceorientation', handleGyroscope);
    }
}

// Handle gyroscope data for drone control
function handleGyroscope(event) {
    const drone = document.querySelector('.drone-model-container');
    if (!drone) return;
    
    // Calculate rotation based on device orientation
    const beta = event.beta;  // X-axis (-180 to 180)
    const gamma = event.gamma; // Y-axis (-90 to 90)
    
    // Apply rotation to drone model (with limits)
    const maxTilt = 15;
    const xTilt = Math.max(-maxTilt, Math.min(maxTilt, gamma));
    const zTilt = Math.max(-maxTilt, Math.min(maxTilt, beta));
    
    drone.style.transform = `rotateY(${xTilt}deg) rotateX(${-zTilt}deg)`;
}

// Function to handle plot selection
function handlePlotSelection(plotId) {
    const llmId = window.currentTransportLLMId;
    if (!llmId) return;
    
    // Update the LLM with the plot assignment
    const llm = llmDataManager.getLLMById(llmId);
    if (llm) {
        llm.plotId = plotId;
        llmDataManager.updateLLM(llm);
        
        // Update city data to mark plot as occupied
        const plot = cityData.lots.find(lot => lot.id === plotId);
        if (plot) {
            plot.available = false;
            plot.llmId = llmId;
        }
        
        // Show success message
        showTransportSuccess(llm, plot);
        
        // Set timeout to return to city view
        setTimeout(() => {
            cleanupDroneTransport();
            // Move the LLM to the plot in the 3D scene
            placeLLMInPlot(llm, plot);
        }, 2000);
    }
}

// Show success message after transport
function showTransportSuccess(llm, plot) {
    const successMsg = document.createElement('div');
    successMsg.className = 'transport-success';
    successMsg.innerHTML = `
        <div class="success-content">
            <h3>Transport Complete!</h3>
            <p>${llm.name} has been assigned to ${plot.name}</p>
        </div>
    `;
    document.body.appendChild(successMsg);
    
    // Remove after animation
    setTimeout(() => {
        successMsg.classList.add('fade-out');
        setTimeout(() => {
            successMsg.remove();
        }, 500);
    }, 1500);
}

// Place the LLM model in the selected plot
function placeLLMInPlot(llm, plot) {
    // This function will be implemented when we have the city scene ready
    // For now, we'll just update the data model
    
    // In a real implementation, we would:
    // 1. Find the plot object in the 3D scene
    // 2. Create the LLM model
    // 3. Position it within the plot boundaries
    console.log(`Placing ${llm.name} in plot ${plot.name}`);
}

// Start drone animation sequence
function startDroneAnimation(llm) {
    const droneContainer = document.querySelector('.drone-model-container');
    if (!droneContainer) return;
    
    droneContainer.innerHTML = `
        <div class="drone-body">
            <div class="drone-propeller prop-1"></div>
            <div class="drone-propeller prop-2"></div>
            <div class="drone-propeller prop-3"></div>
            <div class="drone-propeller prop-4"></div>
            <div class="drone-cargo">
                <div class="llm-model-preview">${llm.name}</div>
            </div>
        </div>
    `;
    
    // Start propeller animation
    document.querySelectorAll('.drone-propeller').forEach(prop => {
        prop.classList.add('spinning');
    });
}

// Cancel drone transport mode
function cancelDroneTransport() {
    cleanupDroneTransport();
    
    // Return to collection view
    setupLLMCollectionView(window.currentTransportLLMId);
}

// Clean up drone transport mode
function cleanupDroneTransport() {
    // Remove event listeners
    window.removeEventListener('deviceorientation', handleGyroscope);
    
    // Remove plot click handler
    if (window.plotHoverHandlers) {
        window.plotHoverHandlers.onPlotClick = null;
    }
    
    // Remove drone overlay
    const overlay = document.querySelector('.drone-transport-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Clear transport LLM ID
    window.currentTransportLLMId = null;
}