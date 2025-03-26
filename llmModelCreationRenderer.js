import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';

export function createRobotModel(humanoidScene, color, style) {
    const materials = createStandardMaterials(color, style);

    const robotGroup = new THREE.Group();
    robotGroup.name = "RobotModel";

    const headGroup = new THREE.Group();
    headGroup.name = "Head";
    headGroup.position.y = 1.6;
    robotGroup.add(headGroup);

    // --- Head Components (Rounded Box, Eyes, Antenna) ---
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

    // --- Torso Components (Rounded Box, Chest Light, Neck, Shoulders) ---
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

    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.15),
        materials.limbsMaterial
    );
    neck.position.set(0, 0.475, 0);
    neck.name = "Body_Neck";
    torsoGroup.add(neck);

    const shoulderGeometry = new THREE.SphereGeometry(0.1, 16, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    leftShoulder.position.set(-0.3, 0.3, 0); 
    leftShoulder.name = "Body_LeftShoulder";
    torsoGroup.add(leftShoulder); 

    const rightShoulder = new THREE.Mesh(shoulderGeometry, materials.limbsMaterial);
    rightShoulder.position.set(0.3, 0.3, 0); 
    rightShoulder.name = "Body_RightShoulder";
    torsoGroup.add(rightShoulder); 


    // --- Arm Components (Using Cylinders and Spheres) ---
    const armSegmentLength = 0.3;
    const armRadius = 0.06;
    const jointRadius = 0.07; 
    const upperArmGeometry = new THREE.CylinderGeometry(armRadius, armRadius, armSegmentLength, 16);
    const lowerArmGeometry = new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.8, armSegmentLength, 16); 
    const jointGeometry = new THREE.SphereGeometry(jointRadius, 12, 8);
    const handGeometry = new THREE.BoxGeometry(0.1, 0.12, 0.1);


    // -- Left Arm --
    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = "LeftArm";
    const leftShoulderWorldPos = new THREE.Vector3();
    leftShoulder.getWorldPosition(leftShoulderWorldPos); 
    leftArmGroup.position.copy(leftShoulderWorldPos); 
    robotGroup.add(leftArmGroup); 

    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.position.y = -armSegmentLength / 2 - jointRadius; 
    leftUpperArm.name = "LeftArm_Upper";
    leftArmGroup.add(leftUpperArm);

    const leftElbow = new THREE.Mesh(jointGeometry, materials.limbsMaterial);
    leftElbow.position.y = leftUpperArm.position.y - armSegmentLength / 2 - jointRadius;
    leftElbow.name = "LeftArm_Elbow";
    leftArmGroup.add(leftElbow);

    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.y = leftElbow.position.y - armSegmentLength / 2 - jointRadius;
    leftLowerArm.name = "LeftArm_Lower";
    leftArmGroup.add(leftLowerArm);

    const leftHand = new THREE.Mesh(handGeometry, materials.limbsMaterial);
    leftHand.position.y = leftLowerArm.position.y - armSegmentLength / 2 - 0.06; 
    leftHand.name = "LeftArm_Hand";
    leftArmGroup.add(leftHand);

    leftArmGroup.rotation.z = Math.PI / 10;


    // -- Right Arm --
    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = "RightArm";
    const rightShoulderWorldPos = new THREE.Vector3();
    rightShoulder.getWorldPosition(rightShoulderWorldPos); 
    rightArmGroup.position.copy(rightShoulderWorldPos); 
    robotGroup.add(rightArmGroup); 

    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.y = -armSegmentLength / 2 - jointRadius; 
    rightUpperArm.name = "RightArm_Upper";
    rightArmGroup.add(rightUpperArm);

    const rightElbow = new THREE.Mesh(jointGeometry, materials.limbsMaterial);
    rightElbow.position.y = rightUpperArm.position.y - armSegmentLength / 2 - jointRadius;
    rightElbow.name = "RightArm_Elbow";
    rightArmGroup.add(rightElbow);

    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.y = rightElbow.position.y - armSegmentLength / 2 - jointRadius;
    rightLowerArm.name = "RightArm_Lower";
    rightArmGroup.add(rightLowerArm);

    const rightHand = new THREE.Mesh(handGeometry, materials.limbsMaterial);
    rightHand.position.y = rightLowerArm.position.y - armSegmentLength / 2 - 0.06; 
    rightHand.name = "RightArm_Hand";
    rightArmGroup.add(rightHand);

    rightArmGroup.rotation.z = -Math.PI / 10;


    // --- Pelvis and Leg Components ---
    const pelvis = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.2),
        materials.bodyMaterial
    );
    pelvis.position.y = -0.475; 
    pelvis.name = "Body_Pelvis";
    torsoGroup.add(pelvis); 

    const hipGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const leftHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    leftHip.position.set(-0.1, -0.05, 0); 
    leftHip.name = "Body_LeftHip"; 
    pelvis.add(leftHip);

    const rightHip = new THREE.Mesh(hipGeometry, materials.limbsMaterial);
    rightHip.position.set(0.1, -0.05, 0); 
    rightHip.name = "Body_RightHip"; 
    pelvis.add(rightHip);

    const legSegmentLength = 0.35;
    const legRadius = 0.07;
    const kneeRadius = 0.08; 
    const upperLegGeometry = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legSegmentLength, 16); 
    const lowerLegGeometry = new THREE.CylinderGeometry(legRadius * 0.85, legRadius * 0.8, legSegmentLength, 16); 
    const kneeGeometry = new THREE.SphereGeometry(kneeRadius, 12, 8);
    const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.22);

    // -- Left Leg --
    const leftLegGroup = new THREE.Group();
    leftLegGroup.name = "LeftLeg";
    const leftHipWorldPos = new THREE.Vector3();
    leftHip.getWorldPosition(leftHipWorldPos); 
    leftLegGroup.position.copy(leftHipWorldPos); 
    robotGroup.add(leftLegGroup); 

    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.y = -legSegmentLength / 2 - kneeRadius; 
    leftUpperLeg.name = "LeftLeg_Upper";
    leftLegGroup.add(leftUpperLeg);

    const leftKnee = new THREE.Mesh(kneeGeometry, materials.limbsMaterial);
    leftKnee.position.y = leftUpperLeg.position.y - legSegmentLength / 2 - kneeRadius; 
    leftKnee.name = "LeftLeg_Knee";
    leftLegGroup.add(leftKnee);

    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.y = leftKnee.position.y - legSegmentLength / 2 - kneeRadius; 
    leftLowerLeg.name = "LeftLeg_Lower";
    leftLegGroup.add(leftLowerLeg);

    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    leftFoot.position.y = leftLowerLeg.position.y - legSegmentLength / 2 - 0.04; 
    leftFoot.position.z = 0.05; 
    leftFoot.name = "LeftLeg_Foot";
    leftLegGroup.add(leftFoot);

    // -- Right Leg --
    const rightLegGroup = new THREE.Group();
    rightLegGroup.name = "RightLeg";
    const rightHipWorldPos = new THREE.Vector3();
    rightHip.getWorldPosition(rightHipWorldPos); 
    rightLegGroup.position.copy(rightHipWorldPos); 
    robotGroup.add(rightLegGroup); 

    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.y = -legSegmentLength / 2 - kneeRadius; 
    rightUpperLeg.name = "RightLeg_Upper";
    rightLegGroup.add(rightUpperLeg);

    const rightKnee = new THREE.Mesh(kneeGeometry, materials.limbsMaterial);
    rightKnee.position.y = rightUpperLeg.position.y - legSegmentLength / 2 - kneeRadius; 
    rightKnee.name = "RightLeg_Knee";
    rightLegGroup.add(rightKnee);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.y = rightKnee.position.y - legSegmentLength / 2 - kneeRadius; 
    rightLowerLeg.name = "RightLeg_Lower";
    rightLegGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.y = rightLowerLeg.position.y - legSegmentLength / 2 - 0.04; 
    rightFoot.position.z = 0.05; 
    rightFoot.name = "RightLeg_Foot";
    rightLegGroup.add(rightFoot);

    // --- Final Adjustments ---
    robotGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    humanoidScene.add(robotGroup); 
    const tempBox = new THREE.Box3();
    const lowestPoint = new THREE.Vector3(0, Infinity, 0);
    robotGroup.traverse(child => {
        if (child.name.includes("Foot")) {
            tempBox.setFromObject(child, true); 
            if (tempBox.min.y < lowestPoint.y) {
                lowestPoint.y = tempBox.min.y;
            }
        }
    });
    robotGroup.position.y = -lowestPoint.y + 0.02; 

    return {
        model: robotGroup,
        materials: materials 
    };
}