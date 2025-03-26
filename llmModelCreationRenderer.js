import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';

// Function to create the default robot model
export function createRobotModel(humanoidScene, color, style) {
    // Get standardized materials
    const materials = createStandardMaterials(color, style);

    // Main group for the robot
    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel"; // Name the main group

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.name = "Head"; // Name the head group
    headGroup.position.y = 1.6; // Position the head group higher
    robotGroup.add(headGroup);

    // Head Shape (rounded box)
    const headShape = new THREE.Shape();
    const x = -0.2, y = -0.2; // Head dimensions
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
    headMain.name = "Head_Main"; // Specific name
    headGroup.add(headMain);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 8); // Slightly smaller eyes
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.08, 0.04, 0.16); // Adjusted position relative to head group origin
    leftEye.name = "Head_LeftEye"; // Specific name
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.08, 0.04, 0.16); // Adjusted position relative to head group origin
    rightEye.name = "Head_RightEye"; // Specific name
    headGroup.add(rightEye);

    // Antenna
    const antennaBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.05), // Base part
        materials.limbsMaterial
    );
    antennaBase.position.set(0, 0.22, 0); // Position on top of head
    antennaBase.name = "Head_AntennaBase";
    headGroup.add(antennaBase);

    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.15), // Main antenna shaft, slimmer
        materials.limbsMaterial
    );
    antenna.position.set(0, 0.3, 0); // Position above base
    antenna.name = "Head_Antenna"; // Specific name
    headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 8), // Smaller tip
        materials.antennaTipMaterial
    );
    antennaTip.position.set(0, 0.38, 0); // Position on top of antenna shaft
    antennaTip.name = "Head_AntennaTip"; // Specific name
    headGroup.add(antennaTip);

    // --- Torso ---
    const torsoGroup = new THREE.Group();
    torsoGroup.name = "Torso"; // Name the torso group
    torsoGroup.position.y = 1.05; // Position the torso group
    robotGroup.add(torsoGroup);

    // Torso Shape (rounded box)
    const torsoShape = new THREE.Shape();
    const tx = -0.25, ty = -0.4; // Torso dimensions
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
    torsoMain.name = "Body_Torso"; // Specific name
    torsoGroup.add(torsoMain);

    // Chest Light
    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 32), // Smaller light
        materials.chestLightMaterial
    );
    chestLight.position.set(0, 0.1, 0.13); // Position on torso front, slightly offset
    chestLight.name = "Body_ChestLight"; // Specific name
    torsoGroup.add(chestLight);

    // Neck
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.15), // Tapered neck
        materials.limbsMaterial
    );
    neck.position.set(0, 0.475, 0); // Position between torso top and head bottom
    neck.name = "Body_Neck"; // Specific name
    torsoGroup.add(neck);

    // Shoulders
    const shoulderGeometry = new THREE.SphereGeometry(0.1, 16, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    leftShoulder.position.set(-0.3, 0.3, 0); // Position on torso side
    leftShoulder.name = "Body_LeftShoulder"; // Specific name
    torsoGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    rightShoulder.position.set(0.3, 0.3, 0); // Position on torso side
    rightShoulder.name = "Body_RightShoulder"; // Specific name
    torsoGroup.add(rightShoulder);

    // --- Arms ---
    // Define arm properties
    const armSegmentLength = 0.3;
    const armRadius = 0.06;
    const armGeometry = new THREE.CapsuleGeometry(armRadius, armSegmentLength, 4, 8);
    const elbowGeometry = new THREE.SphereGeometry(armRadius * 1.1, 12, 8);

    // Left Arm
    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = "LeftArm"; // Name the arm group
    leftArmGroup.position.copy(leftShoulder.position); // Position at the shoulder
    torsoGroup.add(leftArmGroup);

    const leftUpperArm = new THREE.Mesh(armGeometry, materials.limbsMaterial);
    // Position relative to arm group origin (shoulder)
    leftUpperArm.position.y = -armSegmentLength / 2 - armRadius;
    leftUpperArm.name = "LeftArm_Upper"; // Specific name
    leftArmGroup.add(leftUpperArm);

    const leftElbow = new THREE.Mesh(elbowGeometry, materials.limbsMaterial);
    // Position relative to upper arm end
    leftElbow.position.y = leftUpperArm.position.y - armSegmentLength / 2 - armRadius * 1.1;
    leftElbow.name = "LeftArm_Elbow"; // Specific name
    leftArmGroup.add(leftElbow);

    const leftLowerArm = new THREE.Mesh(armGeometry, materials.limbsMaterial);
    // Position relative to elbow
    leftLowerArm.position.y = leftElbow.position.y - armSegmentLength / 2 - armRadius;
    leftLowerArm.name = "LeftArm_Lower"; // Specific name
    leftArmGroup.add(leftLowerArm);

    const leftHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 0.1), // Simple box hand
        materials.limbsMaterial // Use limbs material for consistency
    );
    // Position relative to lower arm end
    leftHand.position.y = leftLowerArm.position.y - armSegmentLength / 2 - 0.06;
    leftHand.name = "LeftArm_Hand"; // Specific name
    leftArmGroup.add(leftHand);

    // Slightly rotate the arm outwards
    leftArmGroup.rotation.z = Math.PI / 8;

    // Right Arm (mirror of left arm)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = "RightArm"; // Name the arm group
    rightArmGroup.position.copy(rightShoulder.position); // Position at the shoulder
    torsoGroup.add(rightArmGroup);

    const rightUpperArm = new THREE.Mesh(armGeometry, materials.limbsMaterial);
    rightUpperArm.position.y = -armSegmentLength / 2 - armRadius;
    rightUpperArm.name = "RightArm_Upper"; // Specific name
    rightArmGroup.add(rightUpperArm);

    const rightElbow = new THREE.Mesh(elbowGeometry, materials.limbsMaterial);
    rightElbow.position.y = rightUpperArm.position.y - armSegmentLength / 2 - armRadius * 1.1;
    rightElbow.name = "RightArm_Elbow"; // Specific name
    rightArmGroup.add(rightElbow);

    const rightLowerArm = new THREE.Mesh(armGeometry, materials.limbsMaterial);
    rightLowerArm.position.y = rightElbow.position.y - armSegmentLength / 2 - armRadius;
    rightLowerArm.name = "RightArm_Lower"; // Specific name
    rightArmGroup.add(rightLowerArm);

    const rightHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 0.1), // Simple box hand
        materials.limbsMaterial // Use limbs material for consistency
    );
    rightHand.position.y = rightLowerArm.position.y - armSegmentLength / 2 - 0.06;
    rightHand.name = "RightArm_Hand"; // Specific name
    rightArmGroup.add(rightHand);

    // Slightly rotate the arm outwards
    rightArmGroup.rotation.z = -Math.PI / 8;

    // --- Legs ---
    // Pelvis
    const pelvis = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.2), // Box shape for pelvis
        materials.bodyMaterial
    );
    pelvis.position.y = -0.475; // Position below torso center
    pelvis.name = "Body_Pelvis"; // Specific name
    torsoGroup.add(pelvis);

    // Hips (connection points for legs)
    const hipGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const leftHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    leftHip.position.set(-0.1, -0.05, 0); // Position relative to pelvis center
    pelvis.add(leftHip); // Add hips as children of pelvis

    const rightHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    rightHip.position.set(0.1, -0.05, 0); // Position relative to pelvis center
    pelvis.add(rightHip); // Add hips as children of pelvis

    // Define leg properties
    const legSegmentLength = 0.35;
    const legRadius = 0.07;
    const legGeometry = new THREE.CapsuleGeometry(legRadius, legSegmentLength, 4, 8);
    const kneeGeometry = new THREE.SphereGeometry(legRadius * 1.1, 12, 8);

    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.name = "LeftLeg"; // Name the leg group
    const leftHipWorldPos = new THREE.Vector3();
    leftHip.getWorldPosition(leftHipWorldPos); // Get world position of hip joint
    leftLegGroup.position.copy(leftHipWorldPos); // Position leg group at hip joint
    robotGroup.add(leftLegGroup); // Add leg group to the main robot group

    const leftUpperLeg = new THREE.Mesh(legGeometry, materials.limbsMaterial);
    // Position relative to leg group origin (hip)
    leftUpperLeg.position.y = -legSegmentLength / 2 - legRadius;
    leftUpperLeg.name = "LeftLeg_Upper"; // Specific name
    leftLegGroup.add(leftUpperLeg);

    const leftKnee = new THREE.Mesh(kneeGeometry, materials.limbsMaterial);
    // Position relative to upper leg end
    leftKnee.position.y = leftUpperLeg.position.y - legSegmentLength / 2 - legRadius * 1.1;
    leftKnee.name = "LeftLeg_Knee"; // Specific name
    leftLegGroup.add(leftKnee);

    const leftLowerLeg = new THREE.Mesh(legGeometry, materials.limbsMaterial);
    // Position relative to knee
    leftLowerLeg.position.y = leftKnee.position.y - legSegmentLength / 2 - legRadius;
    leftLowerLeg.name = "LeftLeg_Lower"; // Specific name
    leftLegGroup.add(leftLowerLeg);

    // Foot
    const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.22); // Box shape for foot
    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    // Position relative to lower leg end, slightly forward
    leftFoot.position.y = leftLowerLeg.position.y - legSegmentLength / 2 - 0.04;
    leftFoot.position.z = 0.05; // Move foot slightly forward
    leftFoot.name = "LeftLeg_Foot"; // Specific name
    leftLegGroup.add(leftFoot);

    // Right Leg (mirror of left leg)
    const rightLegGroup = new THREE.Group();
    rightLegGroup.name = "RightLeg"; // Name the leg group
    const rightHipWorldPos = new THREE.Vector3();
    rightHip.getWorldPosition(rightHipWorldPos); // Get world position of hip joint
    rightLegGroup.position.copy(rightHipWorldPos); // Position leg group at hip joint
    robotGroup.add(rightLegGroup); // Add leg group to the main robot group

    const rightUpperLeg = new THREE.Mesh(legGeometry, materials.limbsMaterial);
    rightUpperLeg.position.y = -legSegmentLength / 2 - legRadius;
    rightUpperLeg.name = "RightLeg_Upper"; // Specific name
    rightLegGroup.add(rightUpperLeg);

    const rightKnee = new THREE.Mesh(kneeGeometry, materials.limbsMaterial);
    rightKnee.position.y = rightUpperLeg.position.y - legSegmentLength / 2 - legRadius * 1.1;
    rightKnee.name = "RightLeg_Knee"; // Specific name
    rightLegGroup.add(rightKnee);

    const rightLowerLeg = new THREE.Mesh(legGeometry, materials.limbsMaterial);
    rightLowerLeg.position.y = rightKnee.position.y - legSegmentLength / 2 - legRadius;
    rightLowerLeg.name = "RightLeg_Lower"; // Specific name
    rightLegGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.y = rightLowerLeg.position.y - legSegmentLength / 2 - 0.04;
    rightFoot.position.z = 0.05; // Move foot slightly forward
    rightFoot.name = "RightLeg_Foot"; // Specific name
    rightLegGroup.add(rightFoot);

    // --- Final Adjustments ---
    // Enable shadows for all meshes
    robotGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true; // Allow receiving shadows too
        }
    });

    // Calculate the lowest point of the feet to place the robot on the ground
    const tempBox = new THREE.Box3();
    const lowestPoint = new THREE.Vector3(0, Infinity, 0);
    // Find the lowest y-coordinate among the feet
    robotGroup.traverse(child => {
        if (child.name && child.name.includes("Foot")) { // Check specifically for feet
            // Make sure matrix world is updated before getting bounding box
            child.updateMatrixWorld(true);
            tempBox.setFromObject(child, true); // Use precise bounding box
            if (tempBox.min.y < lowestPoint.y) {
                lowestPoint.y = tempBox.min.y;
            }
        }
    });

    // Adjust the main group's y position so the lowest foot point is slightly above y=0
    robotGroup.position.y = -lowestPoint.y + 0.02; // Add a small buffer


    // Add the completed robot model to the scene
    humanoidScene.add(robotGroup);

    // Return the model and materials
    return {
        model: robotGroup,
        materials: materials // Pass materials back if needed elsewhere
    };
}