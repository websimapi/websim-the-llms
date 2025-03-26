import * as THREE from 'three';
import { generateCharacterCode, createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { llmDataManager } from './llmDataManager.js';
import { setupLLMCollectionView } from './llmCollectionView.js';
import { saveLLMData } from './saveLLMData.js';
import { initHumanoidPreview } from './llmModelCreationRenderer.js'; 
import { setupAttributeTooltips, optimizeUIHeight } from './llmAttributeTooltips.js';
import { renderAttributeGrid, updatePointsDisplay, resetFormAttributes, handleGenerateCharacter } from './llmCreationInterfaceCompact.js';
import { prepareModelForIndividualColoring, applyColorToMesh } from './llmMeshColorManager.js';
import { initMeshManipulator, updateManipulationDisplays } from './llmMeshManipulator.js';
import { setGlobalReferences, setModels, setSelectedMesh } from './threeJSGlobals.js';
import { initializeAllComponents } from './llmSetupHelpers.js';

let robotModel; 
let customCharacter = null;
let generatingCharacter = false;
let selectedMesh = null; 

window.renderAttributeGrid = renderAttributeGrid;
window.updatePointsDisplay = updatePointsDisplay;

export function setupLLMCreationInterface(llmToEdit) {
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        delete statusElement.dataset.generatedCode;
        delete statusElement.dataset.profileImageUrl;
        delete statusElement.dataset.selectedVoice;
    }
    customCharacter = null;
    robotModel = null; 

    document.getElementById('llm-name').value = llmToEdit ? llmToEdit.name : `LLM-${Math.floor(Math.random() * 1000)}`;

    attributeSystem.initializeAttributes();

    if (llmToEdit && llmToEdit.attributes) {
        Object.entries(llmToEdit.attributes).forEach(([name, value]) => {
            if (attributeSystem.attributes[name]) {
                attributeSystem.attributes[name].value = value;
            }
        });
        attributeSystem.pointsSpent = 0;
        Object.values(attributeSystem.attributes).forEach(attr => {
            attributeSystem.pointsSpent += attr.value;
        });
    }

    renderAttributeGrid();
    updatePointsDisplay();

    const colorInput = document.getElementById('llm-color');
    colorInput.removeEventListener('input', updateSelectedMeshColor);
    colorInput.addEventListener('input', updateSelectedMeshColor);

    const generateBtn = document.getElementById('generate-character-btn');
    const newGenerateBtn = generateBtn.cloneNode(true); 
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
    newGenerateBtn.addEventListener('click', () => {
        handleGenerateCharacter(generatingCharacter, (state) => {
            generatingCharacter = state;
        }).then(result => {
            if (result && result.success) {
                const { scene } = getGlobalReferences();
                if (!scene) {
                    console.error("Cannot add generated character: Scene not available.");
                    return;
                }

                if (customCharacter && customCharacter.parent) {
                    customCharacter.parent.remove(customCharacter);
                    customCharacter = null;
                    window.customCharacter = null; 
                    setModels(window.robotModel, null); 
                }

                if (robotModel && robotModel.parent) {
                    robotModel.parent.remove(robotModel);
                    robotModel = null;
                    window.robotModel = null; 
                    setModels(null, customCharacter); 
                }

                customCharacter = createCustomCharacter(THREE, result.code);
                prepareModelForIndividualColoring(customCharacter); 
                scene.add(customCharacter); 
                setModels(null, customCharacter); 
                window.customCharacter = customCharacter; 

                statusElement.textContent = "Character generated successfully!";
            }
        });
    });

    if (llmToEdit) {
        document.getElementById('llm-model').value = llmToEdit.model || 'assistant';
        document.getElementById('llm-color').value = llmToEdit.color || '#3cb371';
        document.getElementById('llm-custom-prompt').value = llmToEdit.customPrompt || '';

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
    }

    const { model } = initHumanoidPreview(llmToEdit); 
    if (llmToEdit && llmToEdit.customCharacterCode) {
        customCharacter = model;
        robotModel = null;
    } else {
        robotModel = model;
        customCharacter = null;
    }

    const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
    const newCreateBtn = createLLMButton.cloneNode(true); 
    createLLMButton.parentNode.replaceChild(newCreateBtn, createLLMButton);
    newCreateBtn.addEventListener('click', saveLLMData);
    newCreateBtn.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';

    const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
    const newResetBtn = resetButton.cloneNode(true); 
    resetButton.parentNode.replaceChild(newResetBtn, resetButton);
    newResetBtn.addEventListener('click', resetForm);

    if (!document.querySelector('link[href="llmTtsStyles.css"]')) {
        const ttsStylesheet = document.createElement('link');
        ttsStylesheet.rel = 'stylesheet';
        ttsStylesheet.href = 'llmTtsStyles.css';
        document.head.appendChild(ttsStylesheet);
    }

    initializeAllComponents(llmToEdit); 

    window.removeEventListener('resize', optimizeUIHeightHandler); 
    window.addEventListener('resize', optimizeUIHeightHandler);
}

function optimizeUIHeightHandler() {
    import('./llmAttributeTooltips.js').then(module => {
        module.optimizeUIHeight();
    }).catch(err => console.error("Error optimizing UI height:", err));
}

function handleMeshSelection(event) {
    const { scene, camera, renderer } = getGlobalReferences();
    if (!scene || !camera || !renderer) return;

    if (window.selectedMesh && window.selectedMesh.userData.originalEmissive) {
        if(window.selectedMesh.material && window.selectedMesh.material.emissive){ 
            window.selectedMesh.material.emissive.copy(window.selectedMesh.userData.originalEmissive);
        }
        delete window.selectedMesh.userData.originalEmissive; 
    }
    setSelectedMesh(null); 

    const viewport = document.querySelector('.humanoid-viewport');
    if (!viewport) return; 
    const rect = viewport.getBoundingClientRect();

    const mouse = {
        x: ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1
    };

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera); 

    const meshes = [];
    const currentModel = window.customCharacter || window.robotModel; 
    if (currentModel) {
        currentModel.traverse(child => {
            if (child.isMesh && child.visible) meshes.push(child); 
        });
    }

    const intersects = raycaster.intersectObjects(meshes);

    const selectedMeshNameEl = document.getElementById('selected-mesh-name');

    if (intersects.length > 0) {
        const newSelectedMesh = intersects[0].object;

        if (newSelectedMesh.material && !newSelectedMesh.userData.hasUniqueInstance) {
            newSelectedMesh.material = newSelectedMesh.material.clone();
            newSelectedMesh.userData.hasUniqueInstance = true;
        }

        if (newSelectedMesh.material && newSelectedMesh.material.emissive && !newSelectedMesh.userData.originalEmissive) {
            newSelectedMesh.userData.originalEmissive = newSelectedMesh.material.emissive.clone();
            newSelectedMesh.material.emissive.setHex(0x555555);
        } else if (newSelectedMesh.material && !newSelectedMesh.material.emissive) {
            console.warn("Selected mesh material has no emissive property:", newSelectedMesh.name);
        }

        if (newSelectedMesh.material.color) {
            const hexColor = '#' + newSelectedMesh.material.color.getHexString();
            document.getElementById('llm-color').value = hexColor;
        }

        if (selectedMeshNameEl) {
            const displayName = newSelectedMesh.name || `Part ${meshes.indexOf(newSelectedMesh) + 1}`;

            let partType = "";
            let partName = displayName;

            if (displayName.includes('_')) {
                const nameParts = displayName.split('_');
                partType = nameParts[0];
                partName = nameParts.slice(1).join(' ');
            }

            if (partType) {
                selectedMeshNameEl.innerHTML = `${partName} <span class="part-type">${partType}</span>`;
            } else {
                selectedMeshNameEl.textContent = displayName;
            }

            selectedMeshNameEl.classList.remove('hidden');
        }

        setSelectedMesh(newSelectedMesh); 
        selectedMesh = newSelectedMesh; 
        updateManipulationDisplays(); 
    } else {
        if (selectedMeshNameEl) {
            selectedMeshNameEl.classList.add('hidden');
        }

        setSelectedMesh(null); 
        selectedMesh = null; 

        const manipulationControls = document.querySelector('.manipulation-controls');
        const noSelectionMessage = document.querySelector('.no-selection-message');

        if (manipulationControls) manipulationControls.style.display = 'none';
        if (noSelectionMessage) noSelectionMessage.style.display = 'block';
    }
}

function updateHumanoidPreview() {
    const { scene } = getGlobalReferences();
    if (!scene) return;

    if (window.customCharacter || !window.robotModel) return;

    const color = document.getElementById('llm-color').value;
    const style = 'modern'; 

    if (window.robotModel.parent) {
        window.robotModel.parent.remove(window.robotModel);
    }
    robotModel = null; 
    window.robotModel = null;
    setModels(null, null);

    const { model: newRobot, materials } = createRobotModel(scene, color, style); 
    robotModel = newRobot; 
    window.robotModel = newRobot; 
    setModels(robotModel, null); 

    prepareModelForIndividualColoring(robotModel);
}

function updateSelectedMeshColor() {
    const color = document.getElementById('llm-color').value;
    const currentSelectedMesh = window.selectedMesh; 

    if (currentSelectedMesh && currentSelectedMesh.material) {
        applyColorToMesh(currentSelectedMesh, color);

        if(currentSelectedMesh.material.emissive && currentSelectedMesh.userData.originalEmissive){
            const emissiveColor = new THREE.Color(color).multiplyScalar(0.2);
            currentSelectedMesh.userData.originalEmissive.copy(emissiveColor);
            currentSelectedMesh.material.emissive.setHex(0x555555);
        }

    } else {
        updateHumanoidPreview();
    }
}

function resetForm() {
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;

    document.getElementById('llm-model').selectedIndex = 0;
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-custom-prompt').value = '';

    const createUI = document.getElementById('create-llm-ui');
    createUI.removeAttribute('data-edit-mode');
    createUI.removeAttribute('data-edit-id');

    resetFormAttributes(); 

    const { scene } = getGlobalReferences();
    if (!scene) return;

    if (window.customCharacter && window.customCharacter.parent) {
        window.customCharacter.parent.remove(window.customCharacter);
    }
    customCharacter = null; 
    window.customCharacter = null; 

    if (window.robotModel && window.robotModel.parent) {
        window.robotModel.parent.remove(window.robotModel);
    }
    robotModel = null; 
    window.robotModel = null; 
    setModels(null, null); 

    const { model: newRobot } = createRobotModel(scene); 
    robotModel = newRobot; 
    window.robotModel = newRobot; 
    setModels(robotModel, null); 

    const currentSelectedMesh = window.selectedMesh; 
    if (currentSelectedMesh && currentSelectedMesh.userData.originalEmissive) {
        if(currentSelectedMesh.material && currentSelectedMesh.material.emissive) {
            currentSelectedMesh.material.emissive.copy(currentSelectedMesh.userData.originalEmissive);
        }
        delete currentSelectedMesh.userData.originalEmissive;
    }
    selectedMesh = null; 
    setSelectedMesh(null); 
    updateManipulationDisplays(); 

    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        delete statusElement.dataset.generatedCode;
    }
}