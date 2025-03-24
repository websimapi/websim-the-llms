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

let humanoidScene, humanoidCamera, humanoidRenderer, humanoidClock;
let robotModel;
let headMaterial, bodyMaterial, limbsMaterial;
let customCharacter = null;
let generatingCharacter = false;
let humanoidMixer = null; 
let selectedMesh = null; 

export function setupLLMCreationInterface(llmToEdit) {
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = '';
        delete statusElement.dataset.generatedCode;
    }
    customCharacter = null;
    
    document.getElementById('llm-name').value = llmToEdit ? llmToEdit.name : `LLM-${Math.floor(Math.random() * 1000)}`;
    
    attributeSystem.initializeAttributes();
    
    if (llmToEdit && llmToEdit.attributes) {
        Object.entries(llmToEdit.attributes).forEach(([name, value]) => {
            if (attributeSystem.attributes[name]) {
                attributeSystem.attributes[name].value = value;
                attributeSystem.pointsSpent += value;
            }
        });
        
        if (llmToEdit.profileImageUrl) {
            const statusElement = document.getElementById('generation-status');
            if (statusElement) {
                statusElement.dataset.profileImageUrl = llmToEdit.profileImageUrl;
            }
        }
    }
    
    renderAttributeGrid();
    updatePointsDisplay();
    
    document.getElementById('llm-color').addEventListener('input', updateSelectedMeshColor);
    
    const generateBtn = document.getElementById('generate-character-btn');
    generateBtn.addEventListener('click', () => {
        handleGenerateCharacter(generatingCharacter, (state) => {
            generatingCharacter = state;
        }).then(result => {
            if (result && result.success) {
                if (customCharacter && customCharacter.parent) {
                    customCharacter.parent.remove(customCharacter);
                }
                
                if (robotModel && robotModel.parent) {
                    robotModel.parent.remove(robotModel);
                    robotModel = null;
                }
                
                customCharacter = createCustomCharacter(THREE, result.code);
                humanoidScene.add(customCharacter);
                
                const statusElement = document.getElementById('generation-status');
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
    }
    
    window.currentHumanoidScene = null;
    
    initHumanoidPreview(llmToEdit);
    
    window.currentHumanoidScene = humanoidScene;
    
    const createLLMButton = document.querySelector('.create-llm-actions .create-llm-button:not(.secondary)');
    createLLMButton.addEventListener('click', saveLLMData);
    createLLMButton.textContent = llmToEdit ? 'Save LLM' : 'Create LLM';
    
    const resetButton = document.querySelector('.create-llm-actions .create-llm-button.secondary');
    resetButton.addEventListener('click', resetForm);
    
    import('./llmCreationInterfaceCompact.js').then(module => {
        module.setupProfileImageUI();
        module.addProfileImageToEditor();
        
        if (llmToEdit && llmToEdit.profileImageUrl) {
            module.updateProfileImageDisplay(llmToEdit.profileImageUrl);
        }
    });
    
    setTimeout(() => {
        import('./llmAttributeTooltips.js').then(module => {
            module.setupAttributeTooltips();
            module.optimizeUIHeight();
        });
    }, 100);
    
    setTimeout(() => {
        initMeshManipulator();
        
        const manipulationControls = document.querySelector('.manipulation-controls');
        if (manipulationControls) manipulationControls.style.display = 'none';
    }, 200);
    
    window.addEventListener('resize', () => {
        import('./llmAttributeTooltips.js').then(module => {
            module.optimizeUIHeight();
        });
    });
}

function initHumanoidPreview(llmToEdit) {
    const viewport = document.querySelector('.humanoid-viewport');
    
    viewport.innerHTML = '';
    
    humanoidScene = new THREE.Scene();
    humanoidScene.background = new THREE.Color(0x111111);
    
    humanoidCamera = new THREE.PerspectiveCamera(
        45, 
        viewport.clientWidth / viewport.clientHeight, 
        0.1, 
        1000
    );
    humanoidCamera.position.set(0, 1.5, 4);
    humanoidCamera.lookAt(0, 1, 0);
    
    humanoidRenderer = new THREE.WebGLRenderer({ antialias: true });
    humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    humanoidRenderer.shadowMap.enabled = true;
    viewport.appendChild(humanoidRenderer.domElement);
    
    setGlobalReferences(humanoidScene, humanoidCamera, humanoidRenderer);
    
    humanoidRenderer.domElement.addEventListener('click', handleMeshSelection);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    humanoidScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    humanoidScene.add(directionalLight);
    
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
    
    if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            customCharacter = createCustomCharacter(THREE, llmToEdit.customCharacterCode);
            window.customCharacter = customCharacter;
            humanoidScene.add(customCharacter);
            
            if (llmToEdit.modelData) {
                import('./llmModelStorage.js').then(module => {
                    module.applyStoredModelData(customCharacter, llmToEdit);
                });
            }
            
            const statusElement = document.getElementById('generation-status');
            statusElement.dataset.generatedCode = llmToEdit.customCharacterCode;
            statusElement.textContent = "Character loaded successfully!";
        } catch (error) {
            console.error("Error loading custom character:", error);
            createDefaultRobot(llmToEdit);
        }
    } else {
        createDefaultRobot(llmToEdit);
    }
    
    humanoidClock = new THREE.Clock();
    humanoidMixer = null; 
    
    animateHumanoid();
    
    window.addEventListener('resize', () => {
        if (humanoidCamera && humanoidRenderer && viewport) {
            humanoidCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            humanoidCamera.updateProjectionMatrix();
            humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
}

function createDefaultRobot(llmToEdit) {
    const color = llmToEdit?.color || document.getElementById('llm-color').value;
    const style = llmToEdit?.style || 'modern';
    
    const result = createRobotModel(humanoidScene, color, style);
    robotModel = result.model;
    
    setModels(robotModel, null);
    
    prepareModelForIndividualColoring(robotModel);
    
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;
    
    window.robotModel = robotModel;
    
    if (llmToEdit && llmToEdit.modelData) {
        import('./llmModelStorage.js').then(module => {
            module.applyStoredModelData(robotModel, llmToEdit);
            prepareModelForIndividualColoring(robotModel);
        });
    }
}

function handleMeshSelection(event) {
    window.selectedMesh = null;
    
    const viewport = document.querySelector('.humanoid-viewport');
    const rect = viewport.getBoundingClientRect();
    
    const mouse = {
        x: ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1
    };
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, humanoidCamera);
    
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
    
    const intersects = raycaster.intersectObjects(meshes);
    
    const selectedMeshNameEl = document.getElementById('selected-mesh-name');
    
    if (intersects.length > 0) {
        if (selectedMesh && selectedMesh.userData.originalEmissive) {
            selectedMesh.material.emissive.set(selectedMesh.userData.originalEmissive);
            delete selectedMesh.userData.originalEmissive;
        }
        
        selectedMesh = intersects[0].object;
        
        if (selectedMesh.material && !selectedMesh.userData.hasUniqueInstance) {
            selectedMesh.material = selectedMesh.material.clone();
            selectedMesh.userData.hasUniqueInstance = true;
        }
        
        if (!selectedMesh.userData.originalEmissive && selectedMesh.material.emissive) {
            selectedMesh.userData.originalEmissive = selectedMesh.material.emissive.clone();
            selectedMesh.material.emissive.set(0x333333);
        }
        
        if (selectedMesh.material.color) {
            const hexColor = '#' + selectedMesh.material.color.getHexString();
            document.getElementById('llm-color').value = hexColor;
        }
        
        if (selectedMeshNameEl) {
            const displayName = selectedMesh.name || `Part ${meshes.indexOf(selectedMesh) + 1}`;
            
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
        
        window.selectedMesh = selectedMesh;
        setSelectedMesh(selectedMesh);
        updateManipulationDisplays();
    } else {
        if (selectedMesh && selectedMesh.userData.originalEmissive) {
            selectedMesh.material.emissive.set(selectedMesh.userData.originalEmissive);
            delete selectedMesh.userData.originalEmissive;
        }
        selectedMesh = null;
        
        if (selectedMeshNameEl) {
            selectedMeshNameEl.classList.add('hidden');
        }
        
        window.selectedMesh = null;
        setSelectedMesh(null);
        
        const manipulationControls = document.querySelector('.manipulation-controls');
        const noSelectionMessage = document.querySelector('.no-selection-message');
        
        if (manipulationControls) manipulationControls.style.display = 'none';
        if (noSelectionMessage) noSelectionMessage.style.display = 'block';
    }
}

function updateHumanoidPreview() {
    if (!robotModel) return;
    
    if (customCharacter) return;
    
    const color = document.getElementById('llm-color').value;
    const style = 'modern';
    
    if (robotModel.parent) {
        robotModel.parent.remove(robotModel);
    }
    
    const result = createRobotModel(humanoidScene, color, style);
    robotModel = result.model;
    window.robotModel = robotModel;
    
    headMaterial = result.materials.headMaterial;
    bodyMaterial = result.materials.bodyMaterial;
    limbsMaterial = result.materials.limbsMaterial;
}

function updateSelectedMeshColor() {
    const color = document.getElementById('llm-color').value;
    
    if (selectedMesh && selectedMesh.material) {
        applyColorToMesh(selectedMesh, color);
    } else {
        updateHumanoidPreview();
    }
}

function animateHumanoid() {
    if (!humanoidScene || !humanoidCamera || !humanoidRenderer) return;
    
    requestAnimationFrame(animateHumanoid);
    
    if (robotModel) {
        const time = Date.now() * 0.001;
        
        robotModel.position.y = Math.sin(time) * 0.05;
        
        robotModel.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    if (customCharacter) {
        const time = Date.now() * 0.001;
        customCharacter.position.y = Math.sin(time) * 0.05;
        customCharacter.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    if (humanoidMixer) {
        humanoidMixer.update(humanoidClock.getDelta());
    }
    
    humanoidRenderer.render(humanoidScene, humanoidCamera);
}

function resetForm() {
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
    
    document.getElementById('llm-model').selectedIndex = 0;
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-custom-prompt').value = '';
    
    resetFormAttributes();
    
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