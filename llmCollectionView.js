import { llmDataManager } from './llmDataManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCustomCharacter } from './characterGenerator.js';
import { setupLLMViewInterface } from './llmViewInterface.js';
import { createCollectionModels } from './llmCollectionViewUtils.js';
import { setupLLMCreationInterface } from './llmCreationInterface.js';
import { setupLLMCarousel, cleanupCarousel } from './llmCarouselView.js';

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
        
        // Setup carousel view for models
        setupLLMCarousel(collectionViewport, llms);
        
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
        // Cleanup carousel
        cleanupCarousel();
    });
    
    // Add create new button event listener
    document.getElementById('create-new-llm-btn').addEventListener('click', () => {
        collectionUI.classList.remove('active');
        document.getElementById('create-llm-ui').classList.add('active');
        // Initialize the creation interface
        setupLLMCreationInterface();
        
        // Cleanup carousel
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
    setupLLMCreationInterface();
    
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