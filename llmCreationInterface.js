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
// Removed setupProfileImageDisplay import, handled by helper
import { initializeAllComponents } from './llmSetupHelpers.js';

let humanoidScene, humanoidCamera, humanoidRenderer, humanoidClock;
let robotModel;
let headMaterial, bodyMaterial, limbsMaterial;
let customCharacter = null;
let generatingCharacter = false;
let humanoidMixer = null; // Initialize mixer as null
let selectedMesh = null; // Track the currently selected mesh

// Global function references for helpers
window.renderAttributeGrid = renderAttributeGrid;
window.updatePointsDisplay = updatePointsDisplay;

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
    robotModel = null; // Ensure robot model is reset

    // Reset profile image display (now handled within initializeAllComponents -> setupProfileImageDisplay)

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

    // Make sure attribute grid is rendered after potential attribute loading
    renderAttributeGrid();
    updatePointsDisplay();

    // Add event listeners for form elements that should update the humanoid preview
    const colorInput = document.getElementById('llm-color');
    // Remove previous listener if exists
    colorInput.removeEventListener('input', updateSelectedMeshColor);
    colorInput.addEventListener('input', updateSelectedMeshColor);


    // Setup character generation button
    const generateBtn = document.getElementById('generate-character-btn');
    // Remove previous listener if exists
    const newGenerateBtn = generateBtn.cloneNode(true); // Clone to remove listeners
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
    newGenerateBtn.addEventListener('click', () => {
        // Using the moved handleGenerateCharacter function with a callback for state
        handleGenerateCharacter(generatingCharacter, (state) => {
            generatingCharacter = state;
        }).then(result => {
            if (result && result.success) {
                // Remove previous custom character if it exists
                if (customCharacter && customCharacter.parent) {
                    customCharacter.parent.remove(customCharacter);
                    customCharacter = null;
                    window.customCharacter = null;
                    setModels(robotModel, null);
                }

                // Remove default robot if it exists
                if (robotModel && robotModel.parent) {
                    robotModel.parent.remove(robotModel);
                    robotModel = null;
                    window.robotModel = null;
                    setModels(null, customCharacter);
                }

                // Create the new character
                customCharacter = createCustomCharacter(THREE, result.code);
                prepareModelForIndividualColoring(customCharacter); // Prepare for coloring/manipulation
                humanoidScene.add(customCharacter);
                setModels(null, customCharacter); // Update global refs
                window.customCharacter = customCharacter; // Ensure window ref is updated


                const statusElement = document.getElementById('generation-status');
                statusElement.textContent = "Character generated successfully!";
            }
        });
    });

    // Set form values from existing LLM if editing
    if (llmToEdit) {
        document.getElementById('llm-model').value = llmToEdit.model || 'assistant';
        document.getElementById('llm-color').value = llmToEdit.color || '#3cb371';
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
        // Set default color if creating new
        document.getElementById('llm-color').value = '#3cb371';
        document.getElementById('llm-custom-prompt').value = '';
        // Reset model type to default if creating new
        document.getElementById('llm-model').value = 'assistant';
    }

    // Make humanoidScene globally accessible for other modules
    window.currentHumanoidScene = null;

    // Initialize the humanoid preview
    initHumanoidPreview(llmToEdit); // This now correctly handles loading custom vs default

    // Add event listener for create button
    const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
    const newCreateBtn = createLLMButton.cloneNode(true); // Clone to remove listeners
    createLLMButton.parentNode.replaceChild(newCreateBtn, createLLMButton);
    newCreateBtn.addEventListener('click', saveLLMData);
    newCreateBtn.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';


    // Add event listener for reset button
    const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
    const newResetBtn = resetButton.cloneNode(true); // Clone to remove listeners
    resetButton.parentNode.replaceChild(newResetBtn, resetButton);
    newResetBtn.addEventListener('click', resetForm);

    // Add TTS style file if not already present
    if (!document.querySelector('link[href="llmTtsStyles.css"]')) {
        const ttsStylesheet = document.createElement('link');
        ttsStylesheet.rel = 'stylesheet';
        ttsStylesheet.href = 'llmTtsStyles.css';
        document.head.appendChild(ttsStylesheet);
    }


    // Initialize all components using the new helper
    initializeAllComponents(llmToEdit); // This handles TTS, Profile Image, Badges, Tooltips, Manipulator setup

    // Handle window resize for optimizing UI height
    window.removeEventListener('resize', optimizeUIHeightHandler); // Remove previous listener
    window.addEventListener('resize', optimizeUIHeightHandler);
}

// Wrapper function for resize handler
function optimizeUIHeightHandler() {
     import('./llmAttributeTooltips.js').then(module => {
         module.optimizeUIHeight();
     }).catch(err => console.error("Error optimizing UI height:", err));
}


function initHumanoidPreview(llmToEdit) {
    const viewport = document.querySelector('.humanoid-viewport');

    // Clear existing content
    viewport.innerHTML = '';
    humanoidScene = null; // Clear scene reference

    // Setup Three.js scene
    humanoidScene = new THREE.Scene();
    humanoidScene.background = new THREE.Color(0x111111);
    window.currentHumanoidScene = humanoidScene; // Update global ref immediately

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
    humanoidRenderer.domElement.removeEventListener('click', handleMeshSelection); // Remove previous
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

    // Clear previous models before creating new ones
    if (robotModel && robotModel.parent) robotModel.parent.remove(robotModel);
    if (customCharacter && customCharacter.parent) customCharacter.parent.remove(customCharacter);
    robotModel = null;
    customCharacter = null;
    window.robotModel = null;
    window.customCharacter = null;
    setModels(null, null);

    // If editing and has custom character code, use it
    if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            customCharacter = createCustomCharacter(THREE, llmToEdit.customCharacterCode);
            humanoidScene.add(customCharacter);
            prepareModelForIndividualColoring(customCharacter); // Prepare for coloring/manipulation
            setModels(null, customCharacter); // Update global refs
            window.customCharacter = customCharacter; // Ensure window ref is updated

            // Apply saved model data if it exists
            if (llmToEdit.modelData) {
                import('./llmModelStorage.js').then(module => {
                    module.applyStoredModelData(customCharacter, llmToEdit);
                    // Re-prepare after applying stored data if needed, though applyStoredModelData might handle materials
                    prepareModelForIndividualColoring(customCharacter);
                }).catch(err => console.error("Error applying stored model data:", err));
            }

            // Store the generated code for later use
            const statusElement = document.getElementById('generation-status');
            if(statusElement) {
                statusElement.dataset.generatedCode = llmToEdit.customCharacterCode;
                statusElement.textContent = "Character loaded successfully!";
            }

        } catch (error) {
            console.error("Error loading custom character:", error);
            createDefaultRobot(llmToEdit); // Fallback to default robot
        }
    } else {
        // Create default robot humanoid model
        createDefaultRobot(llmToEdit);
    }

    // Setup animation clock
    humanoidClock = new THREE.Clock();
    humanoidMixer = null; // Initialize mixer as null

    // Start animation loop
    animateHumanoid();

    // Handle resize
    window.removeEventListener('resize', humanoidResizeHandler); // Remove previous
    window.addEventListener('resize', humanoidResizeHandler);
}

// Wrapper function for humanoid resize
function humanoidResizeHandler() {
     const viewport = document.querySelector('.humanoid-viewport');
     if (humanoidCamera && humanoidRenderer && viewport) {
         humanoidCamera.aspect = viewport.clientWidth / viewport.clientHeight;
         humanoidCamera.updateProjectionMatrix();
         humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
     }
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
    window.robotModel = robotModel; // Ensure window ref is updated


    // Prepare the model for individual part coloring
    prepareModelForIndividualColoring(robotModel);

    // Store material references
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;


    // Apply stored model data if editing and model data exists
    if (llmToEdit && llmToEdit.modelData && !llmToEdit.customCharacterCode) { // Only apply if not loading custom char
        import('./llmModelStorage.js').then(module => {
            module.applyStoredModelData(robotModel, llmToEdit);
            // Ensure model is prepared for individual coloring after applying stored data
            prepareModelForIndividualColoring(robotModel);
        }).catch(err => console.error("Error applying stored model data to robot:", err));
    }
}

function handleMeshSelection(event) {
    // Clear previous selection highlight visually
    if (selectedMesh && selectedMesh.userData.originalEmissive) {
        if(selectedMesh.material && selectedMesh.material.emissive){ // Check if material still exists
             selectedMesh.material.emissive.copy(selectedMesh.userData.originalEmissive);
        }
        delete selectedMesh.userData.originalEmissive; // Clean up user data
    }
    selectedMesh = null; // Reset internal selection state

    const viewport = document.querySelector('.humanoid-viewport');
    if (!viewport) return; // Exit if viewport doesn't exist
    const rect = viewport.getBoundingClientRect();

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouse = {
        x: ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1
    };

    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, humanoidCamera);

    // Get objects to test for intersection (only visible models)
    const meshes = [];
    const currentModel = customCharacter || robotModel; // Prioritize custom character
    if (currentModel) {
        currentModel.traverse(child => {
            if (child.isMesh && child.visible) meshes.push(child); // Only intersect visible meshes
        });
    }


    // Find intersections
    const intersects = raycaster.intersectObjects(meshes);

    // Get the selected mesh name display element
    const selectedMeshNameEl = document.getElementById('selected-mesh-name');

    if (intersects.length > 0) {
        // Select the new mesh
        selectedMesh = intersects[0].object;

        // Ensure the mesh has its own material instance if needed (might already be done)
        if (selectedMesh.material && !selectedMesh.userData.hasUniqueInstance) {
            selectedMesh.material = selectedMesh.material.clone();
            selectedMesh.userData.hasUniqueInstance = true;
        }

        // Store original emissive color and highlight the selection
        if (selectedMesh.material && selectedMesh.material.emissive && !selectedMesh.userData.originalEmissive) {
            selectedMesh.userData.originalEmissive = selectedMesh.material.emissive.clone();
            // Make highlight less intense, maybe slightly yellow/white
            selectedMesh.material.emissive.setHex(0x555555);
        } else if (selectedMesh.material && !selectedMesh.material.emissive) {
             // If material has no emissive, maybe add a slight outline or wireframe? For now, do nothing.
             console.warn("Selected mesh material has no emissive property:", selectedMesh.name);
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

        // Update global state
        window.selectedMesh = selectedMesh;
        setSelectedMesh(selectedMesh);
        updateManipulationDisplays(); // Show controls and update values
    } else {
        // Clicked elsewhere - Deselect

        // Hide the selected mesh name
        if (selectedMeshNameEl) {
            selectedMeshNameEl.classList.add('hidden');
        }

        // Update global state
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
    // This function should mainly update the *default robot* if it exists and no custom char is present
    if (customCharacter || !robotModel) return;


    // Get new color value
    const color = document.getElementById('llm-color').value;
    const style = 'modern';

    // Remove existing robot model
    if (robotModel.parent) {
        robotModel.parent.remove(robotModel);
    }
    robotModel = null; // Clear reference
    window.robotModel = null;
    setModels(null, null);

    // Create a new robot with updated materials
    const result = createRobotModel(humanoidScene, color, style);
    robotModel = result.model;
    window.robotModel = robotModel;
    setModels(robotModel, null);


    // Prepare the model for individual part coloring
    prepareModelForIndividualColoring(robotModel);

    // Update stored material references
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;
}

function updateSelectedMeshColor() {
    const color = document.getElementById('llm-color').value;

    if (selectedMesh && selectedMesh.material) {
        // Use the color manager to apply color only to the selected mesh
        applyColorToMesh(selectedMesh, color);

         // Also update the originalEmissive based on the new color
         if(selectedMesh.material.emissive && selectedMesh.userData.originalEmissive){
             const emissiveColor = new THREE.Color(color).multiplyScalar(0.2);
             selectedMesh.userData.originalEmissive.copy(emissiveColor);
             // Keep the highlight color distinct
             selectedMesh.material.emissive.setHex(0x555555);
         }

    } else {
        // If no mesh is selected, update the entire default robot (if present)
        updateHumanoidPreview();
    }
}


let animationFrameId = null; // Store animation frame ID
function animateHumanoid() {
    // Cancel previous frame if exists
    if(animationFrameId) cancelAnimationFrame(animationFrameId);

    if (!humanoidScene || !humanoidCamera || !humanoidRenderer) {
        console.log("Skipping animation: scene/camera/renderer missing");
        return; // Don't request new frame if setup is incomplete
    }


    animationFrameId = requestAnimationFrame(animateHumanoid);

    const currentModel = customCharacter || robotModel;

    // Simple idle animation
    if (currentModel) {
        const time = Date.now() * 0.001;

        // Gentle bobbing motion
        currentModel.position.y = Math.sin(time) * 0.05;

        // Gentle rotation
        currentModel.rotation.y = Math.sin(time * 0.5) * 0.5;
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

    // Clear edit mode flags
    const createUI = document.getElementById('create-llm-ui');
    createUI.removeAttribute('data-edit-mode');
    createUI.removeAttribute('data-edit-id');

    // Use imported reset function for attributes and profile image etc.
    resetFormAttributes(); // This now handles attributes, profile image display, voice, etc.

    // Reset humanoid model
    if (customCharacter && customCharacter.parent) {
        customCharacter.parent.remove(customCharacter);
    }
    customCharacter = null;
    window.customCharacter = null;

    if (robotModel && robotModel.parent) {
         robotModel.parent.remove(robotModel);
    }
     robotModel = null; // Clear reference
     window.robotModel = null;
     setModels(null, null);


    // Create a new default robot with default settings
    createDefaultRobot(); // Pass nothing to get defaults


    // Clear selection state
    if (selectedMesh && selectedMesh.userData.originalEmissive) {
         if(selectedMesh.material && selectedMesh.material.emissive) {
            selectedMesh.material.emissive.copy(selectedMesh.userData.originalEmissive);
         }
        delete selectedMesh.userData.originalEmissive;
    }
    selectedMesh = null;
    window.selectedMesh = null;
    setSelectedMesh(null);
    updateManipulationDisplays(); // Update UI to show no selection

    // Reset generation status
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        delete statusElement.dataset.generatedCode;
    }
}