import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { setupViewScene, renderLLMModel, startViewAnimation, stopViewAnimation } from './llmViewDetails.js';

let viewScene, viewCamera, viewRenderer;
let viewModel = null;
let viewAnimation;

export function setupLLMViewInterface(llmId) {
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    // Get the details panel
    const detailsPanel = document.getElementById('llm-details-panel');
    
    // Update UI elements
    updateDetailsPanel(llm);
    
    // Set up 3D view
    const viewportContainer = document.querySelector('.llm-detail-viewport');
    if (!viewportContainer) {
        // Create viewport if it doesn't exist
        createViewport(detailsPanel);
    }
    
    // Initialize the 3D view using the new module
    const viewportReady = setupViewScene(document.querySelector('.llm-detail-viewport'));
    
    if (viewportReady) {
        // Create the model with retry support
        renderLLMModel(llm);
        
        // Start animation
        startViewAnimation();
    }
    
    // Show edit button and add event listener
    const editButton = document.querySelector('.edit-llm-btn');
    if (editButton) {
        editButton.setAttribute('data-id', llm.id);
        editButton.addEventListener('click', () => handleEditLLM(llm.id));
    }
    
    // Show the panel
    detailsPanel.classList.add('active');
}

function createViewport(detailsPanel) {
    // Create viewport container
    const contentDiv = detailsPanel.querySelector('.details-content');
    
    const viewportContainer = document.createElement('div');
    viewportContainer.className = 'llm-detail-viewport';
    
    // Insert the viewport before the attributes section
    const attributesSection = detailsPanel.querySelector('.llm-detail-attributes');
    contentDiv.insertBefore(viewportContainer, attributesSection);
}

function updateDetailsPanel(llm) {
    const nameEl = document.querySelector('.llm-detail-name');
    const modelEl = document.querySelector('.llm-detail-model');
    const createdAtEl = document.querySelector('.llm-detail-created');
    const attributesEl = document.querySelector('.llm-detail-attributes');
    
    nameEl.textContent = llm.name;
    modelEl.textContent = llm.model;
    createdAtEl.textContent = new Date(llm.createdAt).toLocaleDateString();
    
    // Add edit button if it doesn't exist
    if (!document.querySelector('.edit-llm-btn')) {
        const editButton = document.createElement('button');
        editButton.className = 'edit-llm-btn';
        editButton.textContent = 'Edit LLM';
        editButton.setAttribute('data-id', llm.id);
        
        // Add after the name
        nameEl.parentNode.insertBefore(editButton, nameEl.nextSibling);
    }
    
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
}

function handleEditLLM(llmId) {
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    // Close the details panel
    document.getElementById('llm-details-panel').classList.remove('active');
    
    // Close the collection UI
    document.getElementById('llm-collection-ui').classList.remove('active');
    
    // Open the creation UI in edit mode
    const createUI = document.getElementById('create-llm-ui');
    createUI.classList.add('active');
    createUI.setAttribute('data-edit-mode', 'true');
    createUI.setAttribute('data-edit-id', llmId);
    
    // Set up the creation interface with the LLM data
    setupLLMCreationInterface(llm);
    
    // Cancel animation
    stopViewAnimation();
}