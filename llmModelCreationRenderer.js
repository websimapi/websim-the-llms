import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';

export function createRobotModel(humanoidScene, color, style) {
    const materials = createStandardMaterials(color, style);

    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel";

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.name = "Head";
    headGroup.position.y = 1.6;
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
    headGeometry.center();

    const headMain = new THREE.Mesh(headGeometry, materials.headMaterial);
    headMain.name = "Head_Main";
    headGroup.add(headMain);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.08, 0.04, 0.16);
    leftEye.name = "Head_LeftEye";
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.08, 0.04, 0.16);
    rightEye.name = "Head_RightEye";
    headGroup.add(rightEye);

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
    torsoGroup.position.y = 1.05;
    robotGroup.add(torsoGroup);

    const torsoShape = new THREE.Shape();
    const tx = -0.25, ty = -0.4;
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
    torsoGeometry.center();

    const torsoMain = new THREE.Mesh(torsoGeometry, materials.bodyMaterial);
    torsoMain.name = "Body_Torso";
    torsoGroup.add(torsoMain);

    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 32),
        materials.chestLightMaterial
    );
    chestLight.position.set(0, 0.1, 0.13);
    chestLight.name = "Body_ChestLight";
    torsoGroup.add(chestLight);

    // Neck (relative to torso group)
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.15),
        materials.limbsMaterial
    );
    neck.position.set(0, 0.4, 0); // Positioned at the top of the torso
    neck.name = "Body_Neck";
    torsoGroup.add(neck);

    // --- Shoulders (relative to torso group) ---
    const shoulderGeometry = new THREE.SphereGeometry(0.1, 16, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    leftShoulder.position.set(-0.3, 0.3, 0);
    leftShoulder.name = "Body_LeftShoulder";
    torsoGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    rightShoulder.position.set(0.3, 0.3, 0);
    rightShoulder.name = "Body_RightShoulder";
    torsoGroup.add(rightShoulder);

    // --- Arms (Simplified hierarchy - added directly to robotGroup) ---
    const armSegmentLength = 0.3;
    const armRadius = 0.06;
    const upperArmGeometry = new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armSegmentLength);
    const lowerArmGeometry = new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.8, armSegmentLength);
    const handGeometry = new THREE.BoxGeometry(0.1, 0.12, 0.1);

    // Left Arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    // Position relative to shoulder: shoulder y = 1.05 (torso) + 0.3 (shoulder offset) = 1.35
    leftUpperArm.position.set(-0.3, 1.35 - armSegmentLength / 2 - armRadius, 0);
    leftUpperArm.name = "LeftArm_Upper";
    robotGroup.add(leftUpperArm);

    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(-0.3, leftUpperArm.position.y - armSegmentLength, 0);
    leftLowerArm.name = "LeftArm_Lower";
    robotGroup.add(leftLowerArm);

    const leftHand = new THREE.Mesh(handGeometry, materials.limbsMaterial);
    leftHand.position.set(-0.3, leftLowerArm.position.y - armSegmentLength / 2 - 0.06, 0);
    leftHand.name = "LeftArm_Hand";
    robotGroup.add(leftHand);

    // Right Arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    // Position relative to shoulder: shoulder y = 1.05 (torso) + 0.3 (shoulder offset) = 1.35
    rightUpperArm.position.set(0.3, 1.35 - armSegmentLength / 2 - armRadius, 0);
    rightUpperArm.name = "RightArm_Upper";
    robotGroup.add(rightUpperArm);

    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(0.3, rightUpperArm.position.y - armSegmentLength, 0);
    rightLowerArm.name = "RightArm_Lower";
    robotGroup.add(rightLowerArm);

    const rightHand = new THREE.Mesh(handGeometry, materials.limbsMaterial);
    rightHand.position.set(0.3, rightLowerArm.position.y - armSegmentLength / 2 - 0.06, 0);
    rightHand.name = "RightArm_Hand";
    robotGroup.add(rightHand);

    // --- Pelvis (relative to torso group) ---
    const pelvis = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.2),
        materials.bodyMaterial
    );
    pelvis.position.y = -0.475; // Bottom of the torso
    pelvis.name = "Body_Pelvis";
    torsoGroup.add(pelvis);

    // --- Hips (relative to pelvis) ---
    const hipGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const leftHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    leftHip.position.set(-0.1, -0.05, 0); // Positioned on the pelvis
    leftHip.name = "Body_LeftHip";
    pelvis.add(leftHip);

    const rightHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    rightHip.position.set(0.1, -0.05, 0); // Positioned on the pelvis
    rightHip.name = "Body_RightHip";
    pelvis.add(rightHip);

    // --- Legs (Simplified hierarchy - added directly to robotGroup) ---
    const legSegmentLength = 0.35;
    const legRadius = 0.07;
    const upperLegGeometry = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legSegmentLength);
    const lowerLegGeometry = new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.8, legSegmentLength);
    const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.22);

    // Calculate hip world positions AFTER adding pelvis to torso, and torso to robotGroup
    const leftHipWorldPos = new THREE.Vector3();
    const rightHipWorldPos = new THREE.Vector3();
    // It's crucial that the hierarchy is set up before calling getWorldPosition
    // Force update matrix world to ensure positions are correct before calculation
    robotGroup.updateMatrixWorld(true);
    leftHip.getWorldPosition(leftHipWorldPos);
    rightHip.getWorldPosition(rightHipWorldPos);

    // Left Leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.set(leftHipWorldPos.x, leftHipWorldPos.y - legSegmentLength / 2 - legRadius, leftHipWorldPos.z);
    leftUpperLeg.name = "LeftLeg_Upper";
    robotGroup.add(leftUpperLeg);

    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(leftUpperLeg.position.x, leftUpperLeg.position.y - legSegmentLength, leftUpperLeg.position.z);
    leftLowerLeg.name = "LeftLeg_Lower";
    robotGroup.add(leftLowerLeg);

    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    leftFoot.position.set(leftLowerLeg.position.x, leftLowerLeg.position.y - legSegmentLength / 2 - 0.04, leftLowerLeg.position.z + 0.05);
    leftFoot.name = "LeftLeg_Foot";
    robotGroup.add(leftFoot);

    // Right Leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(rightHipWorldPos.x, rightHipWorldPos.y - legSegmentLength / 2 - legRadius, rightHipWorldPos.z);
    rightUpperLeg.name = "RightLeg_Upper";
    robotGroup.add(rightUpperLeg);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(rightUpperLeg.position.x, rightUpperLeg.position.y - legSegmentLength, rightUpperLeg.position.z);
    rightLowerLeg.name = "RightLeg_Lower";
    robotGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.set(rightLowerLeg.position.x, rightLowerLeg.position.y - legSegmentLength / 2 - 0.04, rightLowerLeg.position.z + 0.05);
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
    // Calculate bounding box AFTER all parts are positioned
    const tempBox = new THREE.Box3().setFromObject(robotGroup);
    const lowestPointY = tempBox.min.y;

    // Adjust the whole group so the lowest point (likely feet) is slightly above y=0
    robotGroup.position.y = -lowestPointY + 0.01; // Small offset above ground

    // Add the fully constructed robot to the scene
    humanoidScene.add(robotGroup);

    return {
        model: robotGroup,
        materials: materials
    };
}