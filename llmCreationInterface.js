import * as THREE from 'three';
import { generateCharacterCode, createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { saveLLMData } from './saveLLMData.js';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { createRobotModel } from './llmModelCreationRenderer.js';
import { setupAttributeTooltips, optimizeUIHeight } from './llmAttributeTooltips.js';
import { renderAttributeGrid, updatePointsDisplay, resetFormAttributes, handleGenerateCharacter } from './llmCreationInterfaceCompact.js';
import { prepareModelForIndividualColoring, applyColorToMesh } from './llmMeshColorManager.js';
import { initMeshManipulator, updateManipulationDisplays } from './llmMeshManipulator.js';
import { setGlobalReferences, setModels, setSelectedMesh } from './threeJSGlobals.js';
import { setupProfileImageInAppearance } from './llmProfileImageDisplay.js';
import { initializeAllComponents } from './llmSetupHelpers.js';
import { createNameModelOverlay, updateOverlayFromForm, makeOverlayInputsPrimary } from './llmCreationOverlays.js';

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
        delete statusElement.dataset.profileImageUrl;
        delete statusElement.dataset.selectedVoice;
    }
    customCharacter = null;
    
    // Reset profile image display to clear any previous images
    import('./llmCreationInterfaceCompact.js').then(module => {
        module.resetProfileImageDisplay();
    });
    
    // Setup default values for the form
    // Set form values from existing LLM if editing
    if (llmToEdit) {
        const nameInput = document.getElementById('llm-name');
        const modelSelect = document.getElementById('llm-model');
        const colorInput = document.getElementById('llm-color');
        const customPromptInput = document.getElementById('llm-custom-prompt');
        
        // Add null checks to prevent errors when elements don't exist yet
        if (nameInput) nameInput.value = llmToEdit.name || `LLM-${Math.floor(Math.random() * 1000)}`;
        if (modelSelect) modelSelect.value = llmToEdit.model || 'assistant';
        if (colorInput) colorInput.value = llmToEdit.color || '#3cb371';
        if (customPromptInput) customPromptInput.value = llmToEdit.customPrompt || '';
        
        // Store the edit ID on the form
        const createUI = document.getElementById('create-llm-ui');
        if (createUI) {
            createUI.setAttribute('data-edit-mode', 'true');
            createUI.setAttribute('data-edit-id', llmToEdit.id);
        }
    } else {
        // Clear edit mode flags if not editing
        const createUI = document.getElementById('create-llm-ui');
        if (createUI) {
            createUI.removeAttribute('data-edit-mode');
            createUI.removeAttribute('data-edit-id');
        }
    }
    
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
    
    // Initialize the humanoid preview
    initHumanoidPreview(llmToEdit);
    
    // Add event listeners for form elements that should update the humanoid preview
    const colorInput = document.getElementById('llm-color');
    if (colorInput) colorInput.addEventListener('input', updateSelectedMeshColor);
    
    // Setup character generation button
    const generateBtn = document.getElementById('generate-character-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            // Using the moved handleGenerateCharacter function with a callback for state
            handleGenerateCharacter(generatingCharacter, (state) => {
                generatingCharacter = state;
            }).then(result => {
                if (result && result.success) {
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
                    customCharacter = createCustomCharacter(THREE, result.code);
                    humanoidScene.add(customCharacter);
                    
                    const statusElement = document.getElementById('generation-status');
                    statusElement.textContent = "Character generated successfully!";
                }
            });
        });
    }
    
    // Make humanoidScene globally accessible for other modules
    window.currentHumanoidScene = humanoidScene;
    
    // Add the name and model type overlay
    createNameModelOverlay();
    
    // Make overlay inputs primary and ensure form data syncing
    makeOverlayInputsPrimary();
    
    // Update overlay when form elements change
    updateOverlayFromForm();
    
    const nameInput = document.getElementById('llm-name');
    const modelInput = document.getElementById('llm-model');
    if (nameInput) nameInput.addEventListener('input', updateOverlayFromForm);
    if (modelInput) modelInput.addEventListener('change', updateOverlayFromForm);
    
    // Add event listener to form elements to update overlay
    // Removed these lines as per plan
    
    // Add event listener for create button
    const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
    if (createLLMButton) {
        createLLMButton.addEventListener('click', saveLLMData);
        createLLMButton.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';
    }
    
    // Add event listener for reset button
    const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
    if (resetButton) {
        resetButton.addEventListener('click', resetForm);
    }
    
    // Add TTS style file
    const ttsStylesheet = document.createElement('link');
    ttsStylesheet.rel = 'stylesheet';
    ttsStylesheet.href = 'llmTtsStyles.css';
    document.head.appendChild(ttsStylesheet);
    
    // Initialize all components using the new helper
    initializeAllComponents(llmToEdit);

    // Handle window resize for optimizing UI height
    window.addEventListener('resize', () => {
        import('./llmAttributeTooltips.js').then(module => {
            module.optimizeUIHeight();
        });
    });
}

function initHumanoidPreview(llmToEdit) {
    const viewport = document.querySelector('.humanoid-viewport');
    
    // Clear existing content
    viewport.innerHTML = '';
    
    // Setup Three.js scene
    humanoidScene = new THREE.Scene();
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
    
    // Set global references
    setGlobalReferences(humanoidScene, humanoidCamera, humanoidRenderer);
    
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

function createDefaultRobot(llmToEdit) {
    // Get current selected color or color from edit data
    const color = llmToEdit?.color || document.getElementById('llm-color').value;
    const style = llmToEdit?.style || 'modern';
    
    // Create the robot model using the imported function
    const result = createRobotModel(humanoidScene, color, style);
    robotModel = result.model;
    
    // Update global references
    setModels(robotModel, null);
    
    // Prepare the model for individual part coloring
    prepareModelForIndividualColoring(robotModel);
    
    // Store material references
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;
    
    window.robotModel = robotModel;
    
    // Apply stored model data if editing and model data exists
    if (llmToEdit && llmToEdit.modelData) {
        import('./llmModelStorage.js').then(module => {
            module.applyStoredModelData(robotModel, llmToEdit);
            // Ensure model is prepared for individual coloring after applying stored data
            prepareModelForIndividualColoring(robotModel);
        });
    }
}

function handleMeshSelection(event) {
    window.selectedMesh = null;
    
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
    
    // Get the selected mesh name display element
    const selectedMeshNameEl = document.getElementById('selected-mesh-name');
    
    if (intersects.length > 0) {
        // Unhighlight previous selection
        if (selectedMesh && selectedMesh.userData.originalEmissive) {
            selectedMesh.material.emissive.set(selectedMesh.userData.originalEmissive);
            delete selectedMesh.userData.originalEmissive;
        }
        
        // Select the new mesh
        selectedMesh = intersects[0].object;
        
        // Ensure the mesh has its own material instance
        if (selectedMesh.material && !selectedMesh.userData.hasUniqueInstance) {
            selectedMesh.material = selectedMesh.material.clone();
            selectedMesh.userData.hasUniqueInstance = true;
        }
        
        // Store original emissive color and highlight the selection
        if (!selectedMesh.userData.originalEmissive && selectedMesh.material.emissive) {
            selectedMesh.userData.originalEmissive = selectedMesh.material.emissive.clone();
            selectedMesh.material.emissive.set(0x333333);
        }
        
        // Update color picker to match the selected mesh's color
        if (selectedMesh.material.color) {
            const hexColor = '#' + selectedMesh.material.color.getHexString();
            document.getElementById('llm-color').value = hexColor;
        }
        
        // Update the selected mesh name display with formatted part name
        if (selectedMeshNameEl) {
            const displayName = selectedMesh.name || `Part ${meshes.indexOf(selectedMesh) + 1}`;
            
            // Split the name to get type and number (if using the naming convention)
            let partType = "";
            let partName = displayName;
            
            if (displayName.includes('_')) {
                const nameParts = displayName.split('_');
                partType = nameParts[0];
                partName = nameParts.slice(1).join(' ');
            }
            
            // Format the display
            if (partType) {
                selectedMeshNameEl.innerHTML = `${partName} <span class="part-type">${partType}</span>`;
            } else {
                selectedMeshNameEl.textContent = displayName;
            }
            
            selectedMeshNameEl.classList.remove('hidden');
        }
        
        window.selectedMesh = selectedMesh;
        setSelectedMesh(selectedMesh);
        updateManipulationDisplays();
    } else {
        // Unhighlight if clicked elsewhere
        if (selectedMesh && selectedMesh.userData.originalEmissive) {
            selectedMesh.material.emissive.set(selectedMesh.userData.originalEmissive);
            delete selectedMesh.userData.originalEmissive;
        }
        selectedMesh = null;
        
        // Hide the selected mesh name
        if (selectedMeshNameEl) {
            selectedMeshNameEl.classList.add('hidden');
        }
        
        window.selectedMesh = null;
        setSelectedMesh(null);
        
        // Hide manipulation controls when nothing is selected
        const manipulationControls = document.querySelector('.manipulation-controls');
        const noSelectionMessage = document.querySelector('.no-selection-message');
        
        if (manipulationControls) manipulationControls.style.display = 'none';
        if (noSelectionMessage) noSelectionMessage.style.display = 'block';
    }
}

function updateHumanoidPreview() {
    if (!robotModel) return;
    
    // If we have a custom character, don't update the default robot
    if (customCharacter) return;
    
    // Get new color value
    const color = document.getElementById('llm-color').value;
    const style = 'modern';
    
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
    // Get color from the new UI overlay or fall back to hidden input
    const colorOverlay = document.querySelector('.color-input-overlay');
    const color = colorOverlay ? colorOverlay.value : document.getElementById('llm-color').value;
    
    if (selectedMesh && selectedMesh.material) {
        // Use the color manager to apply color only to the selected mesh
        applyColorToMesh(selectedMesh, color);
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
    document.getElementById('llm-custom-prompt').value = '';
    
    // Use imported reset function for attributes
    resetFormAttributes();
    
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

function updateOverlayFromForm() {
    const nameInput = document.querySelector('.overlay-name-input');
    const modelTypeIcon = document.querySelector('.model-type-icon');
    const brushTip = document.querySelector('.brush-tip');
    const colorInputOverlay = document.querySelector('.color-input-overlay');
    
    const llmNameInput = document.getElementById('llm-name');
    const llmModelInput = document.getElementById('llm-model');
    const llmColorInput = document.getElementById('llm-color');
    
    if (nameInput && llmNameInput) {
        nameInput.value = llmNameInput.value;
    }
    
    const currentModel = llmModelInput ? llmModelInput.value : 'assistant';
    if (modelTypeIcon) {
        const modelTypeIcons = {
            assistant: '<i class="fas fa-robot"></i>',
            // Add more model types here
        };
        modelTypeIcon.innerHTML = modelTypeIcons[currentModel] || modelTypeIcons.assistant;
    }
    
    const currentColor = llmColorInput ? llmColorInput.value : '#3cb371';
    if (brushTip) {
        brushTip.style.backgroundColor = currentColor;
    }
    if (colorInputOverlay) {
        colorInputOverlay.value = currentColor;
    }
    
    // Update selected option in dropdown
    const options = document.querySelectorAll('.model-type-option');
    options.forEach(option => {
        if (option.getAttribute('data-value') === currentModel) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}