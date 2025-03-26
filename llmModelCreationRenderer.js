import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { prepareModelForIndividualColoring, applyColorToMesh } from './llmMeshColorManager.js';
import { updateManipulationDisplays } from './llmMeshManipulator.js';
import { setGlobalReferences, setModels, setSelectedMesh, getGlobalReferences } from './threeJSGlobals.js';
import { llmDataManager } from './llmDataManager.js'; // Needed for loading data

// --- Moved from llmCreationInterface.js ---

// Renamed humanoidScene, etc. to previewScene for clarity
let previewScene, previewCamera, previewRenderer, previewClock;
let robotModel; // Keep track of the default robot model instance
let customCharacter = null; // Keep track of the custom character instance
let selectedMesh = null; // Track the currently selected mesh
let humanoidMixer = null; // Animation mixer

export function initHumanoidPreview(llmToEdit) {
    const viewport = document.querySelector('.humanoid-viewport');
    if (!viewport) {
        console.error("Humanoid viewport not found!");
        return;
    }

    // Clear existing content and references
    viewport.innerHTML = '';
    previewScene = null;
    robotModel = null;
    customCharacter = null;
    selectedMesh = null;
    humanoidMixer = null;
    cancelAnimationFrame(animationFrameId); // Cancel any previous animation loop

    // Setup Three.js scene
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x111111);

    // Setup camera
    previewCamera = new THREE.PerspectiveCamera(
        45,
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    previewCamera.position.set(0, 1.5, 4);
    previewCamera.lookAt(0, 1, 0);

    // Setup renderer
    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    previewRenderer.shadowMap.enabled = true;
    viewport.appendChild(previewRenderer.domElement);

    // Set global references (important for other modules like profile image capture)
    setGlobalReferences(previewScene, previewCamera, previewRenderer);
    setSelectedMesh(null); // Reset global selected mesh
    setModels(null, null); // Reset global model references

    // Add click event listener for mesh selection
    previewRenderer.domElement.removeEventListener('click', handleMeshSelection); // Remove previous
    previewRenderer.domElement.addEventListener('click', handleMeshSelection);


    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    previewScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    previewScene.add(directionalLight);

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
    ground.position.y = -1; // Set ground position slightly lower than model base
    previewScene.add(ground);

    // Load the correct model (custom or default)
    loadInitialModel(llmToEdit);

    // Setup animation clock
    previewClock = new THREE.Clock();

    // Start animation loop
    animatePreview();

    // Handle resize
    window.removeEventListener('resize', previewResizeHandler); // Remove previous
    window.addEventListener('resize', previewResizeHandler);
}

function loadInitialModel(llmToEdit) {
     // Clear previous models from the scene first
     if (robotModel && robotModel.parent) robotModel.parent.remove(robotModel);
     if (customCharacter && customCharacter.parent) customCharacter.parent.remove(customCharacter);
     robotModel = null;
     customCharacter = null;
     setModels(null, null); // Update global refs

     if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            // Import dynamically to avoid circular dependencies if createCustomCharacter needs this module
            import('./characterGenerator.js').then(module => {
                customCharacter = module.createCustomCharacter(THREE, llmToEdit.customCharacterCode);
                if (!customCharacter) throw new Error("createCustomCharacter returned null");

                previewScene.add(customCharacter);
                prepareModelForIndividualColoring(customCharacter);
                setModels(null, customCharacter);

                // Apply saved model data if it exists
                if (llmToEdit.modelData) {
                    import('./llmModelStorage.js').then(storageModule => {
                        storageModule.applyStoredModelData(customCharacter, llmToEdit);
                        // Re-prepare after applying stored data
                        prepareModelForIndividualColoring(customCharacter);
                    }).catch(err => console.error("Error applying stored model data:", err));
                }

                // Update status
                const statusElement = document.getElementById('generation-status');
                if (statusElement) {
                    statusElement.dataset.generatedCode = llmToEdit.customCharacterCode;
                    statusElement.textContent = "Custom character loaded.";
                }

            }).catch(error => {
                console.error("Error loading custom character module or creating character:", error);
                createDefaultRobotModel(llmToEdit); // Fallback
            });

        } catch (error) {
            console.error("Error loading custom character:", error);
            createDefaultRobotModel(llmToEdit); // Fallback
        }
    } else {
        // Create default robot humanoid model
        createDefaultRobotModel(llmToEdit);
    }
}

// Renamed from createDefaultRobot
export function createDefaultRobotModel(llmToEdit) {
    // Get current selected color or color from edit data
    const color = llmToEdit?.color || document.getElementById('llm-color')?.value || '#3cb371';
    const style = llmToEdit?.style || 'modern';

    // Create the robot model using the imported function
    // Pass the previewScene so it gets added correctly
    const result = createRobotModel(previewScene, color, style); // Pass scene here
    robotModel = result.model;

    // Update global references
    setModels(robotModel, null);

    // Prepare the model for individual part coloring
    prepareModelForIndividualColoring(robotModel);

    // Apply stored model data if editing and model data exists
    if (llmToEdit && llmToEdit.modelData && !llmToEdit.customCharacterCode) {
        import('./llmModelStorage.js').then(module => {
            module.applyStoredModelData(robotModel, llmToEdit);
            // Ensure model is prepared for individual coloring after applying stored data
            prepareModelForIndividualColoring(robotModel);
        }).catch(err => console.error("Error applying stored model data to robot:", err));
    }

     // Adjust position after potential data loading
     if(robotModel) {
        const tempBox = new THREE.Box3().setFromObject(robotModel);
        const lowestPointY = tempBox.min.y;
        robotModel.position.y = -lowestPointY + 0.01;
     }

    return robotModel; // Return the created model
}


function handleMeshSelection(event) {
    // Clear previous selection highlight visually
    if (selectedMesh && selectedMesh.userData.originalEmissive) {
        if (selectedMesh.material && selectedMesh.material.emissive) {
            selectedMesh.material.emissive.copy(selectedMesh.userData.originalEmissive);
        }
        delete selectedMesh.userData.originalEmissive; // Clean up user data
    }
    selectedMesh = null; // Reset internal selection state
    setSelectedMesh(null); // Update global state

    const viewport = document.querySelector('.humanoid-viewport');
    if (!viewport || !previewRenderer || !previewCamera) return;
    const rect = viewport.getBoundingClientRect();

    const mouse = {
        x: ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1
    };

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, previewCamera);

    const meshes = [];
    const currentModel = customCharacter || robotModel;
    if (currentModel) {
        currentModel.traverse(child => {
            if (child.isMesh && child.visible) meshes.push(child);
        });
    }

    const intersects = raycaster.intersectObjects(meshes);
    const selectedMeshNameEl = document.getElementById('selected-mesh-name');

    if (intersects.length > 0) {
        selectedMesh = intersects[0].object;
        setSelectedMesh(selectedMesh); // Update global state

        // Highlight
        if (selectedMesh.material && selectedMesh.material.emissive && !selectedMesh.userData.originalEmissive) {
            selectedMesh.userData.originalEmissive = selectedMesh.material.emissive.clone();
            selectedMesh.material.emissive.setHex(0x555555); // Highlight color
        } else if (selectedMesh.material && !selectedMesh.material.emissive) {
            console.warn("Selected mesh material has no emissive property:", selectedMesh.name);
        }

        // Update color picker
        if (selectedMesh.material.color) {
            const colorPicker = document.getElementById('llm-color');
            if(colorPicker) {
                colorPicker.value = '#' + selectedMesh.material.color.getHexString();
            }
        }

        // Update name display
        if (selectedMeshNameEl) {
            const displayName = selectedMesh.name || `Part ${meshes.indexOf(selectedMesh) + 1}`;
            let partType = "";
            let partName = displayName;
            if (displayName.includes('_')) {
                const nameParts = displayName.split('_');
                partType = nameParts[0];
                partName = nameParts.slice(1).join(' ');
            }
            selectedMeshNameEl.innerHTML = partType ? `${partName} <span class="part-type">${partType}</span>` : displayName;
            selectedMeshNameEl.classList.remove('hidden');
        }

        updateManipulationDisplays(); // Show controls and update values
    } else {
        // Clicked elsewhere - Deselect
        if (selectedMeshNameEl) selectedMeshNameEl.classList.add('hidden');
        const manipulationControls = document.querySelector('.manipulation-controls');
        const noSelectionMessage = document.querySelector('.no-selection-message');
        if (manipulationControls) manipulationControls.style.display = 'none';
        if (noSelectionMessage) noSelectionMessage.style.display = 'block';
    }
}

export function updateSelectedMeshColor() {
    const colorInput = document.getElementById('llm-color');
    if (!colorInput) return;
    const color = colorInput.value;
    const { selectedMesh: currentSelectedMesh, models: currentModels } = getGlobalReferences(); // Use destructured values

    if (currentSelectedMesh && currentSelectedMesh.material) {
        applyColorToMesh(currentSelectedMesh, color);
        // Update originalEmissive based on new color
        if (currentSelectedMesh.material.emissive && currentSelectedMesh.userData.originalEmissive) {
            const emissiveColor = new THREE.Color(color).multiplyScalar(0.2);
            currentSelectedMesh.userData.originalEmissive.copy(emissiveColor);
            // Keep the highlight color distinct if it's currently selected
            // Use the global selectedMesh reference for comparison consistency
            if (currentSelectedMesh === getGlobalReferences().selectedMesh) {
                 currentSelectedMesh.material.emissive.setHex(0x555555); // Reapply highlight
            }
        }
    } else {
        // If no mesh is selected, recreate the default robot with the new color
        // Only do this if a custom character isn't currently displayed
        // Check if currentModels is available before accessing customCharacter
         if (currentModels && !currentModels.customCharacter) {
             // Pass the llmToEdit context if available (might be null if creating new)
             const createUI = document.getElementById('create-llm-ui');
             let llmToEdit = null;
             if (createUI && createUI.getAttribute('data-edit-mode') === 'true') {
                const editId = createUI.getAttribute('data-edit-id');
                if(editId) {
                    llmToEdit = llmDataManager.getLLMById(editId);
                }
             }
             createDefaultRobotModel(llmToEdit); // Recreate default robot with current color picker value
         }
    }
}

// Renamed animateHumanoid to animatePreview
let animationFrameId = null;
function animatePreview() {
    if (!previewScene || !previewCamera || !previewRenderer) {
        console.log("Skipping preview animation: scene/camera/renderer missing");
        return;
    }
    animationFrameId = requestAnimationFrame(animatePreview);

    const currentModel = customCharacter || robotModel;
    // Simple idle animation (applied directly in createRobotModel now)
    // if (currentModel) {
    //     const time = Date.now() * 0.001;
    //     currentModel.position.y = (currentModel.userData.baseY || 0) + Math.sin(time) * 0.05;
    //     currentModel.rotation.y = (currentModel.userData.baseRotY || 0) + Math.sin(time * 0.5) * 0.1;
    // }

    if (humanoidMixer) {
        humanoidMixer.update(previewClock.getDelta());
    }

    previewRenderer.render(previewScene, previewCamera);
}

// Renamed humanoidResizeHandler to previewResizeHandler
function previewResizeHandler() {
    const viewport = document.querySelector('.humanoid-viewport');
    if (previewCamera && previewRenderer && viewport) {
        previewCamera.aspect = viewport.clientWidth / viewport.clientHeight;
        previewCamera.updateProjectionMatrix();
        previewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    }
}

// Function to update the preview when a new custom character is generated
// This needs to be called from llmCreationInterface after generation completes
export function displayGeneratedCharacter(generatedCode) {
     if (!previewScene) return;

     // Remove previous custom character
     if (customCharacter && customCharacter.parent) {
         customCharacter.parent.remove(customCharacter);
     }
     // Remove default robot model
      if (robotModel && robotModel.parent) {
         robotModel.parent.remove(robotModel);
     }
     robotModel = null;
     customCharacter = null;
     setModels(null, null); // Clear global refs

    try {
        // Import dynamically if needed
        import('./characterGenerator.js').then(module => {
            customCharacter = module.createCustomCharacter(THREE, generatedCode);
            if (!customCharacter) throw new Error("createCustomCharacter returned null");

            previewScene.add(customCharacter);
            prepareModelForIndividualColoring(customCharacter);
            setModels(null, customCharacter); // Update global refs

             // Adjust position after creation
             const tempBox = new THREE.Box3().setFromObject(customCharacter);
             const lowestPointY = tempBox.min.y;
             customCharacter.position.y = -lowestPointY + 0.01;

            const statusElement = document.getElementById('generation-status');
            if(statusElement) statusElement.textContent = "Character generated successfully!";

        }).catch(error => {
             console.error("Error creating generated character:", error);
             const statusElement = document.getElementById('generation-status');
             if(statusElement) statusElement.textContent = "Error displaying generated character.";
             // Optionally fall back to default robot
             // createDefaultRobotModel();
        });

    } catch (error) {
         console.error("Error displaying generated character:", error);
         const statusElement = document.getElementById('generation-status');
         if(statusElement) statusElement.textContent = "Error displaying generated character.";
    }
}

// Function to reset the preview to the default robot
export function resetPreviewModel() {
    loadInitialModel(); // Call with no llmToEdit to load default
}

// --- Original createRobotModel ---
// (This is the detailed version, ensure it matches the one in the thought process)
export function createRobotModel(targetScene, color, style) {
    // If targetScene is null, create a temporary group to hold the model
    const parent = targetScene || new THREE.Group();

    const materials = createStandardMaterials(color, style);
    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel";

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.name = "Head";
    robotGroup.add(headGroup); // Added to robotGroup

    const headShape = new THREE.Shape();
    const x = -0.2, y = -0.2, width = 0.4, height = 0.4, radius = 0.08;
    headShape.moveTo(x, y + radius).lineTo(x, y + height - radius).quadraticCurveTo(x, y + height, x + radius, y + height).lineTo(x + width - radius, y + height).quadraticCurveTo(x + width, y + height, x + width, y + height - radius).lineTo(x + width, y + radius).quadraticCurveTo(x + width, y, x + width - radius, y).lineTo(x + radius, y).quadraticCurveTo(x, y, x, y + radius);
    const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const headGeometry = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    headGeometry.center();
    const headMain = new THREE.Mesh(headGeometry, materials.headMaterial);
    headMain.name = "Head_Main";
    headGroup.add(headMain);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.08, 0.04, 0.16); leftEye.name = "Head_LeftEye"; headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.08, 0.04, 0.16); rightEye.name = "Head_RightEye"; headGroup.add(rightEye);

    const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05), materials.limbsMaterial);
    antennaBase.position.set(0, 0.22, 0); antennaBase.name = "Head_AntennaBase"; headGroup.add(antennaBase);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15), materials.limbsMaterial);
    antenna.position.set(0, 0.3, 0); antenna.name = "Head_Antenna"; headGroup.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), materials.antennaTipMaterial);
    antennaTip.position.set(0, 0.38, 0); antennaTip.name = "Head_AntennaTip"; headGroup.add(antennaTip);

    // --- Torso ---
    const torsoGroup = new THREE.Group();
    torsoGroup.name = "Torso";
    torsoGroup.position.y = 1.05; robotGroup.add(torsoGroup);

    const torsoShape = new THREE.Shape();
    const tx = -0.25, ty = -0.4, tWidth = 0.5, tHeight = 0.8, tRadius = 0.1;
    torsoShape.moveTo(tx, ty + tRadius).lineTo(tx, ty + tHeight - tRadius).quadraticCurveTo(tx, ty + tHeight, tx + tRadius, ty + tHeight).lineTo(tx + tWidth - tRadius, ty + tHeight).quadraticCurveTo(tx + tWidth, ty + tHeight, tx + tWidth, ty + tHeight - tRadius).lineTo(tx + tWidth, ty + tRadius).quadraticCurveTo(tx + tWidth, ty, tx + tWidth - tRadius, ty).lineTo(tx + tRadius, ty).quadraticCurveTo(tx, ty, tx, ty + tRadius);
    const torsoExtrudeSettings = { depth: 0.25, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const torsoGeometry = new THREE.ExtrudeGeometry(torsoShape, torsoExtrudeSettings);
    torsoGeometry.center();
    const torsoMain = new THREE.Mesh(torsoGeometry, materials.bodyMaterial);
    torsoMain.name = "Body_Torso"; torsoGroup.add(torsoMain);

    const chestLight = new THREE.Mesh(new THREE.CircleGeometry(0.08, 32), materials.chestLightMaterial);
    chestLight.position.set(0, 0.1, 0.13); chestLight.name = "Body_ChestLight"; torsoGroup.add(chestLight);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15), materials.limbsMaterial);
    neck.position.y = torsoGroup.position.y + tHeight / 2 - 0.075;
    neck.name = "Body_Neck"; robotGroup.add(neck);
    headGroup.position.y = neck.position.y + 0.15; // Position head relative to neck

    // Shoulders
    const shoulderOffsetX = 0.35, shoulderOffsetY = torsoGroup.position.y + 0.3;
    const shoulderGeometry = new THREE.SphereGeometry(0.1, 16, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    leftShoulder.position.set(-shoulderOffsetX, shoulderOffsetY, 0); leftShoulder.name = "Body_LeftShoulderJoint"; robotGroup.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    rightShoulder.position.set(shoulderOffsetX, shoulderOffsetY, 0); rightShoulder.name = "Body_RightShoulderJoint"; robotGroup.add(rightShoulder);

    // Arms
    const armSegmentLength = 0.3, armRadius = 0.06;
    const elbowJointGeometry = new THREE.SphereGeometry(0.07, 12, 8);
    const upperArmGeometry = new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armSegmentLength);
    const lowerArmGeometry = new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.8, armSegmentLength);

    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.position.set(leftShoulder.position.x, leftShoulder.position.y - armSegmentLength / 2 - 0.05, 0); leftUpperArm.name = "LeftArm_Upper"; robotGroup.add(leftUpperArm);
    const leftElbow = new THREE.Mesh(elbowJointGeometry, materials.limbsMaterial);
    leftElbow.position.set(leftUpperArm.position.x, leftUpperArm.position.y - armSegmentLength / 2 - 0.035, 0); leftElbow.name = "LeftArm_ElbowJoint"; robotGroup.add(leftElbow);
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(leftElbow.position.x, leftElbow.position.y - armSegmentLength / 2 - 0.035, 0); leftLowerArm.name = "LeftArm_Lower"; robotGroup.add(leftLowerArm);
    const leftHand = createDetailedHand(materials, 'left');
    leftHand.position.set(leftLowerArm.position.x, leftLowerArm.position.y - armSegmentLength / 2 - 0.06, 0); leftHand.name = "LeftArm_HandGroup"; robotGroup.add(leftHand); // Renamed group for clarity

    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.set(rightShoulder.position.x, rightShoulder.position.y - armSegmentLength / 2 - 0.05, 0); rightUpperArm.name = "RightArm_Upper"; robotGroup.add(rightUpperArm);
    const rightElbow = new THREE.Mesh(elbowJointGeometry, materials.limbsMaterial);
    rightElbow.position.set(rightUpperArm.position.x, rightUpperArm.position.y - armSegmentLength / 2 - 0.035, 0); rightElbow.name = "RightArm_ElbowJoint"; robotGroup.add(rightElbow);
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(rightElbow.position.x, rightElbow.position.y - armSegmentLength / 2 - 0.035, 0); rightLowerArm.name = "RightArm_Lower"; robotGroup.add(rightLowerArm);
    const rightHand = createDetailedHand(materials, 'right');
    rightHand.position.set(rightLowerArm.position.x, rightLowerArm.position.y - armSegmentLength / 2 - 0.06, 0); rightHand.name = "RightArm_HandGroup"; robotGroup.add(rightHand); // Renamed group for clarity

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.2), materials.bodyMaterial);
    pelvis.position.y = torsoGroup.position.y - tHeight / 2 - 0.075; pelvis.name = "Body_Pelvis"; robotGroup.add(pelvis);

    // Hips
    const hipOffsetX = 0.12, hipOffsetY = pelvis.position.y - 0.05;
    const hipGeometry = new THREE.SphereGeometry(0.09, 12, 8);
    const leftHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    leftHip.position.set(-hipOffsetX, hipOffsetY, 0); leftHip.name = "Body_LeftHipJoint"; robotGroup.add(leftHip);
    const rightHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    rightHip.position.set(hipOffsetX, hipOffsetY, 0); rightHip.name = "Body_RightHipJoint"; robotGroup.add(rightHip);

    // Legs
    const legSegmentLength = 0.35, legRadius = 0.07;
    const kneeJointGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const upperLegGeometry = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legSegmentLength);
    const lowerLegGeometry = new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.8, legSegmentLength);
    const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.22);

    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.set(leftHip.position.x, leftHip.position.y - legSegmentLength / 2 - 0.045, 0); leftUpperLeg.name = "LeftLeg_Upper"; robotGroup.add(leftUpperLeg);
    const leftKnee = new THREE.Mesh(kneeJointGeometry, materials.limbsMaterial);
    leftKnee.position.set(leftUpperLeg.position.x, leftUpperLeg.position.y - legSegmentLength / 2 - 0.04, 0); leftKnee.name = "LeftLeg_KneeJoint"; robotGroup.add(leftKnee);
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(leftKnee.position.x, leftKnee.position.y - legSegmentLength / 2 - 0.04, 0); leftLowerLeg.name = "LeftLeg_Lower"; robotGroup.add(leftLowerLeg);
    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    leftFoot.position.set(leftLowerLeg.position.x, leftLowerLeg.position.y - legSegmentLength / 2 - 0.04, leftLowerLeg.position.z + 0.05); leftFoot.name = "LeftLeg_Foot"; robotGroup.add(leftFoot);

    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(rightHip.position.x, rightHip.position.y - legSegmentLength / 2 - 0.045, 0); rightUpperLeg.name = "RightLeg_Upper"; robotGroup.add(rightUpperLeg);
    const rightKnee = new THREE.Mesh(kneeJointGeometry, materials.limbsMaterial);
    rightKnee.position.set(rightUpperLeg.position.x, rightUpperLeg.position.y - legSegmentLength / 2 - 0.04, 0); rightKnee.name = "RightLeg_KneeJoint"; robotGroup.add(rightKnee);
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(rightKnee.position.x, rightKnee.position.y - legSegmentLength / 2 - 0.04, 0); rightLowerLeg.name = "RightLeg_Lower"; robotGroup.add(rightLowerLeg);
    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.set(rightLowerLeg.position.x, rightLowerLeg.position.y - legSegmentLength / 2 - 0.04, rightLowerLeg.position.z + 0.05); rightFoot.name = "RightLeg_Foot"; robotGroup.add(rightFoot);

    // Apply shadows
    robotGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true; // Allow meshes to receive shadows
        }
    });

    // Add the fully constructed robot to the parent (scene or temporary group)
    parent.add(robotGroup);

     // --- Adjust final position AFTER adding to parent ---
     // Need to update world matrix before getting bounding box if not added to scene yet
     parent.updateMatrixWorld(true);
     const tempBox = new THREE.Box3().setFromObject(robotGroup);
     const lowestPointY = tempBox.min.y;
     // Adjust the group's position relative to its parent
     robotGroup.position.y = -lowestPointY + 0.01; // Small offset above ground

    // Store base position for animation if needed
    // robotGroup.userData.baseY = robotGroup.position.y;
    // robotGroup.userData.baseRotY = robotGroup.rotation.y;


    return {
        model: robotGroup,
        materials: materials
    };
}

// Helper function to create a more detailed hand
function createDetailedHand(materials, side) {
    const handGroup = new THREE.Group();
    handGroup.name = `HandGroup_${side}`; // Unique name for the group

    // Palm
    const palmGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const palm = new THREE.Mesh(palmGeometry, materials.limbsMaterial);
    palm.name = `${side}Hand_Palm`; // Unique name
    handGroup.add(palm);

    // Fingers (simplified cylinders)
    const fingerGeometry = new THREE.CylinderGeometry(0.015, 0.01, 0.08);
    const fingerMaterial = materials.limbsMaterial; // Can clone if different colors needed

    // Finger positions relative to palm center
    const fingerPositions = [
        { x: -0.03, y: -0.06, scaleY: 1.0 },    // Index
        { x: 0, y: -0.065, scaleY: 1.05 },   // Middle
        { x: 0.03, y: -0.06, scaleY: 1.0 }     // Ring
    ];

    fingerPositions.forEach((pos, i) => {
        const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
        finger.scale.y = pos.scaleY;
        finger.position.set(pos.x, pos.y, 0);
        finger.name = `${side}Hand_Finger${i + 1}`; // Unique name
        handGroup.add(finger);
    });

    return handGroup;
}