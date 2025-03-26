import * as THREE from 'three';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { saveLLMData } from './saveLLMData.js';
// Updated imports for compact functions
import { renderAttributeGrid, updatePointsDisplay, resetFormAttributes, handleGenerateCharacter, setupCreditSlider } from './llmCreationInterfaceCompact.js';
import { setGlobalReferences, setModels, setSelectedMesh, getGlobalReferences } from './threeJSGlobals.js';
import { initializeAllComponents } from './llmSetupHelpers.js';
import { initHumanoidPreview, updateSelectedMeshColor, resetPreviewModel, displayGeneratedCharacter } from './llmModelCreationRenderer.js';
import { optimizeUIHeight } from './llmAttributeTooltips.js'; 

// Removed global preview variables - managed within llmModelCreationRenderer.js
let generatingCharacter = false; // Keep generation state

// Global function references (can likely be removed if not used externally)
window.renderAttributeGrid = renderAttributeGrid;
window.updatePointsDisplay = updatePointsDisplay;

export function setupLLMCreationInterface(llmToEdit) {
    console.log("Setting up LLM Creation Interface. Editing:", !!llmToEdit);
    // Clear previous generation state
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        statusElement.classList.remove('error'); // Clear error state
        delete statusElement.dataset.generatedCode;
        delete statusElement.dataset.profileImageUrl;
        delete statusElement.dataset.selectedVoice;
    }
    generatingCharacter = false; // Reset generation flag


    // Setup default values for the form
    document.getElementById('llm-name').value = llmToEdit ? llmToEdit.name : `LLM-${Math.floor(Math.random() * 1000)}`;

    // Initialize attribute system
    attributeSystem.initializeAttributes();

    // If editing an existing LLM, load its attributes
    if (llmToEdit && llmToEdit.attributes) {
        let spentPoints = 0;
        Object.entries(llmToEdit.attributes).forEach(([name, value]) => {
            if (attributeSystem.attributes[name]) {
                // Ensure value doesn't exceed max
                const cappedValue = Math.min(value, attributeSystem.maxPointsPerAttribute);
                attributeSystem.attributes[name].value = cappedValue;
                spentPoints += cappedValue; // Sum up loaded points
            }
        });
         // Ensure spent points doesn't exceed total available
         attributeSystem.pointsSpent = Math.min(spentPoints, attributeSystem.totalPointsAvailable);
    }

    // Render attribute grid AFTER potentially loading attributes
    renderAttributeGrid();
    updatePointsDisplay();

    // Add event listeners for form elements that should update the humanoid preview
    const colorInput = document.getElementById('llm-color');
    colorInput.removeEventListener('input', updateSelectedMeshColor); // Use the function from the renderer module
    colorInput.addEventListener('input', updateSelectedMeshColor);


    // Setup character generation button
    const generateBtn = document.getElementById('generate-character-btn');
    const newGenerateBtn = generateBtn.cloneNode(true); // Clone to remove listeners
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
    newGenerateBtn.addEventListener('click', () => {
        handleGenerateCharacter(generatingCharacter, (state) => { // Pass state setter
            generatingCharacter = state;
        }).then(result => {
            if (result && result.success) {
                // Call the function in the renderer module to display the new character
                displayGeneratedCharacter(result.code);
            }
        });
    });

    // Set form values from existing LLM if editing
    if (llmToEdit) {
        document.getElementById('llm-model').value = llmToEdit.model || 'assistant';
        document.getElementById('llm-color').value = llmToEdit.color || '#3cb371';
        document.getElementById('llm-custom-prompt').value = llmToEdit.customPrompt || '';
        // Set credit slider value if stored (assuming it might be stored in future)
        const creditSlider = document.getElementById('generation-credits');
        const creditValueDisplay = document.getElementById('generation-credits-value');
        if (creditSlider && llmToEdit.generationCredits) { // Check for a potential future property
             creditSlider.value = llmToEdit.generationCredits;
             if(creditValueDisplay) creditValueDisplay.textContent = llmToEdit.generationCredits;
        } else if (creditSlider) {
             creditSlider.value = 5; // Default if not stored
             if(creditValueDisplay) creditValueDisplay.textContent = '5';
        }

        const createUI = document.getElementById('create-llm-ui');
        createUI.setAttribute('data-edit-mode', 'true');
        createUI.setAttribute('data-edit-id', llmToEdit.id);
    } else {
        const createUI = document.getElementById('create-llm-ui');
        createUI.removeAttribute('data-edit-mode');
        createUI.removeAttribute('data-edit-id');
        document.getElementById('llm-color').value = '#3cb371';
        document.getElementById('llm-custom-prompt').value = '';
        document.getElementById('llm-model').value = 'assistant';
         // Reset credit slider to default for new LLM
         const creditSlider = document.getElementById('generation-credits');
         const creditValueDisplay = document.getElementById('generation-credits-value');
         if (creditSlider) creditSlider.value = 5;
         if (creditValueDisplay) creditValueDisplay.textContent = '5';
    }

    // Setup the credit slider listener
    setupCreditSlider();

    // Initialize the humanoid preview using the function from the renderer module
    initHumanoidPreview(llmToEdit); // Pass llmToEdit

    // Add event listener for create/save button
    const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
    const newCreateBtn = createLLMButton.cloneNode(true);
    createLLMButton.parentNode.replaceChild(newCreateBtn, createLLMButton);
    newCreateBtn.addEventListener('click', saveLLMData);
    newCreateBtn.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';


    // Add event listener for reset button
    const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
    const newResetBtn = resetButton.cloneNode(true);
    resetButton.parentNode.replaceChild(newResetBtn, resetButton);
    newResetBtn.addEventListener('click', resetForm);

    // Add TTS style file if not already present
    if (!document.querySelector('link[href="llmTtsStyles.css"]')) {
        const ttsStylesheet = document.createElement('link');
        ttsStylesheet.rel = 'stylesheet';
        ttsStylesheet.href = 'llmTtsStyles.css';
        document.head.appendChild(ttsStylesheet);
    }


    // Initialize all UI components (TTS, Profile Image, Badges, Tooltips, Manipulator)
    initializeAllComponents(llmToEdit);

    // Handle window resize for optimizing UI height
    window.removeEventListener('resize', optimizeUIHeightHandler); // Remove previous listener
    window.addEventListener('resize', optimizeUIHeightHandler);
}

// Wrapper function for resize handler
function optimizeUIHeightHandler() {
     // Use optimizeUIHeight directly as it's imported
     optimizeUIHeight();
}


function resetForm() {
    // Reset name with random number
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;

    // Reset other form values
    document.getElementById('llm-model').selectedIndex = 0; // Assuming first option is default
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-custom-prompt').value = '';

    // Clear edit mode flags
    const createUI = document.getElementById('create-llm-ui');
    createUI.removeAttribute('data-edit-mode');
    createUI.removeAttribute('data-edit-id');

    // Use imported reset function for attributes and profile image etc.
    resetFormAttributes();

    // Reset the 3D preview model to the default robot
    resetPreviewModel();

    // Reset generation status
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        statusElement.classList.remove('error');
        delete statusElement.dataset.generatedCode;
    }

     // Deselect any selected mesh in the UI and global state
     const selectedMeshNameEl = document.getElementById('selected-mesh-name');
     if (selectedMeshNameEl) selectedMeshNameEl.classList.add('hidden');
     // Import dynamically
     import('./threeJSGlobals.js').then(globals => {
         globals.setSelectedMesh(null);
     });
     const manipulationControls = document.querySelector('.manipulation-controls');
     const noSelectionMessage = document.querySelector('.no-selection-message');
     if (manipulationControls) manipulationControls.style.display = 'none';
     if (noSelectionMessage) noSelectionMessage.style.display = 'block';

}