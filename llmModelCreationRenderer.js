// Renderer for the LLM creation preview
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // If using GLTF
import { createStandardMaterials, serializeModelData } from './llmCharacterRendererUtils.js';
import { prepareModelForIndividualColoring, applyColorToMesh } from './llmMeshColorManager.js';
import { getSelectedMesh, setGlobalReferences, setSelectedMesh, getModels, setModels } from './threeJSGlobals.js';
import { updateManipulationDisplays } from './llmMeshManipulator.js';
import { applyStoredModelData } from './llmModelStorage.js';
import { createCustomCharacter } from './characterGenerator.js'; // Needed for reset/generation

// Scene variables specific to the preview
let previewScene, previewCamera, previewRenderer, previewControls;
let robotModel, customCharacter; // Keep track of the models
let previewAnimationId;
let selectedMeshOutline; // For highlighting selected mesh

// Animation variables
let mixer;
let clock = new THREE.Clock();
let walkAction; // To store the walk animation action

/**
 * Initializes the 3D preview viewport in the LLM creation UI.
 * @param {object|null} llmToEdit - Optional LLM data if editing.
 */
export function initHumanoidPreview(llmToEdit = null) {
    const viewport = document.querySelector('.humanoid-viewport');
    if (!viewport) return;

    // Cleanup previous instance if exists
    if (previewAnimationId) {
        cancelAnimationFrame(previewAnimationId);
    }
    viewport.innerHTML = ''; // Clear previous renderer

    // Setup scene
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x1a1a1a);

    // Setup camera
    previewCamera = new THREE.PerspectiveCamera(50, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
    previewCamera.position.set(0, 1.5, 5); // Zoomed out from 4 to 5
    previewCamera.lookAt(0, 1, 0);

    // Setup renderer
    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    previewRenderer.setPixelRatio(window.devicePixelRatio);
    previewRenderer.shadowMap.enabled = true;
    previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    viewport.appendChild(previewRenderer.domElement);

    // Setup controls
    previewControls = new OrbitControls(previewCamera, previewRenderer.domElement);
    previewControls.target.set(0, 1, 0);
    previewControls.enableDamping = true;
    previewControls.dampingFactor = 0.1;
    previewControls.minDistance = 1;
    previewControls.maxDistance = 10;
    previewControls.maxPolarAngle = Math.PI / 1.8;
    previewControls.update();

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    previewScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(3, 5, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    previewScene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-3, 3, -3);
    previewScene.add(pointLight);

    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    previewScene.add(ground);

    // Set global references for other modules (like profile image capture)
    setGlobalReferences(previewScene, previewCamera, previewRenderer);

    // Load initial model
    loadInitialModel(llmToEdit);

    // Add selection outline effect
    createSelectionOutline();

    // Setup raycasting for mesh selection
    viewport.addEventListener('click', onViewportClick);

    // Start animation loop
    animatePreview();

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (previewCamera && previewRenderer) {
                previewCamera.aspect = width / height;
                previewCamera.updateProjectionMatrix();
                previewRenderer.setSize(width, height);
            }
        }
    });
    resizeObserver.observe(viewport);
}

/**
 * Loads the initial model (either from llmToEdit or default).
 * @param {object|null} llmToEdit - Optional LLM data if editing.
 */
function loadInitialModel(llmToEdit) {
    // Clear existing models first
    if (robotModel) previewScene.remove(robotModel);
    if (customCharacter) previewScene.remove(customCharacter);
    robotModel = null;
    customCharacter = null;
    mixer = null; // Reset mixer
    walkAction = null; // Reset walk action

    if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            customCharacter = createCustomCharacter(THREE, llmToEdit.customCharacterCode);
            prepareModelForIndividualColoring(customCharacter); // Prepare for coloring/selection
            if (llmToEdit.modelData) {
                applyStoredModelData(customCharacter, llmToEdit); // Apply transforms/colors AFTER preparation
            }
            previewScene.add(customCharacter);
            setModels(null, customCharacter);
            setupSimpleIdleAnimation(customCharacter); // Use simple animation for custom models for now
        } catch (error) {
            console.error("Error loading custom character for editing:", error);
            // Fallback to default robot model
            createAndAddDefaultRobot(llmToEdit);
        }
    } else {
        // Create default robot model if new or no custom code
        createAndAddDefaultRobot(llmToEdit);
    }
}

/**
 * Creates and adds the default robot model to the scene.
 * Also sets up its walking animation.
 * @param {object|null} llmToEdit - Optional LLM data if editing.
 */
function createAndAddDefaultRobot(llmToEdit) {
    const color = llmToEdit ? llmToEdit.color : '#3cb371';
    const style = llmToEdit ? llmToEdit.style : 'modern';

    // Create the detailed robot model
    const robotData = createRobotModel(previewScene, color, style); // Pass scene to add model directly
    robotModel = robotData.model; // Store reference

    prepareModelForIndividualColoring(robotModel); // Prepare for coloring/selection

    // Apply stored data if editing
    if (llmToEdit && llmToEdit.modelData) {
        applyStoredModelData(robotModel, llmToEdit); // Apply AFTER preparation
    }

    setModels(robotModel, null);

    // Setup Animation Mixer
    if (robotModel.animations && robotModel.animations.length > 0) {
        mixer = new THREE.AnimationMixer(robotModel);
        // Find the 'walk' animation clip
        const walkClip = THREE.AnimationClip.findByName(robotModel.animations, 'walk');
        if (walkClip) {
            walkAction = mixer.clipAction(walkClip);
            walkAction.play(); // Start the walk animation
        } else {
            console.warn("Walk animation clip not found in the robot model.");
            setupSimpleIdleAnimation(robotModel); // Fallback to simple idle if walk not found
        }
    } else {
        console.warn("No animations found in the robot model.");
        setupSimpleIdleAnimation(robotModel); // Fallback if no animations array
    }
}

/**
 * Creates the detailed robot model with a basic rig and walk animation.
 * @param {THREE.Scene} targetScene - The scene to add the robot to (optional, defaults to new Group)
 * @param {string} color - The base color for the robot.
 * @param {string} style - The style of the robot ('modern', 'classic', etc.).
 * @returns {{model: THREE.Group, materials: object, animations: Array<THREE.AnimationClip>}} - The robot model group, materials, and animations.
 */
export function createRobotModel(targetScene = null, color = '#3cb371', style = 'modern') {
    const group = new THREE.Group();
    group.name = "RobotModel";

    const materials = createStandardMaterials(color, style);

    // --- Rig Bones ---
    const spineBase = new THREE.Bone();
    spineBase.position.y = 0.8; // Pelvis height
    group.add(spineBase);

    const spineMid = new THREE.Bone();
    spineMid.position.y = 0.4; // Mid-torso relative to base
    spineBase.add(spineMid);

    const spineTop = new THREE.Bone();
    spineTop.position.y = 0.4; // Neck base relative to mid
    spineMid.add(spineTop);

    const neck = new THREE.Bone();
    neck.position.y = 0.1; // Neck relative to spine top
    spineTop.add(neck);

    const headBone = new THREE.Bone();
    headBone.position.y = 0.2; // Head relative to neck
    neck.add(headBone);

    // Left Leg
    const leftHip = new THREE.Bone();
    leftHip.position.x = 0.2;
    spineBase.add(leftHip);
    const leftKnee = new THREE.Bone();
    leftKnee.position.y = -0.4;
    leftHip.add(leftKnee);
    const leftAnkle = new THREE.Bone();
    leftAnkle.position.y = -0.4;
    leftKnee.add(leftAnkle);
    const leftFoot = new THREE.Bone();
    leftFoot.position.z = 0.1;
    leftAnkle.add(leftFoot);

    // Right Leg
    const rightHip = new THREE.Bone();
    rightHip.position.x = -0.2;
    spineBase.add(rightHip);
    const rightKnee = new THREE.Bone();
    rightKnee.position.y = -0.4;
    rightHip.add(rightKnee);
    const rightAnkle = new THREE.Bone();
    rightAnkle.position.y = -0.4;
    rightKnee.add(rightAnkle);
    const rightFoot = new THREE.Bone();
    rightFoot.position.z = 0.1;
    rightAnkle.add(rightFoot);

    // Left Arm
    const leftShoulder = new THREE.Bone();
    leftShoulder.position.set(0.4, -0.1, 0); // Adjusted position further out
    spineTop.add(leftShoulder);
    const leftElbow = new THREE.Bone();
    leftElbow.position.y = -0.35; // Upper arm length
    leftShoulder.add(leftElbow);
    const leftWrist = new THREE.Bone();
    leftWrist.position.y = -0.35; // Forearm length
    leftElbow.add(leftWrist);

    // Right Arm
    const rightShoulder = new THREE.Bone();
    rightShoulder.position.set(-0.4, -0.1, 0); // Adjusted position further out
    spineTop.add(rightShoulder);
    const rightElbow = new THREE.Bone();
    rightElbow.position.y = -0.35;
    rightShoulder.add(rightElbow);
    const rightWrist = new THREE.Bone();
    rightWrist.position.y = -0.35;
    rightElbow.add(rightWrist);

    // --- Meshes ---
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const body = new THREE.SkinnedMesh(bodyGeometry, materials.bodyMaterial);
    body.name = "Body_Torso";
    body.castShadow = true;

    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.SkinnedMesh(headGeometry, materials.headMaterial);
    head.name = "Head_Main";
    head.castShadow = true;

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.name = "Head_LeftEye";
    leftEye.position.set(0.1, 0.1, 0.21);
    head.add(leftEye); // Add directly to head mesh initially

    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.name = "Head_RightEye";
    rightEye.position.set(-0.1, 0.1, 0.21);
    head.add(rightEye); // Add directly to head mesh initially

    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.4, 16);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.4, 16);
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);

    const leftUpperLeg = new THREE.SkinnedMesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.name = "LeftLeg_Upper";
    leftUpperLeg.castShadow = true;
    const leftLowerLeg = new THREE.SkinnedMesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.name = "LeftLeg_Lower";
    leftLowerLeg.castShadow = true;
    const leftFootMesh = new THREE.SkinnedMesh(footGeometry, materials.limbsMaterial);
    leftFootMesh.name = "LeftLeg_Foot";
    leftFootMesh.castShadow = true;

    const rightUpperLeg = new THREE.SkinnedMesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.name = "RightLeg_Upper";
    rightUpperLeg.castShadow = true;
    const rightLowerLeg = new THREE.SkinnedMesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.name = "RightLeg_Lower";
    rightLowerLeg.castShadow = true;
    const rightFootMesh = new THREE.SkinnedMesh(footGeometry, materials.limbsMaterial);
    rightFootMesh.name = "RightLeg_Foot";
    rightFootMesh.castShadow = true;

    // Arms
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12);
    const forearmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 12);
    const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1); // Simple hand shape

    const leftUpperArm = new THREE.SkinnedMesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.name = "LeftArm_Upper";
    leftUpperArm.castShadow = true;
    const leftForearm = new THREE.SkinnedMesh(forearmGeometry, materials.limbsMaterial);
    leftForearm.name = "LeftArm_Lower";
    leftForearm.castShadow = true;
    const leftHand = new THREE.SkinnedMesh(handGeometry, materials.limbsMaterial);
    leftHand.name = "LeftArm_Hand";
    leftHand.castShadow = true;

    const rightUpperArm = new THREE.SkinnedMesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.name = "RightArm_Upper";
    rightUpperArm.castShadow = true;
    const rightForearm = new THREE.SkinnedMesh(forearmGeometry, materials.limbsMaterial);
    rightForearm.name = "RightArm_Lower";
    rightForearm.castShadow = true;
    const rightHand = new THREE.SkinnedMesh(handGeometry, materials.limbsMaterial);
    rightHand.name = "RightArm_Hand";
    rightHand.castShadow = true;

    // --- Skeleton and Binding ---
    const skeleton = new THREE.Skeleton([
        spineBase, spineMid, spineTop, neck, headBone,
        leftHip, leftKnee, leftAnkle, leftFoot,
        rightHip, rightKnee, rightAnkle, rightFoot,
        leftShoulder, leftElbow, leftWrist,
        rightShoulder, rightElbow, rightWrist
    ]);

    // Bind meshes to skeleton
    body.add(spineBase); // Attach skeleton root to body
    body.bind(skeleton);

    head.bind(skeleton);
    leftUpperLeg.bind(skeleton);
    leftLowerLeg.bind(skeleton);
    leftFootMesh.bind(skeleton);
    rightUpperLeg.bind(skeleton);
    rightLowerLeg.bind(skeleton);
    rightFootMesh.bind(skeleton);
    leftUpperArm.bind(skeleton);
    leftForearm.bind(skeleton);
    leftHand.bind(skeleton);
    rightUpperArm.bind(skeleton);
    rightForearm.bind(skeleton);
    rightHand.bind(skeleton);

    // Add meshes to the main group
    group.add(body);
    group.add(head);
    group.add(leftUpperLeg, leftLowerLeg, leftFootMesh);
    group.add(rightUpperLeg, rightLowerLeg, rightFootMesh);
    group.add(leftUpperArm, leftForearm, leftHand);
    group.add(rightUpperArm, rightForearm, rightHand);

    // --- Animation ---
    const walkAnimation = createWalkAnimation(skeleton.bones);
    group.animations = [walkAnimation]; // Store animation data with the model

    // Position meshes correctly relative to bones AFTER binding
    head.position.copy(headBone.position);
    head.position.y += 0.1; // Adjust head position slightly

    leftUpperLeg.position.copy(leftHip.position);
    leftUpperLeg.position.y -= 0.2; // Offset to center on bone
    leftLowerLeg.position.copy(leftKnee.position);
    leftLowerLeg.position.y -= 0.2;
    leftFootMesh.position.copy(leftAnkle.position);
    leftFootMesh.position.z += 0.05; // Offset foot

    rightUpperLeg.position.copy(rightHip.position);
    rightUpperLeg.position.y -= 0.2;
    rightLowerLeg.position.copy(rightKnee.position);
    rightLowerLeg.position.y -= 0.2;
    rightFootMesh.position.copy(rightAnkle.position);
    rightFootMesh.position.z += 0.05;

    leftUpperArm.position.copy(leftShoulder.position);
    leftUpperArm.position.y -= 0.175; // Offset arm
    leftForearm.position.copy(leftElbow.position);
    leftForearm.position.y -= 0.175;
    leftHand.position.copy(leftWrist.position);
    leftHand.position.y -= 0.075; // Offset hand

    rightUpperArm.position.copy(rightShoulder.position);
    rightUpperArm.position.y -= 0.175;
    rightForearm.position.copy(rightElbow.position);
    rightForearm.position.y -= 0.175;
    rightHand.position.copy(rightWrist.position);
    rightHand.position.y -= 0.075;

    // Add to target scene if provided
    if (targetScene) {
        targetScene.add(group);
    }

    return { model: group, materials, animations: group.animations };
}

/**
 * Creates a simple walk animation clip.
 * @param {Array<THREE.Bone>} bones - Array of bones in the skeleton.
 * @returns {THREE.AnimationClip} The generated walk animation clip.
 */
function createWalkAnimation(bones) {
    const times = [0, 0.5, 1]; // Keyframe times (start, mid, end)
    const duration = 1; // Animation duration in seconds

    // Find bones by name (assuming standard naming)
    const leftHip = bones.find(b => b.name === 'LeftHip');
    const rightHip = bones.find(b => b.name === 'RightHip');
    const leftShoulder = bones.find(b => b.name === 'LeftShoulder');
    const rightShoulder = bones.find(b => b.name === 'RightShoulder');
    const leftKnee = bones.find(b => b.name === 'LeftKnee');
    const rightKnee = bones.find(b => b.name === 'RightKnee');
    const leftElbow = bones.find(b => b.name === 'LeftElbow');
    const rightElbow = bones.find(b => b.name === 'RightElbow');

    // Define keyframe values (rotations)
    const hipSwing = Math.PI / 6;
    const kneeBend = Math.PI / 4;
    const shoulderSwing = Math.PI / 8;
    const elbowBend = Math.PI / 6;

    const tracks = [];

    // Legs
    if (leftHip) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftHip.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-hipSwing, 0, 0)).toArray(), // Back
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(hipSwing, 0, 0)).toArray(), // Forward
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-hipSwing, 0, 0)).toArray(), // Back
    ]));
    if (rightHip) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightHip.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(hipSwing, 0, 0)).toArray(), // Forward
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-hipSwing, 0, 0)).toArray(), // Back
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(hipSwing, 0, 0)).toArray(), // Forward
    ]));
    if (leftKnee) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftKnee.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBend * 0.5, 0, 0)).toArray(), // Slightly bent
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBend, 0, 0)).toArray(),       // Bent
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBend * 0.5, 0, 0)).toArray(), // Slightly bent
    ]));
    if (rightKnee) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightKnee.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBend, 0, 0)).toArray(),       // Bent
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBend * 0.5, 0, 0)).toArray(), // Slightly bent
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(kneeBend, 0, 0)).toArray(),       // Bent
    ]));

    // Arms
    if (leftShoulder) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftShoulder.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(shoulderSwing, 0, 0)).toArray(), // Forward
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-shoulderSwing, 0, 0)).toArray(), // Back
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(shoulderSwing, 0, 0)).toArray(), // Forward
    ]));
    if (rightShoulder) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightShoulder.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-shoulderSwing, 0, 0)).toArray(), // Back
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(shoulderSwing, 0, 0)).toArray(), // Forward
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-shoulderSwing, 0, 0)).toArray(), // Back
    ]));
    if (leftElbow) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftElbow.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(elbowBend, 0, 0)).toArray(),
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(elbowBend * 0.5, 0, 0)).toArray(),
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(elbowBend, 0, 0)).toArray(),
    ]));
    if (rightElbow) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightElbow.uuid}.quaternion`, times, [
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(elbowBend * 0.5, 0, 0)).toArray(),
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(elbowBend, 0, 0)).toArray(),
        ...new THREE.Quaternion().setFromEuler(new THREE.Euler(elbowBend * 0.5, 0, 0)).toArray(),
    ]));

    return new THREE.AnimationClip('walk', duration, tracks);
}

/**
 * Sets up a simple idle animation (bobbing) if complex animations fail.
 * @param {THREE.Object3D} model - The model to animate.
 */
function setupSimpleIdleAnimation(model) {
    // Store original position for bobbing
    model.userData.originalY = model.position.y;

    // We'll apply this in the animatePreview loop
}

/**
 * Animation loop for the preview scene.
 */
function animatePreview() {
    previewAnimationId = requestAnimationFrame(animatePreview);
    if (!previewRenderer || !previewScene || !previewCamera) return; // Exit if cleanup occurred

    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta); // Update walk animation
    } else {
        // Apply simple idle animation if no mixer (e.g., for custom models or fallback)
        const time = Date.now() * 0.001;
        const model = customCharacter || robotModel; // Get the current active model
        if (model && model.userData.originalY !== undefined) {
            model.position.y = model.userData.originalY + Math.sin(time * 2) * 0.05;
        } else if (model) {
            // Fallback simple bob if originalY wasn't set
            model.position.y = Math.sin(time * 2) * 0.05;
        }
    }

    previewControls.update();
    previewRenderer.render(previewScene, previewCamera);
}

/**
 * Creates the selection outline effect mesh.
 */
function createSelectionOutline() {
    const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x3cb371, // Bright green
        side: THREE.BackSide, // Render back faces
        transparent: true,
        opacity: 0.7
    });
    selectedMeshOutline = new THREE.Mesh(undefined, outlineMaterial);
    selectedMeshOutline.scale.set(1.05, 1.05, 1.05); // Slightly larger than the mesh
    selectedMeshOutline.visible = false;
    previewScene.add(selectedMeshOutline);
}

/**
 * Handles clicks within the preview viewport for mesh selection.
 * @param {MouseEvent} event - The click event.
 */
function onViewportClick(event) {
    if (!previewCamera || !previewRenderer || !previewScene) return;

    const viewport = previewRenderer.domElement;
    const rect = viewport.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, previewCamera);

    const currentModel = customCharacter || robotModel;
    if (!currentModel) return;

    const intersects = raycaster.intersectObject(currentModel, true);

    if (intersects.length > 0) {
        // Get the first intersected mesh that is not the outline itself
        const intersectedMesh = intersects.find(intersect => intersect.object !== selectedMeshOutline)?.object;

        if (intersectedMesh && intersectedMesh.isMesh) {
            selectMesh(intersectedMesh);
        } else {
            deselectMesh();
        }
    } else {
        deselectMesh();
    }
}

/**
 * Selects a mesh, updates UI, and shows outline.
 * @param {THREE.Mesh} mesh - The mesh to select.
 */
function selectMesh(mesh) {
    // Deselect previous mesh first
    deselectMesh();

    // Update global selected mesh state
    setSelectedMesh(mesh);

    // Update UI elements
    const colorInput = document.getElementById('llm-color');
    if (mesh.material.color) {
        colorInput.value = '#' + mesh.material.color.getHexString();
    }

    const selectedNameElement = document.getElementById('selected-mesh-name');
    if (selectedNameElement) {
        let displayName = mesh.name || 'Unnamed Part';
        // Simple formatting: remove underscores, capitalize parts
        displayName = displayName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        selectedNameElement.textContent = displayName;
        selectedNameElement.classList.remove('hidden');
    }

    // Update manipulation displays
    updateManipulationDisplays();

    // Show outline
    if (selectedMeshOutline) {
        selectedMeshOutline.geometry = mesh.geometry; // Use the same geometry
        selectedMeshOutline.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
        selectedMeshOutline.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
        // Apply mesh scale to outline - necessary if mesh itself is scaled
        selectedMeshOutline.scale.copy(mesh.getWorldScale(new THREE.Vector3())).multiplyScalar(1.05);
        selectedMeshOutline.visible = true;
    }

    // Show manipulation controls
    const manipulationControls = document.querySelector('.manipulation-controls');
    const noSelectionMessage = document.querySelector('.no-selection-message');
    if (manipulationControls) manipulationControls.style.display = 'flex';
    if (noSelectionMessage) noSelectionMessage.style.display = 'none';
}

/**
 * Deselects the currently selected mesh.
 */
function deselectMesh() {
    const previouslySelected = getSelectedMesh();
    if (previouslySelected) {
        // Optionally reset emissive highlight or other visual cues on the mesh itself
    }

    // Clear global selected mesh state
    setSelectedMesh(null);

    // Hide outline
    if (selectedMeshOutline) {
        selectedMeshOutline.visible = false;
    }

    // Hide UI elements related to selection
    const selectedNameElement = document.getElementById('selected-mesh-name');
    if (selectedNameElement) selectedNameElement.classList.add('hidden');

    // Hide manipulation controls and show message
    const manipulationControls = document.querySelector('.manipulation-controls');
    const noSelectionMessage = document.querySelector('.no-selection-message');
    if (manipulationControls) manipulationControls.style.display = 'none';
    if (noSelectionMessage) noSelectionMessage.style.display = 'block';
}

/**
 * Updates the color of the currently selected mesh.
 * Triggered by the color input change.
 */
export function updateSelectedMeshColor() {
    const selectedMesh = getSelectedMesh();
    const colorInput = document.getElementById('llm-color');

    if (selectedMesh && colorInput) {
        const newColor = colorInput.value;
        applyColorToMesh(selectedMesh, newColor); // Use function from color manager
    }
}

/**
 * Resets the preview model to the default robot.
 */
export function resetPreviewModel() {
    loadInitialModel(null); // Load default model without edit data
    deselectMesh(); // Ensure nothing is selected
}

/**
 * Displays a newly generated custom character.
 * @param {string} generatedCode - The JS code string for the character function.
 */
export function displayGeneratedCharacter(generatedCode) {
    if (!previewScene) return;

    // Clear existing models
    if (robotModel) previewScene.remove(robotModel);
    if (customCharacter) previewScene.remove(customCharacter);
    robotModel = null;
    customCharacter = null;
    mixer = null; // Stop animation mixer
    walkAction = null;

    try {
        customCharacter = createCustomCharacter(THREE, generatedCode);
        prepareModelForIndividualColoring(customCharacter); // Prepare for coloring/selection
        previewScene.add(customCharacter);
        setModels(null, customCharacter); // Update global state
        setupSimpleIdleAnimation(customCharacter); // Apply simple idle
        deselectMesh(); // Ensure nothing is selected after generating
    } catch (error) {
        console.error("Error displaying generated character:", error);
        // Fallback to default robot if creation fails
        createAndAddDefaultRobot(null);
    }
}

// Function to create the default robot model for export/reference if needed
// Might not be strictly necessary if createRobotModel is sufficient
export function createDefaultRobotModel(color = '#3cb371', style = 'modern') {
    const { model } = createRobotModel(null, color, style); // Don't add to scene here
    return model;
}