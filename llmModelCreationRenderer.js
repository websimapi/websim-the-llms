import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { applyStoredModelData } from './llmModelStorage.js';

// This function is moved from llmCreationInterface.js to reduce file size
export function createRobotModel(humanoidScene, color, style) {
    // Get standardized materials
    const materials = createStandardMaterials(color, style);
    
    // Create robot parts
    const robotGroup = new THREE.Group();
    
    // Head
    const head = new THREE.Group();
    const headMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        materials.headMaterial
    );
    head.add(headMain);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);
    head.add(rightEye);
    
    // Antenna
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2),
        materials.limbsMaterial
    );
    antenna.position.set(0, 0.3, 0);
    head.add(antenna);
    
    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        materials.antennaTipMaterial
    );
    antennaTip.position.set(0, 0.4, 0);
    head.add(antennaTip);
    
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    robotGroup.add(head);
    
    // Neck
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1),
        materials.limbsMaterial
    );
    neck.position.set(0, 1.6, 0);
    neck.castShadow = true;
    robotGroup.add(neck);
    
    // Torso
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        materials.bodyMaterial
    );
    torso.position.set(0, 1.2, 0);
    torso.castShadow = true;
    robotGroup.add(torso);
    
    // Chest light
    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 32),
        materials.chestLightMaterial
    );
    chestLight.position.set(0, 1.3, 0.16);
    chestLight.rotation.x = Math.PI / 2;
    robotGroup.add(chestLight);
    
    // Arms
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.4);
    
    // Left arm - fixed rotation
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.position.set(-0.4, 1.3, 0);
    leftUpperArm.rotation.z = Math.PI / 6; 
    leftUpperArm.castShadow = true;
    robotGroup.add(leftUpperArm);
    
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(-0.55, 1.0, 0);
    leftLowerArm.rotation.z = Math.PI / 4;  
    leftLowerArm.castShadow = true;
    robotGroup.add(leftLowerArm);
    
    const leftHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        materials.headMaterial
    );
    leftHand.position.set(-0.75, 0.8, 0);
    leftHand.castShadow = true;
    robotGroup.add(leftHand);
    
    // Right arm - fixed rotation
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.set(0.4, 1.3, 0);
    rightUpperArm.rotation.z = -Math.PI / 6; 
    rightUpperArm.castShadow = true;
    robotGroup.add(rightUpperArm);
    
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(0.55, 1.0, 0);
    rightLowerArm.rotation.z = -Math.PI / 4; 
    rightLowerArm.castShadow = true;
    robotGroup.add(rightLowerArm);
    
    const rightHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        materials.headMaterial
    );
    rightHand.position.set(0.75, 0.8, 0);
    rightHand.castShadow = true;
    robotGroup.add(rightHand);
    
    // Hip
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.3),
        materials.bodyMaterial
    );
    hip.position.set(0, 0.8, 0);
    hip.castShadow = true;
    robotGroup.add(hip);
    
    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    
    // Left leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.set(-0.15, 0.5, 0);
    leftUpperLeg.castShadow = true;
    robotGroup.add(leftUpperLeg);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(-0.15, 0.1, 0);
    leftLowerLeg.castShadow = true;
    robotGroup.add(leftLowerLeg);
    
    const leftFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        materials.limbsMaterial
    );
    leftFoot.position.set(-0.15, -0.1, 0.05);
    leftFoot.castShadow = true;
    robotGroup.add(leftFoot);
    
    // Right leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(0.15, 0.5, 0);
    rightUpperLeg.castShadow = true;
    robotGroup.add(rightUpperLeg);
    
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(0.15, 0.1, 0);
    rightLowerLeg.castShadow = true;
    robotGroup.add(rightLowerLeg);
    
    const rightFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        materials.limbsMaterial
    );
    rightFoot.position.set(0.15, -0.1, 0.05);
    rightFoot.castShadow = true;
    robotGroup.add(rightFoot);
    
    // Add robot to scene
    humanoidScene.add(robotGroup);
    
    return {
        model: robotGroup,
        materials: materials
    };
}
