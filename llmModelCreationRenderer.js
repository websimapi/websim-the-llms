import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { prepareModelForIndividualColoring, applyColorToMesh } from './llmMeshColorManager.js';
import { updateManipulationDisplays } from './llmMeshManipulator.js';
import { setGlobalReferences, setModels, setSelectedMesh, getGlobalReferences } from './threeJSGlobals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Import OrbitControls
import { llmDataManager } from './llmDataManager.js'; // Needed for loading data
import { createCustomCharacter as createCharacterFromCode } from './characterGenerator.js'; // Import generator

// --- Moved from llmCreationInterface.js ---

// Renamed humanoidScene, etc. to previewScene for clarity
let previewScene, previewCamera, previewRenderer, previewClock;
let robotModel; // Keep track of the default robot model instance (should be the THREE.Group)
let customCharacter = null; // Keep track of the custom character instance
let selectedMesh = null; // Track the currently selected mesh
let humanoidMixer = null; // Animation mixer
let animationFrameId = null; // Store animation frame ID
let previewControls = null; // Variable for OrbitControls

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
    previewControls = null; // Reset controls
    selectedMesh = null;
    if (humanoidMixer) { // Clear previous mixer if exists
        humanoidMixer.stopAllAction();
        humanoidMixer = null;
    }
    if (animationFrameId) { // Check if ID exists before cancelling
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null; // Reset ID
    }

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
    previewCamera.position.set(0, 1.5, 5); // Slightly further back
    previewCamera.lookAt(0, 1, 0);

    // Setup renderer
    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    previewRenderer.shadowMap.enabled = true;
    viewport.appendChild(previewRenderer.domElement);

    // Set global references (important for other modules like profile image capture)
    setGlobalReferences(previewScene, previewCamera, previewRenderer);
    setSelectedMesh(null); // Reset global selected mesh

    // Setup OrbitControls for the preview
    previewControls = new OrbitControls(previewCamera, previewRenderer.domElement);
    previewControls.enableDamping = true;
    previewControls.dampingFactor = 0.1;
    previewControls.screenSpacePanning = false; // Keep panning relative to target
    previewControls.minDistance = 2; // Allow zooming in closer
    previewControls.maxDistance = 10; // Allow zooming out a bit more
    previewControls.maxPolarAngle = Math.PI / 1.5; // Allow slightly higher angle
    previewControls.target.set(0, 1, 0); // Focus on the center of the character

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
    ground.position.y = -0.01; // Place ground slightly below origin y=0
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

// Helper function to adjust model position vertically
function positionModelOnGround(model) {
    if (!model) return;
    // Ensure transformations are applied before calculating bounding box
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const lowestPointY = box.min.y;
    // Adjust model's position so its lowest point is at y=0
    // Add a small epsilon to prevent z-fighting with ground if ground is at y=0
    model.position.y = -lowestPointY + 0.001;
    console.log(`Positioned model ${model.name || model.uuid} on ground. Lowest point: ${lowestPointY}, New Y: ${model.position.y}`);
}

async function loadInitialModel(llmToEdit) {
    // Clear previous models from the scene first
    if (robotModel && robotModel.parent) robotModel.parent.remove(robotModel);
    if (customCharacter && customCharacter.parent) customCharacter.parent.remove(customCharacter);
    robotModel = null;
    customCharacter = null;
    setModels(null, null); // Update global refs
     if (humanoidMixer) { // Clear previous mixer if exists
         humanoidMixer.stopAllAction();
         humanoidMixer = null;
     }

    let modelToPosition = null;
    let modelToAnimate = null;

    if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            // Use the imported function directly
            const tempCustomCharacter = createCharacterFromCode(THREE, llmToEdit.customCharacterCode);
            if (!tempCustomCharacter) throw new Error("createCustomCharacter returned null");

            customCharacter = tempCustomCharacter;
            previewScene.add(customCharacter);
            prepareModelForIndividualColoring(customCharacter);
            setModels(null, customCharacter);
            modelToPosition = customCharacter; // Set the model to be positioned
            modelToAnimate = customCharacter; // Set the model to be animated

            // Apply saved model data if it exists
            if (llmToEdit.modelData) {
                try {
                    const storageModule = await import('./llmModelStorage.js');
                    storageModule.applyStoredModelData(customCharacter, llmToEdit);
                    // Re-prepare after applying stored data
                    prepareModelForIndividualColoring(customCharacter);
                } catch (err) {
                    console.error("Error applying stored model data:", err);
                }
            }

            // Update status
            const statusElement = document.getElementById('generation-status');
            if (statusElement) {
                statusElement.dataset.generatedCode = llmToEdit.customCharacterCode;
                statusElement.textContent = "Custom character loaded.";
            }

        } catch (error) {
            console.error("Error loading custom character:", error);
            // Fallback to default robot model - this now returns the group directly
            robotModel = createDefaultRobotModel(llmToEdit);
            modelToPosition = robotModel;
            modelToAnimate = robotModel;
        }
    } else {
        // Create default robot humanoid model - this now returns the group directly
        robotModel = createDefaultRobotModel(llmToEdit);
        modelToPosition = robotModel;
        modelToAnimate = robotModel;
    }

    // Position the final loaded model on the ground
    positionModelOnGround(modelToPosition);

    // Attempt to setup animation on the final loaded model
    setupModelAnimation(modelToAnimate);
}

// Renamed from createDefaultRobot
export function createDefaultRobotModel(llmToEdit) {
    // Get current selected color or color from edit data
    const color = llmToEdit?.color || document.getElementById('llm-color')?.value || '#3cb371';
    const style = llmToEdit?.style || 'modern';

    // Create the robot model using the imported function
    // Pass the previewScene so it gets added correctly
    const result = createRobotModel(previewScene, color, style);
    const newRobotModel = result.model; // Get the actual THREE.Group

    // Update global references
    setModels(newRobotModel, null);

    // Prepare the model for individual part coloring - pass the model group
    prepareModelForIndividualColoring(newRobotModel);

    // Apply stored model data if editing and model data exists
    if (llmToEdit && llmToEdit.modelData && !llmToEdit.customCharacterCode) {
        import('./llmModelStorage.js').then(module => {
            module.applyStoredModelData(newRobotModel, llmToEdit);
            // Ensure model is prepared for individual coloring after applying stored data
            prepareModelForIndividualColoring(newRobotModel);
            // Re-position after applying stored data
            positionModelOnGround(newRobotModel);
            // Re-setup animation after potential changes from stored data
            setupModelAnimation(newRobotModel);
        }).catch(err => console.error("Error applying stored model data to robot:", err));
    } else {
         // If not editing or no stored data, setup animation immediately
         setupModelAnimation(newRobotModel);
    }

    // Store reference locally in this module as well
    robotModel = newRobotModel;

    return newRobotModel; // Return the created model group
}


// New function to setup animation for ANY model (robot or custom)
function setupModelAnimation(model) {
    if (!model) return;

    // Clear existing mixer
    if (humanoidMixer) {
        humanoidMixer.stopAllAction();
        humanoidMixer = null;
    }

    let animationClip = null;

    // --- Find the walk animation clip ---
    if (model.animations && model.animations.length > 0) {
        // If the model has its own animations (like the default robot)
        animationClip = model.animations.find(clip => clip.name === 'walk');
        if (!animationClip) {
            console.warn(`Model ${model.name} has animations, but 'walk' clip not found. Using first clip.`);
            animationClip = model.animations[0];
        }
    } else if (robotModel && robotModel.animations && robotModel.animations.length > 0) {
        // If it's a custom model, try to use the default robot's animation
        // Make sure robotModel has been created and has animations
        const defaultWalkClip = robotModel.animations.find(clip => clip.name === 'walk');
        if (defaultWalkClip) {
             // Check if the custom model has the required bones/groups for the animation
             const requiredBones = ["LeftHip", "LeftKnee", "RightHip", "RightKnee", "LeftShoulder", "LeftElbow", "RightShoulder", "RightElbow"];
             let hasAllBones = true;
             for (const boneName of requiredBones) {
                 if (!model.getObjectByName(boneName)) {
                     console.warn(`Custom model ${model.name} is missing required animation group: ${boneName}. Animation may not work.`);
                     hasAllBones = false;
                     break; // Stop checking if one is missing
                 }
             }

             if (hasAllBones) {
                 // Clone the animation clip to avoid issues if the default model is modified
                 animationClip = defaultWalkClip.clone();
                 // Store the cloned animation on the custom character model itself
                 if (!model.animations) model.animations = [];
                 model.animations.push(animationClip);
                 console.log(`Applied default walk animation to custom model ${model.name}`);
             } else {
                 console.warn(`Skipping animation for custom model ${model.name} due to missing bones.`);
             }

        } else {
             console.warn("Default robot model or its walk animation not available to apply to custom model.");
        }
    }

    // --- Setup Mixer ---
    if (animationClip) {
        try {
            humanoidMixer = new THREE.AnimationMixer(model);
            const walkAction = humanoidMixer.clipAction(animationClip);
            if (walkAction) {
                walkAction.play();
                console.log(`Playing animation clip '${animationClip.name}' for model ${model.name}`);
            } else {
                console.error(`Could not create action for clip '${animationClip.name}'`);
            }
        } catch (error) {
            console.error("Error setting up animation mixer:", error, "Model:", model, "Clip:", animationClip);
            humanoidMixer = null;
        }
    } else {
        console.warn(`No suitable animation clip found for model ${model.name}.`);
        humanoidMixer = null;
    }
}


// ... (handleMeshSelection remains largely the same) ...
function handleMeshSelection(event) {
    // Clear previous selection highlight visually
    if (selectedMesh && selectedMesh.userData.originalEmissive) {
        if (selectedMesh.material && selectedMesh.material.emissive) {
            // Check if originalEmissive is a Color object before copying
            if (selectedMesh.userData.originalEmissive instanceof THREE.Color) {
                selectedMesh.material.emissive.copy(selectedMesh.userData.originalEmissive);
            } else {
                console.warn("originalEmissive was not a Color object, resetting emissive.");
                selectedMesh.material.emissive.setHex(0x000000); // Reset to black if unsure
            }
        }
        // Remove the property regardless
        // delete selectedMesh.userData.originalEmissive; // Keep originalEmissive for color changes
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
            // Only allow selection of Meshes, not helper groups etc.
            if (child.isMesh && child.visible) meshes.push(child);
        });
    }

    const intersects = raycaster.intersectObjects(meshes);
    const selectedMeshNameEl = document.getElementById('selected-mesh-name');

    if (intersects.length > 0) {
        selectedMesh = intersects[0].object;
        setSelectedMesh(selectedMesh); // Update global state

        // Highlight
        if (selectedMesh.material && selectedMesh.material.emissive) {
            // Store original only if it doesn't exist or isn't the highlight color
            // Make sure to clone the original emissive color
            if (!selectedMesh.userData.originalEmissive) {
                 selectedMesh.userData.originalEmissive = selectedMesh.material.emissive.clone();
            }
            selectedMesh.material.emissive.setHex(0x555555); // Highlight color
        } else if (selectedMesh.material && !selectedMesh.material.emissive) {
            console.warn("Selected mesh material has no emissive property:", selectedMesh.name);
        }

        // Update color picker
        if (selectedMesh.material.color) {
            const colorPicker = document.getElementById('llm-color');
            if (colorPicker) {
                colorPicker.value = '#' + selectedMesh.material.color.getHexString();
            }
        }

        // Update name display
        if (selectedMeshNameEl) {
            const displayName = selectedMesh.name || `Part ${meshes.indexOf(selectedMesh) + 1}`;
            let partType = "";
            let partName = displayName;
            // Extract type only if name follows 'Type_Description_Mesh_Index' format
             const nameParts = displayName.split('_');
             if (nameParts.length >= 2 && nameParts[nameParts.length - 2] === 'Mesh') {
                 partType = nameParts[0];
                 partName = nameParts.slice(1, -2).join(' '); // Join description parts if any
             }

            selectedMeshNameEl.innerHTML = partType ? `${partName} <span class="part-type">${partType}</span>` : displayName;
            selectedMeshNameEl.classList.remove('hidden');
        }

        updateManipulationDisplays(); // Show controls and update values
    } else {
        // Clicked elsewhere - Deselect
        // Restore emissive only if a mesh *was* selected before
        const previouslySelected = getGlobalReferences().selectedMesh;
        if (previouslySelected && previouslySelected.userData.originalEmissive) {
             if (previouslySelected.material && previouslySelected.material.emissive) {
                  if (previouslySelected.userData.originalEmissive instanceof THREE.Color) {
                      previouslySelected.material.emissive.copy(previouslySelected.userData.originalEmissive);
                  } else {
                      previouslySelected.material.emissive.setHex(0x000000);
                  }
             }
        }
        // Clear selection state
        selectedMesh = null;
        setSelectedMesh(null);

        if (selectedMeshNameEl) selectedMeshNameEl.classList.add('hidden');
        const manipulationControls = document.querySelector('.manipulation-controls');
        const noSelectionMessage = document.querySelector('.no-selection-message');
        if (manipulationControls) manipulationControls.style.display = 'none';
        if (noSelectionMessage) noSelectionMessage.style.display = 'block';
    }
}


// ... (updateSelectedMeshColor remains largely the same) ...
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
            // Ensure originalEmissive is a Color object before copying
            if (currentSelectedMesh.userData.originalEmissive instanceof THREE.Color) {
                currentSelectedMesh.userData.originalEmissive.copy(emissiveColor);
            } else {
                console.warn("Cannot copy to originalEmissive, it's not a Color object.");
                // Attempt to re-initialize it
                currentSelectedMesh.userData.originalEmissive = emissiveColor.clone();
            }
            // Keep the highlight color distinct if it's currently selected
            const globallySelectedMesh = getGlobalReferences().selectedMesh;
            if (currentSelectedMesh === globallySelectedMesh) {
                currentSelectedMesh.material.emissive.setHex(0x555555); // Reapply highlight
            }
        }
    } else {
        // If no mesh is selected, recreate the default robot with the new color
        // Only do this if a custom character isn't currently displayed
        if (currentModels && !currentModels.customCharacter) {
            // Pass the llmToEdit context if available
            const createUI = document.getElementById('create-llm-ui');
            let llmToEdit = null;
            if (createUI && createUI.getAttribute('data-edit-mode') === 'true') {
                const editId = createUI.getAttribute('data-edit-id');
                if (editId) {
                    llmToEdit = llmDataManager.getLLMById(editId);
                }
            }
            // Recreate default robot with current color picker value
            // This now returns the model group directly
            const newRobot = createDefaultRobotModel(llmToEdit);
            // Remove the old one if it still exists (precaution)
            if (robotModel && robotModel.parent) {
                robotModel.parent.remove(robotModel);
            }
            robotModel = newRobot; // Update the module-level reference
            positionModelOnGround(newRobot);
            // Animation is handled within createDefaultRobotModel
        }
    }
}


// Renamed animateHumanoid to animatePreview
// let animationFrameId = null; // Already declared globally
function animatePreview() {
    if (!previewScene || !previewCamera || !previewRenderer) {
        // console.log("Skipping preview animation: scene/camera/renderer missing");
        // Still request next frame to potentially recover if scene becomes available
        animationFrameId = requestAnimationFrame(animatePreview);
        return;
    }
    animationFrameId = requestAnimationFrame(animatePreview);

    const delta = previewClock ? previewClock.getDelta() : 0.016; // Get time delta or use default

    // Update the animation mixer if it exists
    if (humanoidMixer) {
        try {
            humanoidMixer.update(delta);
        } catch (error) {
            console.error("Error updating animation mixer:", error);
            // Potentially stop the mixer or try to recover
            humanoidMixer = null; // Stop trying if it errors consistently
        }
    }

    // Update OrbitControls if they exist
    if (previewControls) {
        previewControls.update();
    }

    previewRenderer.render(previewScene, previewCamera);
}

// ... (previewResizeHandler remains the same) ...
function previewResizeHandler() {
    const viewport = document.querySelector('.humanoid-viewport');
    if (previewCamera && previewRenderer && viewport) {
        // Ensure viewport has non-zero dimensions before updating
        if (viewport.clientWidth > 0 && viewport.clientHeight > 0) {
            previewCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            previewCamera.updateProjectionMatrix();
            previewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    }
}

// Function to update the preview when a new custom character is generated
export async function displayGeneratedCharacter(generatedCode) {
    if (!previewScene) return;

    // Stop and remove previous animation mixer
    if (humanoidMixer) {
        humanoidMixer.stopAllAction();
        humanoidMixer = null;
    }

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
        // Use imported function
        const newCustomCharacter = createCharacterFromCode(THREE, generatedCode);
        if (!newCustomCharacter) throw new Error("createCustomCharacter returned null");

        customCharacter = newCustomCharacter; // Assign to module-level scope
        previewScene.add(customCharacter);
        prepareModelForIndividualColoring(customCharacter);
        setModels(null, customCharacter); // Update global refs

        // Position the newly created character on the ground
        positionModelOnGround(customCharacter);

        const statusElement = document.getElementById('generation-status');
        if (statusElement) statusElement.textContent = "Character generated successfully!";

        // Attempt to setup animation for the new custom character
        setupModelAnimation(customCharacter);


    } catch (error) {
        console.error("Error displaying generated character:", error);
        const statusElement = document.getElementById('generation-status');
        if (statusElement) statusElement.textContent = "Error displaying generated character.";

         // Fallback to default robot if custom display fails
         console.log("Falling back to default robot model after generation display error.");
         // This now returns the model group directly
         robotModel = createDefaultRobotModel(); // Create default robot
         positionModelOnGround(robotModel);
         setupModelAnimation(robotModel); // Animate the fallback
    }
}

// Function to reset the preview to the default robot
export function resetPreviewModel() {
    // Stop and remove previous animation mixer
    if (humanoidMixer) {
        humanoidMixer.stopAllAction();
        humanoidMixer = null;
    }
    // Load default model (pass null for llmToEdit)
    loadInitialModel(null);
}

// --- Create Robot Model with Hierarchy and Animation ---
export function createRobotModel(targetScene, color, style) {
    const parent = targetScene || new THREE.Group();
    const materials = createStandardMaterials(color, style);
    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel";
    parent.add(robotGroup); // Add to parent immediately

    // Constants
    const armSegmentLength = 0.3, armRadius = 0.06;
    const legSegmentLength = 0.35, legRadius = 0.07;
    const headHeight = 0.4;
    const torsoHeight = 0.8;
    const neckHeight = 0.15;
    const pelvisHeight = 0.15;

    // --- Body Hierarchy ---
    const pelvis = new THREE.Group(); pelvis.name = "Body_Pelvis"; robotGroup.add(pelvis);
    const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, pelvisHeight, 0.2), materials.bodyMaterial);
    pelvisMesh.name = "Body_Pelvis_Mesh_0"; pelvis.add(pelvisMesh);


    const torsoGroup = new THREE.Group(); torsoGroup.name = "TorsoGroup"; torsoGroup.position.y = pelvisHeight / 2 + torsoHeight / 2; pelvis.add(torsoGroup); // Torso attached to pelvis
    const torsoShape = new THREE.Shape();
    const tx = -0.25, ty = -torsoHeight / 2, tWidth = 0.5, tRadius = 0.1;
    torsoShape.moveTo(tx, ty + tRadius).lineTo(tx, ty + torsoHeight - tRadius).quadraticCurveTo(tx, ty + torsoHeight, tx + tRadius, ty + torsoHeight).lineTo(tx + tWidth - tRadius, ty + torsoHeight).quadraticCurveTo(tx + tWidth, ty + torsoHeight, tx + tWidth, ty + torsoHeight - tRadius).lineTo(tx + tWidth, ty + tRadius).quadraticCurveTo(tx + tWidth, ty, tx + tWidth - tRadius, ty).lineTo(tx + tRadius, ty).quadraticCurveTo(tx, ty, tx, ty + tRadius);
    const torsoExtrudeSettings = { depth: 0.25, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const torsoGeometry = new THREE.ExtrudeGeometry(torsoShape, torsoExtrudeSettings);
    torsoGeometry.center(); // Center geometry locally
    const torsoMain = new THREE.Mesh(torsoGeometry, materials.bodyMaterial);
    torsoMain.name = "Body_Torso_Mesh_0"; torsoGroup.add(torsoMain);

    const chestLight = new THREE.Mesh(new THREE.CircleGeometry(0.08, 32), materials.chestLightMaterial);
    chestLight.position.set(0, 0.1, 0.13); chestLight.name = "Body_ChestLight_Mesh_0"; torsoGroup.add(chestLight);

    const neck = new THREE.Group(); neck.name = "Body_Neck"; neck.position.y = torsoHeight / 2 + neckHeight / 2; torsoGroup.add(neck);
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, neckHeight), materials.limbsMaterial);
    neckMesh.name = "Body_Neck_Mesh_0"; neck.add(neckMesh);

    const headGroup = new THREE.Group(); headGroup.name = "HeadGroup"; headGroup.position.y = neckHeight / 2 + headHeight / 2; neck.add(headGroup);
    const headShape = new THREE.Shape();
    const hx = -0.2, hy = -headHeight / 2, hWidth = 0.4, hRadius = 0.08;
    headShape.moveTo(hx, hy + hRadius).lineTo(hx, hy + headHeight - hRadius).quadraticCurveTo(hx, hy + headHeight, hx + hRadius, hy + headHeight).lineTo(hx + hWidth - hRadius, hy + headHeight).quadraticCurveTo(hx + hWidth, hy + headHeight, hx + hWidth, hy + headHeight - hRadius).lineTo(hx + hWidth, hy + hRadius).quadraticCurveTo(hx + hWidth, hy, hx + hWidth - hRadius, hy).lineTo(hx + hRadius, hy).quadraticCurveTo(hx, hy, hx, hy + hRadius);
    const headExtrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const headGeometry = new THREE.ExtrudeGeometry(headShape, headExtrudeSettings);
    headGeometry.center(); // Center geometry locally
    const headMain = new THREE.Mesh(headGeometry, materials.headMaterial);
    headMain.name = "Head_Main_Mesh_0"; headGroup.add(headMain);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.08, 0.04, 0.16); leftEye.name = "Head_LeftEye_Mesh_0"; headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.08, 0.04, 0.16); rightEye.name = "Head_RightEye_Mesh_0"; headGroup.add(rightEye);

    const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05), materials.limbsMaterial);
    antennaBase.position.set(0, headHeight / 2 + 0.025, 0); antennaBase.name = "Head_AntennaBase_Mesh_0"; headGroup.add(antennaBase);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15), materials.limbsMaterial);
    antenna.position.set(0, antennaBase.position.y + 0.025 + 0.075, 0); antenna.name = "Head_Antenna_Mesh_0"; headGroup.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), materials.antennaTipMaterial);
    antennaTip.position.set(0, antenna.position.y + 0.075 + 0.01, 0); antennaTip.name = "Head_AntennaTip_Mesh_0"; headGroup.add(antennaTip);

    // --- Limb Hierarchy & Joints ---
    const shoulderOffsetY = torsoHeight / 2 - 0.1; // Relative to torso center
    const hipOffsetY = -pelvisHeight / 2;          // Relative to pelvis center

    // --- Left Arm ---
    const leftShoulderGroup = new THREE.Group(); leftShoulderGroup.name = "LeftShoulder"; leftShoulderGroup.position.set(-0.35, shoulderOffsetY, 0); torsoGroup.add(leftShoulderGroup);
    const leftShoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), materials.limbsMaterial); leftShoulderJoint.name = "Body_LeftShoulderJoint_Mesh_0"; leftShoulderGroup.add(leftShoulderJoint);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armSegmentLength), materials.limbsMaterial); leftUpperArm.name = "LeftArm_Upper_Mesh_0"; leftUpperArm.position.y = -armSegmentLength / 2 - 0.05; leftShoulderGroup.add(leftUpperArm);

    const leftElbowGroup = new THREE.Group(); leftElbowGroup.name = "LeftElbow"; leftElbowGroup.position.y = -armSegmentLength / 2 - 0.035; leftUpperArm.add(leftElbowGroup); // Elbow attached to Upper Arm
    const leftElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), materials.limbsMaterial); leftElbowJoint.name = "LeftArm_ElbowJoint_Mesh_0"; leftElbowGroup.add(leftElbowJoint);

    const leftLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.8, armSegmentLength), materials.limbsMaterial); leftLowerArm.name = "LeftArm_Lower_Mesh_0"; leftLowerArm.position.y = -armSegmentLength / 2 - 0.035; leftElbowGroup.add(leftLowerArm);

    const leftHandGroup = createDetailedHand(materials, 'Left'); leftHandGroup.name = "LeftArm_HandGroup"; leftHandGroup.position.y = -armSegmentLength / 2 - 0.06; leftLowerArm.add(leftHandGroup); // Hand attached to Lower Arm

    // --- Right Arm (Similar structure) ---
    const rightShoulderGroup = new THREE.Group(); rightShoulderGroup.name = "RightShoulder"; rightShoulderGroup.position.set(0.35, shoulderOffsetY, 0); torsoGroup.add(rightShoulderGroup);
    const rightShoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), materials.limbsMaterial); rightShoulderJoint.name = "Body_RightShoulderJoint_Mesh_0"; rightShoulderGroup.add(rightShoulderJoint);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armSegmentLength), materials.limbsMaterial); rightUpperArm.name = "RightArm_Upper_Mesh_0"; rightUpperArm.position.y = -armSegmentLength / 2 - 0.05; rightShoulderGroup.add(rightUpperArm);

    const rightElbowGroup = new THREE.Group(); rightElbowGroup.name = "RightElbow"; rightElbowGroup.position.y = -armSegmentLength / 2 - 0.035; rightUpperArm.add(rightElbowGroup); // Elbow attached to Upper Arm
    const rightElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), materials.limbsMaterial); rightElbowJoint.name = "RightArm_ElbowJoint_Mesh_0"; rightElbowGroup.add(rightElbowJoint);

    const rightLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.8, armSegmentLength), materials.limbsMaterial); rightLowerArm.name = "RightArm_Lower_Mesh_0"; rightLowerArm.position.y = -armSegmentLength / 2 - 0.035; rightElbowGroup.add(rightLowerArm);

    const rightHandGroup = createDetailedHand(materials, 'Right'); rightHandGroup.name = "RightArm_HandGroup"; rightHandGroup.position.y = -armSegmentLength / 2 - 0.06; rightLowerArm.add(rightHandGroup); // Hand attached to Lower Arm

    // --- Left Leg ---
    const leftHipGroup = new THREE.Group(); leftHipGroup.name = "LeftHip"; leftHipGroup.position.set(-0.12, hipOffsetY, 0); pelvis.add(leftHipGroup);
    const leftHipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), materials.limbsMaterial); leftHipJoint.name = "Body_LeftHipJoint_Mesh_0"; leftHipGroup.add(leftHipJoint);

    const leftUpperLeg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legSegmentLength), materials.limbsMaterial); leftUpperLeg.name = "LeftLeg_Upper_Mesh_0"; leftUpperLeg.position.y = -legSegmentLength / 2 - 0.045; leftHipGroup.add(leftUpperLeg);

    const leftKneeGroup = new THREE.Group(); leftKneeGroup.name = "LeftKnee"; leftKneeGroup.position.y = -legSegmentLength / 2 - 0.04; leftUpperLeg.add(leftKneeGroup); // Knee attached to Upper Leg
    const leftKneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), materials.limbsMaterial); leftKneeJoint.name = "LeftLeg_KneeJoint_Mesh_0"; leftKneeGroup.add(leftKneeJoint);

    const leftLowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.8, legSegmentLength), materials.limbsMaterial); leftLowerLeg.name = "LeftLeg_Lower_Mesh_0"; leftLowerLeg.position.y = -legSegmentLength / 2 - 0.04; leftKneeGroup.add(leftLowerLeg);

    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.22), materials.limbsMaterial); leftFoot.name = "LeftLeg_Foot_Mesh_0"; leftFoot.position.y = -legSegmentLength / 2 - 0.04; leftFoot.position.z = 0.05; leftLowerLeg.add(leftFoot); // Foot attached to Lower Leg

    // --- Right Leg (Similar structure) ---
    const rightHipGroup = new THREE.Group(); rightHipGroup.name = "RightHip"; rightHipGroup.position.set(0.12, hipOffsetY, 0); pelvis.add(rightHipGroup);
    const rightHipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), materials.limbsMaterial); rightHipJoint.name = "Body_RightHipJoint_Mesh_0"; rightHipGroup.add(rightHipJoint);

    const rightUpperLeg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legSegmentLength), materials.limbsMaterial); rightUpperLeg.name = "RightLeg_Upper_Mesh_0"; rightUpperLeg.position.y = -legSegmentLength / 2 - 0.045; rightHipGroup.add(rightUpperLeg);

    const rightKneeGroup = new THREE.Group(); rightKneeGroup.name = "RightKnee"; rightKneeGroup.position.y = -legSegmentLength / 2 - 0.04; rightUpperLeg.add(rightKneeGroup); // Knee attached to Upper Leg
    const rightKneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), materials.limbsMaterial); rightKneeJoint.name = "RightLeg_KneeJoint_Mesh_0"; rightKneeGroup.add(rightKneeJoint);

    const rightLowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.8, legSegmentLength), materials.limbsMaterial); rightLowerLeg.name = "RightLeg_Lower_Mesh_0"; rightLowerLeg.position.y = -legSegmentLength / 2 - 0.04; rightKneeGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.22), materials.limbsMaterial); rightFoot.name = "RightLeg_Foot_Mesh_0"; rightFoot.position.y = -legSegmentLength / 2 - 0.04; rightFoot.position.z = 0.05; rightLowerLeg.add(rightFoot); // Foot attached to Lower Leg


    // --- Shadows ---
    robotGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // --- Animation Definition ---
    const walkCycleTime = 1.0; // Duration of one walk cycle in seconds
    const halfCycle = walkCycleTime / 2;
    const quarterCycle = walkCycleTime / 4;

    const hipSwing = Math.PI / 8; // Radians
    const kneeBend = Math.PI / 4;
    const shoulderSwing = Math.PI / 6;
    const elbowBend = Math.PI / 8;

    const times = [0, quarterCycle, halfCycle, halfCycle + quarterCycle, walkCycleTime];

    // Use EXACT names of the animation groups
    const leftHipRotateX = new THREE.KeyframeTrack('LeftHip.rotation[x]', times, [-hipSwing, 0, hipSwing, 0, -hipSwing]);
    const leftKneeRotateX = new THREE.KeyframeTrack('LeftKnee.rotation[x]', times, [kneeBend, 0, 0, 0, kneeBend]);
    const rightHipRotateX = new THREE.KeyframeTrack('RightHip.rotation[x]', times, [hipSwing, 0, -hipSwing, 0, hipSwing]);
    const rightKneeRotateX = new THREE.KeyframeTrack('RightKnee.rotation[x]', times, [0, 0, kneeBend, 0, 0]);
    const leftShoulderRotateX = new THREE.KeyframeTrack('LeftShoulder.rotation[x]', times, [shoulderSwing, 0, -shoulderSwing, 0, shoulderSwing]);
    const leftElbowRotateX = new THREE.KeyframeTrack('LeftElbow.rotation[x]', times, [elbowBend, elbowBend / 2, 0, elbowBend / 2, elbowBend]);
    const rightShoulderRotateX = new THREE.KeyframeTrack('RightShoulder.rotation[x]', times, [-shoulderSwing, 0, shoulderSwing, 0, -shoulderSwing]);
    const rightElbowRotateX = new THREE.KeyframeTrack('RightElbow.rotation[x]', times, [0, elbowBend / 2, elbowBend, elbowBend / 2, 0]);


    // Create the Animation Clip
    const walkAnimationClip = new THREE.AnimationClip(
        'walk', // Animation name
        walkCycleTime, // Duration
        [
            leftHipRotateX, leftKneeRotateX,
            rightHipRotateX, rightKneeRotateX,
            leftShoulderRotateX, leftElbowRotateX,
            rightShoulderRotateX, rightElbowRotateX
        ]
    );

    // Attach animation clip to the model
    robotGroup.animations = [walkAnimationClip];

    return {
        model: robotGroup,
        materials: materials
    };
}

// Helper function to create a more detailed hand
function createDetailedHand(materials, side) {
    const handGroup = new THREE.Group();
    // handGroup.name = `HandGroup_${side}`; // Name assigned in calling function

    // Palm
    const palmGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const palm = new THREE.Mesh(palmGeometry, materials.limbsMaterial);
    palm.name = `${side}Hand_Palm_Mesh_0`; // Unique name
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
        finger.name = `${side}Hand_Finger${i + 1}_Mesh_0`; // Unique name
        handGroup.add(finger);
    });

    return handGroup;
}