import * as THREE from 'three';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';

let plotModalVisible = false;
let selectedPlotId = null;

// Setup plot interaction - attach to scene raycaster
export function setupPlotInteraction(scene, camera, renderer) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Add click event listener
    renderer.domElement.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Set raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Find intersections with plot outlines
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // Find the first intersected object that has plot data
        for (let i = 0; i < intersects.length; i++) {
            const object = findPlotParent(intersects[i].object);
            if (object && object.userData && object.userData.type === 'lot') {
                handlePlotClick(object.userData.id);
                break;
            }
        }
    });
}

// Find the parent object with plot data
function findPlotParent(object) {
    let current = object;
    while (current) {
        if (current.userData && current.userData.type === 'lot') {
            return current;
        }
        current = current.parent;
    }
    return null;
}

// Handle plot click - show LLM selection modal
function handlePlotClick(plotId) {
    // Prevent multiple modals
    if (plotModalVisible) return;
    
    selectedPlotId = plotId;
    
    // Initialize the LLM data manager if needed
    if (typeof llmDataManager !== 'undefined') {
        llmDataManager.init();
    }
    
    // Create and show the modal
    createPlotModal(plotId);
}

// Create the modal for LLM selection
function createPlotModal(plotId) {
    const modal = document.createElement('div');
    modal.id = 'plot-modal';
    modal.className = 'plot-modal';
    
    // Get LLMs if available
    const llms = (typeof llmDataManager !== 'undefined') ? llmDataManager.getAllLLMs() : [];
    
    // Create modal content
    modal.innerHTML = `
        <div class="plot-modal-content">
            <div class="plot-modal-header">
                <h2>Select LLM for Plot #${plotId}</h2>
                <button class="plot-modal-close">&times;</button>
            </div>
            <div class="plot-modal-body">
                ${createLLMListHTML(llms)}
            </div>
            <div class="plot-modal-footer">
                <button class="plot-modal-cancel">Cancel</button>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    plotModalVisible = true;
    
    // Add event listeners
    setupModalEventListeners(modal);
    
    // Show with animation
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

// Create HTML for LLM list
function createLLMListHTML(llms) {
    if (!llms || llms.length === 0) {
        return `
            <div class="plot-modal-empty">
                <div class="plot-modal-create-new">
                    <div class="create-new-icon">+</div>
                    <div class="create-new-text">Create New LLM</div>
                </div>
                <p>No LLMs available. Create one first.</p>
            </div>
        `;
    }
    
    // Create list of LLMs
    let html = '<div class="plot-llm-list">';
    
    // Add create new option at the top
    html += `
        <div class="plot-modal-create-new plot-llm-item">
            <div class="create-new-icon">+</div>
            <div class="create-new-text">Create New LLM</div>
        </div>
    `;
    
    // Add each LLM
    llms.forEach(llm => {
        let imageHtml = '';
        if (llm.profileImageUrl) {
            imageHtml = `<img src="${llm.profileImageUrl}" alt="${llm.name}" class="plot-llm-image">`;
        } else {
            imageHtml = `<div class="plot-llm-image-placeholder">${llm.name.charAt(0)}</div>`;
        }
        
        html += `
            <div class="plot-llm-item" data-id="${llm.id}">
                <div class="plot-llm-image-container">
                    ${imageHtml}
                </div>
                <div class="plot-llm-info">
                    <div class="plot-llm-name">${llm.name}</div>
                    <div class="plot-llm-type">${llm.model}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Setup event listeners for the modal
function setupModalEventListeners(modal) {
    // Close button
    const closeBtn = modal.querySelector('.plot-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePlotModal);
    }
    
    // Cancel button
    const cancelBtn = modal.querySelector('.plot-modal-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closePlotModal);
    }
    
    // Create new LLM button
    const createNewBtn = modal.querySelector('.plot-modal-create-new');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            closePlotModal();
            openCreateLLMInterface();
        });
    }
    
    // LLM selection
    const llmItems = modal.querySelectorAll('.plot-llm-item[data-id]');
    llmItems.forEach(item => {
        item.addEventListener('click', () => {
            const llmId = item.getAttribute('data-id');
            selectLLMForPlot(llmId);
        });
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePlotModal();
        }
    });
}

// Close the plot modal
function closePlotModal() {
    const modal = document.getElementById('plot-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.remove();
            plotModalVisible = false;
            selectedPlotId = null;
        }, 300);
    }
}

// Open create LLM interface
function openCreateLLMInterface() {
    document.getElementById('create-llm-ui').classList.add('active');
    
    // Initialize the creation interface
    if (typeof setupLLMCreationInterface === 'function') {
        setupLLMCreationInterface();
    }
}

// Select LLM for the plot
function selectLLMForPlot(llmId) {
    // TO DO: Implement LLM placement logic here
    console.log(`Selected LLM ${llmId} for plot ${selectedPlotId}`);
    
    // Close the modal
    closePlotModal();
    
    // Show success message
    showNotification(`LLM assigned to plot #${selectedPlotId}`);
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'plot-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
