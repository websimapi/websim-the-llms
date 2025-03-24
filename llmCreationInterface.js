import * as THREE from 'three';
import { generateCharacterCode, createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { saveLLMData } from './saveLLMData.js';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { createRobotModel } from './llmModelCreationRenderer.js';
import { enhanceCreationUIInteraction } from './llmCreationUIEnhancements.js';

let humanoidScene, humanoidCamera, humanoidRenderer, humanoidClock;
let robotModel;
let headMaterial, bodyMaterial, limbsMaterial;
let customCharacter = null;
let generatingCharacter = false;
let humanoidMixer = null; // Initialize mixer as null
let selectedMesh = null; // Track the currently selected mesh

export function setupLLMCreationInterface(llmToEdit) {
    // Clear previous generation state
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        delete statusElement.dataset.generatedCode;
    }
    customCharacter = null;
    
    // Setup default values for the form
    document.getElementById('llm-name').value = llmToEdit ? llmToEdit.name : `LLM-${Math.floor(Math.random() * 1000)}`;
    
    // Initialize attribute system
    attributeSystem.initializeAttributes();
    
    // If editing an existing LLM, load its attributes
    if (llmToEdit && llmToEdit.attributes) {
        Object.entries(llmToEdit.attributes).forEach(([name, value]) => {
            if (attributeSystem.attributes[name]) {
                // Set the stored value
                attributeSystem.attributes[name].value = value;
                attributeSystem.pointsSpent += value;
            }
        });
    }
    
    renderAttributeGrid();
    updatePointsDisplay();
    
    // Add event listeners for form elements that should update the humanoid preview
    document.getElementById('llm-color').addEventListener('input', updateSelectedMeshColor);
    document.getElementById('llm-style').addEventListener('change', updateHumanoidPreview);
    
    // Setup character generation button
    const generateBtn = document.getElementById('generate-character-btn');
    generateBtn.addEventListener('click', handleGenerateCharacter);
    
    // Set form values from existing LLM if editing
    if (llmToEdit) {
        document.getElementById('llm-model').value = llmToEdit.model || 'assistant';
        document.getElementById('llm-color').value = llmToEdit.color || '#3cb371';
        document.getElementById('llm-style').value = llmToEdit.style || 'modern';
        document.getElementById('llm-custom-prompt').value = llmToEdit.customPrompt || '';
        
        // Store the edit ID on the form
        const createUI = document.getElementById('create-llm-ui');
        createUI.setAttribute('data-edit-mode', 'true');
        createUI.setAttribute('data-edit-id', llmToEdit.id);
    } else {
        // Clear edit mode flags if not editing
        const createUI = document.getElementById('create-llm-ui');
        createUI.removeAttribute('data-edit-mode');
        createUI.removeAttribute('data-edit-id');
    }
    
    // Initialize the humanoid preview
    initHumanoidPreview(llmToEdit);
    
    // Add event listener for create button
    const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
    createLLMButton.addEventListener('click', saveLLMData);
    createLLMButton.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';
    
    // Add event listener for reset button
    const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
    resetButton.addEventListener('click', resetForm);
    
    // Add enhanced UI interactions
    enhanceCreationUIInteraction();
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
        
        // Store the generated code for later use
        statusElement.dataset.generatedCode = generatedCode;
        
        // Remove previous custom character if it exists
        if (customCharacter && customCharacter.parent) {
            customCharacter.parent.remove(customCharacter);
        }
        
        // Remove default robot if it exists
        if (robotModel && robotModel.parent) {
            robotModel.parent.remove(robotModel);
            robotModel = null;
        }
        
        // Create the new character
        customCharacter = createCustomCharacter(THREE, generatedCode);
        humanoidScene.add(customCharacter);
        
        statusElement.textContent = "Character generated successfully!";
    } catch (error) {
        console.error("Failed to generate character:", error);
        statusElement.textContent = "Failed to generate character. Try again with a different description.";
    } finally {
        generatingCharacter = false;
        generateBtn.disabled = false;
    }
}

function initHumanoidPreview(llmToEdit) {
    const viewport = document.querySelector('.humanoid-viewport');
    
    // Clear existing content
    viewport.innerHTML = '';
    
    // Setup Three.js scene
    humanoidScene = new THREE.Scene();
    window.currentHumanoidScene = humanoidScene;
    humanoidScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    humanoidCamera = new THREE.PerspectiveCamera(
        45, 
        viewport.clientWidth / viewport.clientHeight, 
        0.1, 
        1000
    );
    humanoidCamera.position.set(0, 1.5, 4);
    humanoidCamera.lookAt(0, 1, 0);
    
    // Setup renderer
    humanoidRenderer = new THREE.WebGLRenderer({ antialias: true });
    humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    humanoidRenderer.shadowMap.enabled = true;
    viewport.appendChild(humanoidRenderer.domElement);
    
    // Add click event listener for mesh selection
    humanoidRenderer.domElement.addEventListener('click', handleMeshSelection);
    
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    humanoidScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    humanoidScene.add(directionalLight);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -1;
    humanoidScene.add(ground);
    
    // If editing and has custom character code, use it
    if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            customCharacter = createCustomCharacter(THREE, llmToEdit.customCharacterCode);
            window.customCharacter = customCharacter;
            humanoidScene.add(customCharacter);
            
            // Apply saved model data if it exists
            if (llmToEdit.modelData) {
                import('./llmModelStorage.js').then(module => {
                    module.applyStoredModelData(customCharacter, llmToEdit);
                });
            }
            
            // Store the generated code for later use
            const statusElement = document.getElementById('generation-status');
            statusElement.dataset.generatedCode = llmToEdit.customCharacterCode;
            statusElement.textContent = "Character loaded successfully!";
        } catch (error) {
            console.error("Error loading custom character:", error);
            createDefaultRobot(llmToEdit);
        }
    } else {
        // Create robot humanoid model
        createDefaultRobot(llmToEdit);
    }
    
    // Setup animation clock
    humanoidClock = new THREE.Clock();
    humanoidMixer = null; // Initialize mixer as null
    
    // Start animation loop
    animateHumanoid();
    
    // Handle resize
    window.addEventListener('resize', () => {
        if (humanoidCamera && humanoidRenderer && viewport) {
            humanoidCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            humanoidCamera.updateProjectionMatrix();
            humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
}

// New helper function to create default robot with proper model data application
function createDefaultRobot(llmToEdit) {
    // Get current selected color or color from edit data
    const color = llmToEdit?.color || document.getElementById('llm-color').value;
    const style = llmToEdit?.style || document.getElementById('llm-style').value;
    
    // Create the robot model using the imported function
    const result = createRobotModel(humanoidScene, color, style);
    robotModel = result.model;
    
    // Store material references
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;
    
    window.robotModel = robotModel;
    
    // Apply stored model data if editing and model data exists
    if (llmToEdit && llmToEdit.modelData) {
        import('./llmModelStorage.js').then(module => {
            module.applyStoredModelData(robotModel, llmToEdit);
        });
    }
}

function handleMeshSelection(event) {
    const viewport = document.querySelector('.humanoid-viewport');
    const rect = viewport.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouse = {
        x: ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1
    };
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, humanoidCamera);
    
    // Get objects to test for intersection
    const meshes = [];
    if (robotModel) {
        robotModel.traverse(child => {
            if (child.isMesh) meshes.push(child);
        });
    }
    if (customCharacter) {
        customCharacter.traverse(child => {
            if (child.isMesh) meshes.push(child);
        });
    }
    
    // Find intersections
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
        // Unhighlight previous selection
        if (selectedMesh && selectedMesh.userData.originalEmissive) {
            selectedMesh.material.emissive.set(selectedMesh.userData.originalEmissive);
            delete selectedMesh.userData.originalEmissive;
        }
        
        // Select the new mesh
        selectedMesh = intersects[0].object;
        
        // Store original emissive color and highlight the selection
        if (!selectedMesh.userData.originalEmissive && selectedMesh.material.emissive) {
            selectedMesh.userData.originalEmissive = selectedMesh.material.emissive.clone();
            selectedMesh.material.emissive.set(0x333333);
        }
        
        // Update color picker to match the selected mesh's color
        if (selectedMesh.material.color) {
            const hexColor = '#' + selectedMesh.material.color.getHexString();
            document.getElementById('llm-color').value = hexColor;
            
            // Update the color display element
            const colorDisplay = document.getElementById('color-display');
            if (colorDisplay) {
                colorDisplay.style.backgroundColor = hexColor;
            }
            
            // Update the selected part indicator
            const indicator = document.getElementById('selected-part-indicator');
            if (indicator) {
                indicator.textContent = selectedMesh.name || 'Part selected';
                indicator.style.backgroundColor = '#3cb371';
                indicator.style.color = 'white';
            }
        }
    } else {
        // Unhighlight if clicked elsewhere
        if (selectedMesh && selectedMesh.userData.originalEmissive) {
            selectedMesh.material.emissive.set(selectedMesh.userData.originalEmissive);
            delete selectedMesh.userData.originalEmissive;
        }
        selectedMesh = null;
        
        // Update the selected part indicator
        const indicator = document.getElementById('selected-part-indicator');
        if (indicator) {
            indicator.textContent = 'No part selected';
            indicator.style.backgroundColor = '#333';
        }
    }
}

function updateHumanoidPreview() {
    if (!robotModel) return;
    
    // If we have a custom character, don't update the default robot
    if (customCharacter) return;
    
    // Get new color and style values
    const color = document.getElementById('llm-color').value;
    const style = document.getElementById('llm-style').value;
    
    // Remove existing robot model
    if (robotModel.parent) {
        robotModel.parent.remove(robotModel);
    }
    
    // Create a new robot with updated materials
    const result = createRobotModel(humanoidScene, color, style);
    robotModel = result.model;
    window.robotModel = robotModel;
    
    // Update stored material references
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;
}

function updateSelectedMeshColor() {
    const color = document.getElementById('llm-color').value;
    
    if (selectedMesh && selectedMesh.material) {
        // Update just the selected mesh's color
        selectedMesh.material.color.set(color);
        
        // Also update emissive with a toned down version of the color
        if (selectedMesh.material.emissive) {
            // Store the highlight for selection state
            if (!selectedMesh.userData.originalEmissive) {
                selectedMesh.userData.originalEmissive = new THREE.Color(color).multiplyScalar(0.2);
            } else {
                selectedMesh.userData.originalEmissive.set(new THREE.Color(color).multiplyScalar(0.2));
            }
            
            // Keep the highlight if it's selected
            selectedMesh.material.emissive.set(0x333333);
        }
    } else {
        // If no mesh is selected, fall back to the original behavior
        updateHumanoidPreview();
    }
}

function animateHumanoid() {
    if (!humanoidScene || !humanoidCamera || !humanoidRenderer) return;
    
    requestAnimationFrame(animateHumanoid);
    
    // Simple idle animation
    if (robotModel) {
        const time = Date.now() * 0.001;
        
        // Gentle bobbing motion
        robotModel.position.y = Math.sin(time) * 0.05;
        
        // Gentle rotation
        robotModel.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    // Apply similar animation to custom character if it exists
    if (customCharacter) {
        const time = Date.now() * 0.001;
        customCharacter.position.y = Math.sin(time) * 0.05;
        customCharacter.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    // Update animation mixer if exists
    if (humanoidMixer) {
        humanoidMixer.update(humanoidClock.getDelta());
    }
    
    humanoidRenderer.render(humanoidScene, humanoidCamera);
}

function resetForm() {
    // Reset name with random number
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
    
    // Reset other form values
    document.getElementById('llm-model').selectedIndex = 0;
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-style').selectedIndex = 0;
    document.getElementById('llm-custom-prompt').value = '';
    
    // Reset attributes
    attributeSystem.initializeAttributes();
    renderAttributeGrid();
    updatePointsDisplay();
    
    // Reset humanoid
    if (customCharacter && customCharacter.parent) {
        customCharacter.parent.remove(customCharacter);
        customCharacter = null;
    }
    
    if (!robotModel) {
        createDefaultRobot();
    } else {
        updateHumanoidPreview();
    }
}