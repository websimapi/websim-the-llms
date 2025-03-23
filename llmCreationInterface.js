import * as THREE from 'three';
import { generateCharacterCode, createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { llmStorage } from './llmStorage.js';
import { initHumanoidPreview, updateSelectedMeshColor, updateHumanoidPreview, setCustomCharacter } from './humanoidPreview.js';

let generatingCharacter = false;

export function setupLLMCreationInterface(editId = null) {
    // Track if we're in edit mode
    const editMode = editId !== null;
    let currentLLM = null;
    
    if (editMode) {
        currentLLM = llmStorage.getLLMById(editId);
        if (!currentLLM) {
            console.error('LLM not found for editing:', editId);
            editMode = false;
        }
    }
    
    // Setup default values for the form or load existing data
    if (editMode && currentLLM) {
        document.getElementById('llm-name').value = currentLLM.name;
        document.getElementById('llm-model').value = currentLLM.model;
        document.getElementById('llm-color').value = currentLLM.appearance.color;
        document.getElementById('llm-style').value = currentLLM.appearance.style;
        document.getElementById('llm-custom-prompt').value = currentLLM.appearance.customPrompt || '';
        
        // Load attributes
        attributeSystem.attributes = { ...attributeSystem.attributes };
        Object.keys(attributeSystem.attributes).forEach(key => {
            if (currentLLM.attributes[key] !== undefined) {
                attributeSystem.attributes[key].value = currentLLM.attributes[key];
            }
        });
        attributeSystem.pointsSpent = Object.values(attributeSystem.attributes).reduce(
            (total, attr) => total + attr.value, 0
        );
    } else {
        document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
        // Initialize attribute system with default values
        attributeSystem.initializeAttributes();
    }
    
    renderAttributeGrid();
    updatePointsDisplay();
    
    // Add event listeners for form elements that should update the humanoid preview
    document.getElementById('llm-color').addEventListener('input', updateSelectedMeshColor);
    document.getElementById('llm-style').addEventListener('change', updateHumanoidPreview);
    
    // Setup character generation button
    const generateBtn = document.getElementById('generate-character-btn');
    generateBtn.addEventListener('click', handleGenerateCharacter);
    
    // Initialize the humanoid preview
    initHumanoidPreview();
    
    // Setup save button event handler
    const createLLMButton = document.querySelector('.create-llm-button:not(.secondary)');
    createLLMButton.textContent = editMode ? 'Update LLM' : 'Create LLM';
    createLLMButton.addEventListener('click', () => saveLLM(editId));
    
    // Setup reset button
    const resetButton = document.querySelector('.create-llm-button.secondary');
    resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all fields?')) {
            attributeSystem.initializeAttributes();
            renderAttributeGrid();
            updatePointsDisplay();
            
            if (!editMode) {
                document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
                document.getElementById('llm-model').value = 'assistant';
                document.getElementById('llm-color').value = '#3cb371';
                document.getElementById('llm-style').value = 'modern';
                document.getElementById('llm-custom-prompt').value = '';
            } else {
                setupLLMCreationInterface(editId);
            }
        }
    });
}

// Function to render the attribute grid
function renderAttributeGrid() {
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

// Function to update points display
function updatePointsDisplay() {
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

// Function to handle character generation
async function handleGenerateCharacter() {
    if (generatingCharacter) return;
    
    const promptInput = document.getElementById('llm-custom-prompt');
    const userPrompt = promptInput.value.trim();
    const statusElement = document.getElementById('generation-status');
    const generateBtn = document.getElementById('generate-character-btn');
    
    if (userPrompt.length < 5) {
        statusElement.textContent = "Please enter a more detailed description";
        return;
    }
    
    generatingCharacter = true;
    statusElement.textContent = "Generating character...";
    generateBtn.disabled = true;
    
    try {
        const generatedCode = await generateCharacterCode(userPrompt);
        
        // Store the generated code globally for saving with the LLM
        window.generatedCharacterCode = generatedCode;
        
        // Create the new character
        const newCustomCharacter = createCustomCharacter(THREE, generatedCode);
        setCustomCharacter(newCustomCharacter);
        
        statusElement.textContent = "Character generated successfully!";
    } catch (error) {
        console.error("Failed to generate character:", error);
        statusElement.textContent = "Failed to generate character. Try again with a different description.";
    } finally {
        generatingCharacter = false;
        generateBtn.disabled = false;
    }
}

// Function to save LLM data
function saveLLM(editId = null) {
    // Validate form
    const name = document.getElementById('llm-name').value.trim();
    if (!name) {
        alert('Please enter a name for your LLM');
        return;
    }
    
    // Get all form values
    const model = document.getElementById('llm-model').value;
    const color = document.getElementById('llm-color').value;
    const style = document.getElementById('llm-style').value;
    const customPrompt = document.getElementById('llm-custom-prompt').value.trim();
    
    // Prepare LLM data object
    const llmData = {
        id: editId || undefined, // If editId is provided, use it, otherwise undefined for new LLM
        name,
        model,
        appearance: {
            color,
            style,
            customPrompt: customPrompt || undefined
        },
        attributes: attributeSystem.exportAttributes(),
        createdAt: editId ? llmStorage.getLLMById(editId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Store character representation if available
    if (window.generatedCharacterCode) {
        llmData.appearance.characterCode = window.generatedCharacterCode;
    }
    
    // Save the LLM
    llmStorage.saveLLM(llmData);
    
    // Show success message
    alert(`LLM ${editId ? 'updated' : 'created'} successfully!`);
    
    // Close the creation UI
    document.getElementById('create-llm-ui').classList.remove('active');
    
    // Show the LLM list
    import('./llmListUI.js').then(module => {
        module.setupLLMListUI();
    });
}

// Keep track of the generated character code
window.generatedCharacterCode = null;