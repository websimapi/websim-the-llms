// New file to reduce size of llmCreationInterface.js
import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { setupAttributeTooltips, optimizeUIHeight } from './llmAttributeTooltips.js';

// Function to render the attribute grid - moved from llmCreationInterface.js
export function renderAttributeGrid() {
    const gridContainer = document.getElementById('attribute-grid');
    gridContainer.innerHTML = '';
    
    const attributesArray = attributeSystem.getAttributesArray();
    
    attributesArray.forEach(attr => {
        const item = document.createElement('div');
        item.className = 'attribute-item';
        
        const header = document.createElement('div');
        header.className = 'attribute-header';
        
        const name = document.createElement('div');
        name.className = 'attribute-name';
        name.textContent = attr.name;
        
        const controls = document.createElement('div');
        controls.className = 'attribute-controls';
        
        const decBtn = document.createElement('button');
        decBtn.className = 'attribute-button';
        decBtn.textContent = '-';
        decBtn.disabled = attr.value <= 0;
        decBtn.onclick = () => {
            if (attributeSystem.decrementAttribute(attr.name)) {
                renderAttributeGrid();
                updatePointsDisplay();
            }
        };
        
        const value = document.createElement('span');
        value.className = 'attribute-value-text';
        value.textContent = attr.value;
        
        const incBtn = document.createElement('button');
        incBtn.className = 'attribute-button';
        incBtn.textContent = '+';
        incBtn.disabled = attributeSystem.getRemainingPoints() <= 0 || 
                           attr.value >= attributeSystem.maxPointsPerAttribute;
        incBtn.onclick = () => {
            if (attributeSystem.incrementAttribute(attr.name)) {
                renderAttributeGrid();
                updatePointsDisplay();
            }
        };
        
        controls.appendChild(decBtn);
        controls.appendChild(value);
        controls.appendChild(incBtn);
        
        header.appendChild(name);
        header.appendChild(controls);
        
        const valueBar = document.createElement('div');
        valueBar.className = 'attribute-value';
        
        const valueFill = document.createElement('div');
        valueFill.className = 'attribute-fill';
        valueFill.style.width = `${(attr.value / attributeSystem.maxPointsPerAttribute) * 100}%`;
        
        valueBar.appendChild(valueFill);
        
        const description = document.createElement('div');
        description.className = 'attribute-description';
        description.textContent = attr.description;
        
        item.appendChild(header);
        item.appendChild(valueBar);
        item.appendChild(description);
        
        gridContainer.appendChild(item);
    });
}

// Function to update points display - moved from llmCreationInterface.js
export function updatePointsDisplay() {
    const pointsDisplay = document.getElementById('points-remaining');
    const remaining = attributeSystem.getRemainingPoints();
    pointsDisplay.textContent = `${remaining} Points Remaining`;
    
    // Change color based on points remaining
    if (remaining <= 3) {
        pointsDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    } else if (remaining <= 7) {
        pointsDisplay.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
    } else {
        pointsDisplay.style.backgroundColor = 'rgba(60, 179, 113, 0.2)';
    }
}

// New function to reset form elements
export function resetFormAttributes() {
    // Reset attributes
    attributeSystem.initializeAttributes();
    renderAttributeGrid();
    updatePointsDisplay();
    
    // Clear any stored profile image URL
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        delete statusElement.dataset.profileImageUrl;
    }
    
    // Hide the preview if it's open
    const previewContainer = document.getElementById('profile-image-preview-container');
    if (previewContainer) {
        previewContainer.classList.add('hidden');
    }
    
    // Reset profile image display in editor
    const profileImage = document.querySelector('.profile-image');
    const placeholder = document.querySelector('.profile-image-placeholder');
    if (profileImage && placeholder) {
        profileImage.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

// Add profile image to editor UI
export function addProfileImageToEditor() {
    const basicInfoGroup = document.querySelector('.settings-group:first-child');
    if (!basicInfoGroup) return;
    
    // Create profile image container if it doesn't exist yet
    if (!document.querySelector('.profile-image-display')) {
        // Create profile image container
        const profileImageContainer = document.createElement('div');
        profileImageContainer.className = 'profile-image-display';
        profileImageContainer.innerHTML = `
            <div class="profile-image-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#555"/>
                </svg>
            </div>
            <img class="profile-image hidden" alt="LLM Profile">
        `;
        
        // Insert before the name input
        const firstSettingItem = basicInfoGroup.querySelector('.setting-item');
        basicInfoGroup.insertBefore(profileImageContainer, firstSettingItem);
    }
    
    // Check if we have a stored image URL
    const statusElement = document.getElementById('generation-status');
    if (statusElement && statusElement.dataset.profileImageUrl) {
        updateProfileImageDisplay(statusElement.dataset.profileImageUrl);
    }
}

// New function to initialize profile image UI
export function setupProfileImageUI() {
    // Add profile image to editor first
    addProfileImageToEditor();
    
    // Import and setup the profile image capture functionality
    import('./llmProfileImageUI.js').then(module => {
        module.setupProfileImageCapture();
    }).catch(error => {
        console.error("Error setting up profile image capture:", error);
    });
}

// Character generation handler - moved from llmCreationInterface.js
export async function handleGenerateCharacter(generatingCharacter, setGeneratingCharacter) {
    if (generatingCharacter) return;
    
    const promptInput = document.getElementById('llm-custom-prompt');
    const userPrompt = promptInput.value.trim();
    const statusElement = document.getElementById('generation-status');
    const generateBtn = document.getElementById('generate-character-btn');
    
    if (userPrompt.length < 5) {
        statusElement.textContent = "Please enter a more detailed description";
        return;
    }
    
    setGeneratingCharacter(true);
    statusElement.textContent = "Generating character...";
    generateBtn.disabled = true;
    
    try {
        // Import the function from characterGenerator.js to fix the reference error
        const { generateCharacterCode } = await import('./characterGenerator.js');
        const generatedCode = await generateCharacterCode(userPrompt);
        
        // Store the generated code for later use
        statusElement.dataset.generatedCode = generatedCode;
        
        // Return the generated code to the caller
        return {
            success: true,
            code: generatedCode
        };
    } catch (error) {
        console.error("Failed to generate character:", error);
        statusElement.textContent = "Failed to generate character. Try again with a different description.";
        return {
            success: false,
            error: error
        };
    } finally {
        setGeneratingCharacter(false);
        generateBtn.disabled = false;
    }
}