import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Needed for controls setup
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { setGlobalReferences, setModels } from './threeJSGlobals.js'; // Import global setters
import { createCustomCharacter } from './characterGenerator.js'; // Needed for custom char loading
import { applyStoredModelData } from './llmModelStorage.js'; // Needed for applying stored data
import { prepareModelForIndividualColoring } from './llmMeshColorManager.js'; // Needed for preparing model

// Keep track of animation frame ID for this specific renderer
let humanoidAnimationId = null;
let humanoidClock; // Clock for animations

// Moved from llmCreationInterface.js
export function initHumanoidPreview(llmToEdit) {
    const viewport = document.querySelector('.humanoid-viewport');

    // Clear existing content
    viewport.innerHTML = '';
    // Cancel any previous animation loop for this context
    if (humanoidAnimationId) {
        cancelAnimationFrame(humanoidAnimationId);
        humanoidAnimationId = null;
    }

    // Setup Three.js scene
    const humanoidScene = new THREE.Scene();
    humanoidScene.background = new THREE.Color(0x111111);
    // window.currentHumanoidScene = humanoidScene; // Don't set window ref here, use setGlobalReferences

    // Setup camera
    const humanoidCamera = new THREE.PerspectiveCamera(
        45,
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    humanoidCamera.position.set(0, 1.5, 4);
    humanoidCamera.lookAt(0, 1, 0);

    // Setup renderer
    const humanoidRenderer = new THREE.WebGLRenderer({ antialias: true });
    humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    humanoidRenderer.shadowMap.enabled = true;
    viewport.appendChild(humanoidRenderer.domElement);

    // Setup OrbitControls specific to this viewport
    const controls = new OrbitControls(humanoidCamera, humanoidRenderer.domElement);
    controls.target.set(0, 1, 0); // Look at the center of the character
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI / 1.8; // Allow slightly more vertical rotation


    // Set global references *after* creating scene, camera, renderer
    setGlobalReferences(humanoidScene, humanoidCamera, humanoidRenderer);

    // Add click event listener for mesh selection (forwarded from llmCreationInterface)
    // The listener itself remains in llmCreationInterface as it updates UI elements there

    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly brighter ambient
    humanoidScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); // Main light
    keyLight.position.set(2, 3, 3);
    keyLight.castShadow = true;
    humanoidScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4); // Softer fill light
    fillLight.position.set(-2, 1, 2);
    humanoidScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3); // Backlight for definition
    rimLight.position.set(0, 2, -3);
    humanoidScene.add(rimLight);


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
    ground.position.y = -0.01; // Place slightly below origin
    humanoidScene.add(ground);

    // Clear previous models before creating new ones (using global references)
    if (window.robotModel && window.robotModel.parent) window.robotModel.parent.remove(window.robotModel);
    if (window.customCharacter && window.customCharacter.parent) window.customCharacter.parent.remove(window.customCharacter);
    setModels(null, null); // Clear global state

    let createdModel = null; // To return the reference

    // If editing and has custom character code, use it
    if (llmToEdit && llmToEdit.customCharacterCode) {
        try {
            const customChar = createCustomCharacter(THREE, llmToEdit.customCharacterCode);
            humanoidScene.add(customChar);
            prepareModelForIndividualColoring(customChar); // Prepare for coloring/manipulation
            setModels(null, customChar); // Update global state

            // Apply saved model data if it exists (handles colors/transforms)
            if (llmToEdit.modelData) {
                applyStoredModelData(customChar, llmToEdit);
                // Re-prepare after applying stored data
                prepareModelForIndividualColoring(customChar);
            }

            createdModel = customChar; // Set the return value

            // Store the generated code for later use
            const statusElement = document.getElementById('generation-status');
            if(statusElement) {
                statusElement.dataset.generatedCode = llmToEdit.customCharacterCode;
                statusElement.textContent = "Character loaded successfully!";
            }

        } catch (error) {
            console.error("Error loading custom character:", error);
            // Fallback to default robot
            const { model } = createRobotModel(humanoidScene, llmToEdit?.color, llmToEdit?.style);
            createdModel = model;
            setModels(createdModel, null); // Update global state
            prepareModelForIndividualColoring(createdModel);
        }
    } else {
        // Create default robot humanoid model
        const { model } = createRobotModel(humanoidScene, llmToEdit?.color, llmToEdit?.style);
        createdModel = model;
        setModels(createdModel, null); // Update global state
        prepareModelForIndividualColoring(createdModel);

        // *** Crucial Fix: DO NOT apply old modelData to default robots on edit ***
        // This ensures we always edit the current default robot structure.
        // The base color is already handled by createRobotModel.
        /*
        // Apply stored model data if editing and model data exists
        if (llmToEdit && llmToEdit.modelData) {
             applyStoredModelData(createdModel, llmToEdit);
             prepareModelForIndividualColoring(createdModel);
        }
        */
    }

    // Setup animation clock
    humanoidClock = new THREE.Clock();
    // humanoidMixer = null; // Mixer would be initialized if loading animated models

    // Start animation loop specific to this renderer
    animateHumanoidPreview(humanoidScene, humanoidCamera, humanoidRenderer, controls);

    // Handle resize specific to this viewport
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (humanoidCamera && humanoidRenderer) {
                humanoidCamera.aspect = width / height;
                humanoidCamera.updateProjectionMatrix();
                humanoidRenderer.setSize(width, height);
            }
        }
    });
    resizeObserver.observe(viewport);

    // Return the created model reference
    return { model: createdModel };
}


// Animation loop specific to the humanoid preview
function animateHumanoidPreview(scene, camera, renderer, controls) {
    // Cancel previous frame if exists
    if (humanoidAnimationId) cancelAnimationFrame(humanoidAnimationId);

    humanoidAnimationId = requestAnimationFrame(() => animateHumanoidPreview(scene, camera, renderer, controls));

    // Update controls
    controls.update();

    // Use window references for current model
    const currentModel = window.customCharacter || window.robotModel;

    // Simple idle animation
    if (currentModel) {
        const time = humanoidClock.getElapsedTime(); // Use clock for smoother animation

        // Gentle bobbing motion - apply to the model's position directly
        // Make sure not to overwrite position changes from manipulator
        // Maybe store an initial position and offset from that?
        // For now, let's skip this if a mesh is selected to avoid conflict
        if (!window.selectedMesh) {
             // Store initial Y position if not already stored
             if (currentModel.userData.initialY === undefined) {
                 currentModel.userData.initialY = currentModel.position.y;
             }
             currentModel.position.y = currentModel.userData.initialY + Math.sin(time * 2) * 0.03; // Slower, smaller bob
        }

        // Gentle rotation - apply to the model's rotation directly
        // Also skip if selected to avoid conflict? Or maybe rotation is fine? Let's try allowing it.
        // Store initial Y rotation if not already stored
         if (currentModel.userData.initialRotationY === undefined) {
             currentModel.userData.initialRotationY = currentModel.rotation.y;
         }
         currentModel.rotation.y = currentModel.userData.initialRotationY + Math.sin(time) * 0.1; // Slower rotation

    }

    // Update animation mixer if exists (for more complex animations)
    // if (humanoidMixer) {
    //     humanoidMixer.update(humanoidClock.getDelta());
    // }

    renderer.render(scene, camera);
}

// --- Robot Creation Logic (Copied from previous version, ensures consistency) ---
export function createRobotModel(humanoidScene, color = '#3cb371', style = 'modern') {
    const materials = createStandardMaterials(color, style);

    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel";

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.name = "Head";
    // Position will be set relative to neck
    robotGroup.add(headGroup);

    const headShape = new THREE.Shape();
    const x = -0.2, y = -0.2;
    const width = 0.4, height = 0.4;
    const radius = 0.08;
    headShape.moveTo(x, y + radius);
    headShape.lineTo(x, y + height - radius);
    headShape.quadraticCurveTo(x, y + height, x + radius, y + height);
    headShape.lineTo(x + width - radius, y + height);
    headShape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    headShape.lineTo(x + width, y + radius);
    headShape.quadraticCurveTo(x + width, y, x + width - radius, y);
    headShape.lineTo(x + radius, y);
    headShape.quadraticCurveTo(x, y, x, y + radius);

    const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const headGeometry = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    headGeometry.center(); // Center the geometry

    const headMain = new THREE.Mesh(headGeometry, materials.headMaterial);
    headMain.name = "Head_Main";
    headGroup.add(headMain);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.08, 0.04, 0.16); // Relative to headGroup center
    leftEye.name = "Head_LeftEye";
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.08, 0.04, 0.16); // Relative to headGroup center
    rightEye.name = "Head_RightEye";
    headGroup.add(rightEye);

    const antennaBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.05),
        materials.limbsMaterial
    );
    antennaBase.position.set(0, 0.22, 0); // Relative to headGroup center
    antennaBase.name = "Head_AntennaBase";
    headGroup.add(antennaBase);

    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.15),
        materials.limbsMaterial
    );
    antenna.position.set(0, 0.3, 0); // Relative to headGroup center
    antenna.name = "Head_Antenna";
    headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 8),
        materials.antennaTipMaterial
    );
    antennaTip.position.set(0, 0.38, 0); // Relative to headGroup center
    antennaTip.name = "Head_AntennaTip";
    headGroup.add(antennaTip);

    // --- Torso ---
    const torsoGroup = new THREE.Group();
    torsoGroup.name = "Torso";
    torsoGroup.position.y = 1.05; // Center Y position of the torso segment
    robotGroup.add(torsoGroup);

    const torsoShape = new THREE.Shape();
    const tx = -0.25, ty = -0.4; // Relative positions for shape definition
    const tWidth = 0.5, tHeight = 0.8;
    const tRadius = 0.1;
    torsoShape.moveTo(tx, ty + tRadius);
    torsoShape.lineTo(tx, ty + tHeight - tRadius);
    torsoShape.quadraticCurveTo(tx, ty + tHeight, tx + tRadius, ty + tHeight);
    torsoShape.lineTo(tx + tWidth - tRadius, ty + tHeight);
    torsoShape.quadraticCurveTo(tx + tWidth, ty + tHeight, tx + tWidth, ty + tHeight - tRadius);
    torsoShape.lineTo(tx + tWidth, ty + tRadius);
    torsoShape.quadraticCurveTo(tx + tWidth, ty, tx + tWidth - tRadius, ty);
    torsoShape.lineTo(tx + tRadius, ty);
    torsoShape.quadraticCurveTo(tx, ty, tx, ty + tRadius);

    const torsoExtrudeSettings = { depth: 0.25, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const torsoGeometry = new THREE.ExtrudeGeometry(torsoShape, torsoExtrudeSettings);
    torsoGeometry.center(); // Center the geometry

    const torsoMain = new THREE.Mesh(torsoGeometry, materials.bodyMaterial);
    torsoMain.name = "Body_Torso";
    torsoGroup.add(torsoMain);

    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 32),
        materials.chestLightMaterial
    );
    chestLight.position.set(0, 0.1, 0.13); // Relative to torsoGroup center
    chestLight.name = "Body_ChestLight";
    torsoGroup.add(chestLight);

    // --- Neck (Connects Torso and Head) ---
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.15),
        materials.limbsMaterial
    );
    neck.position.y = torsoGroup.position.y + tHeight / 2; // Position neck base at torso top
    neck.name = "Body_Neck";
    robotGroup.add(neck);

    // Position Head group relative to neck top
    headGroup.position.y = neck.position.y + 0.15 / 2;

    // --- Shoulders (Joints) ---
    const shoulderOffsetX = 0.35;
    const shoulderOffsetY = torsoGroup.position.y + 0.3;
    const shoulderGeometry = new THREE.SphereGeometry(0.1, 16, 8);

    const leftShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    leftShoulder.position.set(-shoulderOffsetX, shoulderOffsetY, 0);
    leftShoulder.name = "Body_LeftShoulderJoint";
    robotGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    rightShoulder.position.set(shoulderOffsetX, shoulderOffsetY, 0);
    rightShoulder.name = "Body_RightShoulderJoint";
    robotGroup.add(rightShoulder);

    // --- Arms (Positioned relative to shoulders) ---
    const armSegmentLength = 0.3;
    const armRadius = 0.06;
    const elbowJointGeometry = new THREE.SphereGeometry(0.07, 12, 8);
    const upperArmGeometry = new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armSegmentLength);
    const lowerArmGeometry = new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.8, armSegmentLength);

    // Left Arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.position.set(leftShoulder.position.x, leftShoulder.position.y - armSegmentLength / 2 - 0.05, 0);
    leftUpperArm.name = "LeftArm_Upper";
    robotGroup.add(leftUpperArm);

    const leftElbow = new THREE.Mesh(elbowJointGeometry, materials.limbsMaterial);
    leftElbow.position.set(leftUpperArm.position.x, leftUpperArm.position.y - armSegmentLength / 2 - 0.035, 0);
    leftElbow.name = "LeftArm_ElbowJoint";
    robotGroup.add(leftElbow);

    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(leftElbow.position.x, leftElbow.position.y - armSegmentLength / 2 - 0.035, 0);
    leftLowerArm.name = "LeftArm_Lower";
    robotGroup.add(leftLowerArm);

    const leftHand = createDetailedHand(materials, 'left');
    leftHand.position.set(leftLowerArm.position.x, leftLowerArm.position.y - armSegmentLength / 2 - 0.06, 0);
    leftHand.name = "LeftArm_Hand"; // Ensure group has name
    // hand naming handled inside helper
    robotGroup.add(leftHand);

    // Right Arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.set(rightShoulder.position.x, rightShoulder.position.y - armSegmentLength / 2 - 0.05, 0);
    rightUpperArm.name = "RightArm_Upper";
    robotGroup.add(rightUpperArm);

    const rightElbow = new THREE.Mesh(elbowJointGeometry, materials.limbsMaterial);
    rightElbow.position.set(rightUpperArm.position.x, rightUpperArm.position.y - armSegmentLength / 2 - 0.035, 0);
    rightElbow.name = "RightArm_ElbowJoint";
    robotGroup.add(rightElbow);

    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(rightElbow.position.x, rightElbow.position.y - armSegmentLength / 2 - 0.035, 0);
    rightLowerArm.name = "RightArm_Lower";
    robotGroup.add(rightLowerArm);

    const rightHand = createDetailedHand(materials, 'right');
    rightHand.position.set(rightLowerArm.position.x, rightLowerArm.position.y - armSegmentLength / 2 - 0.06, 0);
    rightHand.name = "RightArm_Hand"; // Ensure group has name
    // hand naming handled inside helper
    robotGroup.add(rightHand);

    // --- Pelvis (Attached to torso bottom) ---
    const pelvis = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.2),
        materials.bodyMaterial
    );
    pelvis.position.y = torsoGroup.position.y - tHeight / 2 - 0.075;
    pelvis.name = "Body_Pelvis";
    robotGroup.add(pelvis);

    // --- Hips (Joints attached to pelvis) ---
    const hipOffsetX = 0.12;
    const hipOffsetY = pelvis.position.y - 0.05;
    const hipGeometry = new THREE.SphereGeometry(0.09, 12, 8);

    const leftHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    leftHip.position.set(-hipOffsetX, hipOffsetY, 0);
    leftHip.name = "Body_LeftHipJoint";
    robotGroup.add(leftHip);

    const rightHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    rightHip.position.set(hipOffsetX, hipOffsetY, 0);
    rightHip.name = "Body_RightHipJoint";
    robotGroup.add(rightHip);

    // --- Legs (Positioned relative to hips) ---
    const legSegmentLength = 0.35;
    const legRadius = 0.07;
    const kneeJointGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const upperLegGeometry = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legSegmentLength);
    const lowerLegGeometry = new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.8, legSegmentLength);
    const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.22);

    // Left Leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.set(leftHip.position.x, leftHip.position.y - legSegmentLength / 2 - 0.045, 0);
    leftUpperLeg.name = "LeftLeg_Upper";
    robotGroup.add(leftUpperLeg);

    const leftKnee = new THREE.Mesh(kneeJointGeometry, materials.limbsMaterial);
    leftKnee.position.set(leftUpperLeg.position.x, leftUpperLeg.position.y - legSegmentLength / 2 - 0.04, 0);
    leftKnee.name = "LeftLeg_KneeJoint";
    robotGroup.add(leftKnee);

    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(leftKnee.position.x, leftKnee.position.y - legSegmentLength / 2 - 0.04, 0);
    leftLowerLeg.name = "LeftLeg_Lower";
    robotGroup.add(leftLowerLeg);

    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    leftFoot.position.set(leftLowerLeg.position.x, leftLowerLeg.position.y - legSegmentLength / 2 - 0.04, 0.05); // Z offset added here
    leftFoot.name = "LeftLeg_Foot";
    robotGroup.add(leftFoot);

    // Right Leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(rightHip.position.x, rightHip.position.y - legSegmentLength / 2 - 0.045, 0);
    rightUpperLeg.name = "RightLeg_Upper";
    robotGroup.add(rightUpperLeg);

    const rightKnee = new THREE.Mesh(kneeJointGeometry, materials.limbsMaterial);
    rightKnee.position.set(rightUpperLeg.position.x, rightUpperLeg.position.y - legSegmentLength / 2 - 0.04, 0);
    rightKnee.name = "RightLeg_KneeJoint";
    robotGroup.add(rightKnee);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(rightKnee.position.x, rightKnee.position.y - legSegmentLength / 2 - 0.04, 0);
    rightLowerLeg.name = "RightLeg_Lower";
    robotGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.set(rightLowerLeg.position.x, rightLowerLeg.position.y - legSegmentLength / 2 - 0.04, 0.05); // Z offset added here
    rightFoot.name = "RightLeg_Foot";
    robotGroup.add(rightFoot);

    // Apply shadows
    robotGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            // child.receiveShadow = true; // Fewer objects need to receive shadows
        }
    });

    // --- Adjust final position ---
    // Calculate bounding box AFTER all parts are positioned
    const tempBox = new THREE.Box3().setFromObject(robotGroup);
    const lowestPointY = tempBox.min.y;

    // Adjust the whole group so the lowest point (feet) is at y=0
    robotGroup.position.y = -lowestPointY;

    // Store initial position for animation baseline
    robotGroup.userData.initialY = robotGroup.position.y;
    robotGroup.userData.initialRotationY = robotGroup.rotation.y;


    // Add the fully constructed robot to the scene passed as argument
    humanoidScene.add(robotGroup);

    return {
        model: robotGroup,
        materials: materials
    };
}

// Helper function to create a more detailed hand
function createDetailedHand(materials, side) {
    const handGroup = new THREE.Group();
    handGroup.name = `${side === 'left' ? 'Left' : 'Right'}Hand`; // Name the group

    // Palm
    const palmGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const palm = new THREE.Mesh(palmGeometry, materials.limbsMaterial);
    palm.name = `${handGroup.name}_Palm`; // Specific name
    handGroup.add(palm);

    // Fingers (simplified cylinders)
    const fingerGeometry = new THREE.CylinderGeometry(0.015, 0.01, 0.08);
    const fingerMaterial = materials.limbsMaterial.clone();

    const fingerPositions = [
        { x: -0.03, y: -0.06, z: 0, scale: 1.0, name: "Finger1" },   // Index
        { x: 0,    y: -0.065, z: 0, scale: 1.05, name: "Finger2" }, // Middle
        { x: 0.03, y: -0.06, z: 0, scale: 1.0, name: "Finger3" }    // Ring
    ];

    fingerPositions.forEach(pos => {
         const finger = new THREE.Mesh(fingerGeometry.clone(), fingerMaterial);
         finger.scale.y = pos.scale;
         finger.position.set(pos.x, pos.y, pos.z);
         finger.name = `${handGroup.name}_${pos.name}`; // Specific name
         handGroup.add(finger);
    });

    return handGroup;
}