import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';

export function createRobotModel(humanoidScene, color, style) {
    const materials = createStandardMaterials(color, style);

    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel";

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.name = "Head";
    headGroup.position.y = 1.6; // Positioned by neck later
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
    // No need to set position as geometry is centered and added to headGroup
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

    // Antenna parts relative to headGroup center
    const antennaBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.05),
        materials.limbsMaterial
    );
    antennaBase.position.set(0, 0.22, 0);
    antennaBase.name = "Head_AntennaBase";
    headGroup.add(antennaBase);

    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.15),
        materials.limbsMaterial
    );
    antenna.position.set(0, 0.3, 0);
    antenna.name = "Head_Antenna";
    headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 8),
        materials.antennaTipMaterial
    );
    antennaTip.position.set(0, 0.38, 0);
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
    // No need to set position as geometry is centered and added to torsoGroup
    torsoGroup.add(torsoMain);

    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 32),
        materials.chestLightMaterial
    );
    chestLight.position.set(0, 0.1, 0.13); // Relative to torsoGroup center
    chestLight.name = "Body_ChestLight";
    torsoGroup.add(chestLight);

    // Neck (Connects Torso and Head)
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.15),
        materials.limbsMaterial
    );
    neck.position.y = torsoGroup.position.y + tHeight / 2 - 0.075; // Place between torso top and head bottom
    neck.name = "Body_Neck";
    robotGroup.add(neck);

    // Update Head position based on neck
    headGroup.position.y = neck.position.y + 0.15;

    // --- Shoulders (Joints) ---
    // Move shoulders further out
    const shoulderOffsetX = 0.35; // Increased from 0.3
    const shoulderOffsetY = torsoGroup.position.y + 0.3; // Relative to world
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
    leftUpperArm.position.set(leftShoulder.position.x, leftShoulder.position.y - armSegmentLength / 2 - 0.05, 0); // Below shoulder joint
    leftUpperArm.name = "LeftArm_Upper";
    robotGroup.add(leftUpperArm);

    const leftElbow = new THREE.Mesh(elbowJointGeometry, materials.limbsMaterial);
    leftElbow.position.set(leftUpperArm.position.x, leftUpperArm.position.y - armSegmentLength / 2 - 0.035, 0); // Below upper arm
    leftElbow.name = "LeftArm_ElbowJoint";
    robotGroup.add(leftElbow);

    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(leftElbow.position.x, leftElbow.position.y - armSegmentLength / 2 - 0.035, 0); // Below elbow
    leftLowerArm.name = "LeftArm_Lower";
    robotGroup.add(leftLowerArm);

    // Use helper function for Left Hand
    const leftHand = createDetailedHand(materials, 'left');
    leftHand.position.set(leftLowerArm.position.x, leftLowerArm.position.y - armSegmentLength / 2 - 0.06, 0); // Below lower arm
    leftHand.name = "LeftArm_Hand";
    robotGroup.add(leftHand);

    // Right Arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.set(rightShoulder.position.x, rightShoulder.position.y - armSegmentLength / 2 - 0.05, 0); // Below shoulder joint
    rightUpperArm.name = "RightArm_Upper";
    robotGroup.add(rightUpperArm);

    const rightElbow = new THREE.Mesh(elbowJointGeometry, materials.limbsMaterial);
    rightElbow.position.set(rightUpperArm.position.x, rightUpperArm.position.y - armSegmentLength / 2 - 0.035, 0); // Below upper arm
    rightElbow.name = "RightArm_ElbowJoint";
    robotGroup.add(rightElbow);

    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(rightElbow.position.x, rightElbow.position.y - armSegmentLength / 2 - 0.035, 0); // Below elbow
    rightLowerArm.name = "RightArm_Lower";
    robotGroup.add(rightLowerArm);

    // Use helper function for Right Hand
    const rightHand = createDetailedHand(materials, 'right');
    rightHand.position.set(rightLowerArm.position.x, rightLowerArm.position.y - armSegmentLength / 2 - 0.06, 0); // Below lower arm
    rightHand.name = "RightArm_Hand";
    robotGroup.add(rightHand);

    // --- Pelvis (Attached to torso bottom) ---
    const pelvis = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.2),
        materials.bodyMaterial
    );
    pelvis.position.y = torsoGroup.position.y - tHeight / 2 - 0.075; // Position below torso
    pelvis.name = "Body_Pelvis";
    robotGroup.add(pelvis);

    // --- Hips (Joints attached to pelvis) ---
    const hipOffsetX = 0.12; // Slightly wider hips
    const hipOffsetY = pelvis.position.y - 0.05; // Below pelvis
    const hipGeometry = new THREE.SphereGeometry(0.09, 12, 8); // Slightly larger hip joints

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
    leftUpperLeg.position.set(leftHip.position.x, leftHip.position.y - legSegmentLength / 2 - 0.045, 0); // Below hip joint
    leftUpperLeg.name = "LeftLeg_Upper";
    robotGroup.add(leftUpperLeg);

    const leftKnee = new THREE.Mesh(kneeJointGeometry, materials.limbsMaterial);
    leftKnee.position.set(leftUpperLeg.position.x, leftUpperLeg.position.y - legSegmentLength / 2 - 0.04, 0); // Below upper leg
    leftKnee.name = "LeftLeg_KneeJoint";
    robotGroup.add(leftKnee);

    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(leftKnee.position.x, leftKnee.position.y - legSegmentLength / 2 - 0.04, 0); // Below knee
    leftLowerLeg.name = "LeftLeg_Lower";
    robotGroup.add(leftLowerLeg);

    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    leftFoot.position.set(leftLowerLeg.position.x, leftLowerLeg.position.y - legSegmentLength / 2 - 0.04, leftLowerLeg.position.z + 0.05); // Below lower leg, slightly forward
    leftFoot.name = "LeftLeg_Foot";
    robotGroup.add(leftFoot);

    // Right Leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(rightHip.position.x, rightHip.position.y - legSegmentLength / 2 - 0.045, 0); // Below hip joint
    rightUpperLeg.name = "RightLeg_Upper";
    robotGroup.add(rightUpperLeg);

    const rightKnee = new THREE.Mesh(kneeJointGeometry, materials.limbsMaterial);
    rightKnee.position.set(rightUpperLeg.position.x, rightUpperLeg.position.y - legSegmentLength / 2 - 0.04, 0); // Below upper leg
    rightKnee.name = "RightLeg_KneeJoint";
    robotGroup.add(rightKnee);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(rightKnee.position.x, rightKnee.position.y - legSegmentLength / 2 - 0.04, 0); // Below knee
    rightLowerLeg.name = "RightLeg_Lower";
    robotGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.set(rightLowerLeg.position.x, rightLowerLeg.position.y - legSegmentLength / 2 - 0.04, rightLowerLeg.position.z + 0.05); // Below lower leg, slightly forward
    rightFoot.name = "RightLeg_Foot";
    robotGroup.add(rightFoot);

    // Apply shadows
    robotGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // --- Adjust final position ---
    // Calculate bounding box AFTER all parts are positioned relative to the robotGroup
    const tempBox = new THREE.Box3().setFromObject(robotGroup);
    const lowestPointY = tempBox.min.y;

    // Adjust the whole group so the lowest point (feet) is slightly above y=0
    robotGroup.position.y = -lowestPointY + 0.01; // Small offset above ground

    // Add the fully constructed robot to the scene
    humanoidScene.add(robotGroup);

    return {
        model: robotGroup,
        materials: materials
    };
}

// Helper function to create a more detailed hand - MODIFIED
function createDetailedHand(materials, side) {
    const handGroup = new THREE.Group();

    // Palm
    const palmGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const palm = new THREE.Mesh(palmGeometry, materials.limbsMaterial);
    palm.name = "Hand_Palm";
    handGroup.add(palm);

    // Fingers (simplified cylinders)
    const fingerGeometry = new THREE.CylinderGeometry(0.015, 0.01, 0.08);
    const fingerMaterial = materials.limbsMaterial.clone(); // Use separate material if needed

    // Finger 1 (Index)
    const finger1 = new THREE.Mesh(fingerGeometry, fingerMaterial);
    finger1.position.set(-0.03, -0.06, 0);
    finger1.name = "Hand_Finger1";
    handGroup.add(finger1);

    // Finger 2 (Middle)
    const finger2 = new THREE.Mesh(fingerGeometry.clone(), fingerMaterial); // Clone geometry
    finger2.scale.y = 1.05; // Slightly longer middle finger
    finger2.position.set(0, -0.065, 0);
    finger2.name = "Hand_Finger2";
    handGroup.add(finger2);

    // Finger 3 (Ring)
    const finger3 = new THREE.Mesh(fingerGeometry, fingerMaterial);
    finger3.position.set(0.03, -0.06, 0);
    finger3.name = "Hand_Finger3";
    handGroup.add(finger3);

    // Thumb (Corrected positioning based on side)
    const thumbGeometry = new THREE.CylinderGeometry(0.018, 0.012, 0.06);
    const thumb = new THREE.Mesh(thumbGeometry, fingerMaterial);
    const thumbX = side === 'left' ? -0.05 : 0.05; // Correct X position
    const thumbZRotation = side === 'left' ? Math.PI / 4 : -Math.PI / 4; // Correct Z rotation

    thumb.position.set(thumbX, 0.02, 0.02); // Position relative to palm center
    thumb.rotation.z = thumbZRotation; // Angle thumb slightly
    thumb.rotation.y = Math.PI / 12; // Angle thumb slightly forward
    thumb.name = "Hand_Thumb";
    handGroup.add(thumb);

    return handGroup;
}