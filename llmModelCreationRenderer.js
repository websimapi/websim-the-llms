import * as THREE from 'three';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';

// Create a more detailed robot model for the LLM creation UI
export function createRobotModel(humanoidScene, color, style) {
    // Get standardized materials based on color and style
    const materials = createStandardMaterials(color, style);

    // Create a main group for the robot
    const robotGroup = new THREE.Group();
    robotGroup.name = "DefaultRobot"; // Name the main group

    // --- Head Section ---
    const head = new THREE.Group();
    head.name = "Head"; // Name the head group

    const headMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        materials.headMaterial
    );
    headMain.name = "Head_Main"; // Specific name for the main head part
    headMain.castShadow = true;
    head.add(headMain);

    // Eyes (simple spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.21); // Slightly forward
    leftEye.name = "Head_LeftEye";
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.21); // Slightly forward
    rightEye.name = "Head_RightEye";
    head.add(rightEye);

    // Antenna (cylinder + sphere tip)
    const antennaBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8),
        materials.limbsMaterial // Use limbs material for consistency
    );
    antennaBase.position.set(0, 0.3, 0); // Position base on top of head
    antennaBase.name = "Head_AntennaBase";
    antennaBase.castShadow = true;
    head.add(antennaBase);

    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        materials.antennaTipMaterial // Specific material for the tip
    );
    antennaTip.position.set(0, 0.4, 0); // Position tip above base
    antennaTip.name = "Head_AntennaTip";
    head.add(antennaTip);

    head.position.set(0, 1.8, 0); // Position the head group
    robotGroup.add(head);

    // --- Body Section ---
    // Neck joint (simple cylinder)
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
        materials.limbsMaterial // Darker, more metallic look for joints
    );
    neck.position.set(0, 1.6, 0); // Between head and torso
    neck.name = "Body_Neck";
    neck.castShadow = true;
    robotGroup.add(neck);

    // Torso (main body box)
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        materials.bodyMaterial // Slightly different shade from head
    );
    torso.position.set(0, 1.2, 0); // Position below neck
    torso.name = "Body_Torso";
    torso.castShadow = true;
    robotGroup.add(torso);

    // Chest light (flat circle)
    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 32),
        materials.chestLightMaterial // Bright, emissive material
    );
    chestLight.position.set(0, 1.3, 0.16); // On the front surface of torso
    chestLight.name = "Body_ChestLight";
    robotGroup.add(chestLight);

    // Hip joint (box connecting torso to legs)
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.3), // Wider than legs, narrower than torso
        materials.bodyMaterial // Match torso or use limbs material
    );
    hip.position.set(0, 0.7, 0); // Below torso
    hip.name = "Body_Hip";
    hip.castShadow = true;
    robotGroup.add(hip);

    // --- Arm Section ---
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4); // Tapered cylinder
    const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.4); // Tapered cylinder
    const handGeometry = new THREE.SphereGeometry(0.08, 16, 16); // Simple sphere hand

    // Left Arm
    const leftShoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), materials.limbsMaterial);
    leftShoulderJoint.position.set(-0.35, 1.5, 0);
    leftShoulderJoint.name = "LeftArm_ShoulderJoint";
    robotGroup.add(leftShoulderJoint);

    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.position.set(0, -0.25, 0); // Position relative to shoulder joint
    leftUpperArm.name = "LeftArm_Upper";
    leftUpperArm.castShadow = true;
    leftShoulderJoint.add(leftUpperArm); // Attach to joint
    leftShoulderJoint.rotation.z = -Math.PI / 8; // Slight outward angle

    const leftElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), materials.limbsMaterial);
    leftElbowJoint.position.set(0, -0.25, 0); // Position relative to upper arm end
    leftElbowJoint.name = "LeftArm_ElbowJoint";
    leftUpperArm.add(leftElbowJoint); // Attach to upper arm

    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(0, -0.25, 0); // Position relative to elbow joint
    leftLowerArm.name = "LeftArm_Lower";
    leftLowerArm.castShadow = true;
    leftElbowJoint.add(leftLowerArm); // Attach to elbow joint
    leftElbowJoint.rotation.z = -Math.PI / 6; // Bend elbow slightly

    const leftHand = new THREE.Mesh(handGeometry, materials.headMaterial); // Use head material for contrast
    leftHand.position.set(0, -0.25, 0); // Position relative to lower arm end
    leftHand.name = "LeftArm_Hand";
    leftHand.castShadow = true;
    leftLowerArm.add(leftHand); // Attach to lower arm

    // Right Arm (similar structure to left arm)
    const rightShoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), materials.limbsMaterial);
    rightShoulderJoint.position.set(0.35, 1.5, 0);
    rightShoulderJoint.name = "RightArm_ShoulderJoint";
    robotGroup.add(rightShoulderJoint);

    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.set(0, -0.25, 0);
    rightUpperArm.name = "RightArm_Upper";
    rightUpperArm.castShadow = true;
    rightShoulderJoint.add(rightUpperArm);
    rightShoulderJoint.rotation.z = Math.PI / 8;

    const rightElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), materials.limbsMaterial);
    rightElbowJoint.position.set(0, -0.25, 0);
    rightElbowJoint.name = "RightArm_ElbowJoint";
    rightUpperArm.add(rightElbowJoint);

    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(0, -0.25, 0);
    rightLowerArm.name = "RightArm_Lower";
    rightLowerArm.castShadow = true;
    rightElbowJoint.add(rightLowerArm);
    rightElbowJoint.rotation.z = Math.PI / 6;

    const rightHand = new THREE.Mesh(handGeometry, materials.headMaterial);
    rightHand.position.set(0, -0.25, 0);
    rightHand.name = "RightArm_Hand";
    rightHand.castShadow = true;
    rightLowerArm.add(rightHand);

    // --- Leg Section ---
    const upperLegGeometry = new THREE.CylinderGeometry(0.1, 0.09, 0.5); // Wider, tapered
    const lowerLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.5); // Tapered
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3); // Simple block foot

    // Left Leg
    const leftHipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), materials.limbsMaterial);
    leftHipJoint.position.set(-0.15, 0.6, 0); // Below hip block
    leftHipJoint.name = "LeftLeg_HipJoint";
    robotGroup.add(leftHipJoint);

    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.set(0, -0.3, 0); // Relative to hip joint
    leftUpperLeg.name = "LeftLeg_Upper";
    leftUpperLeg.castShadow = true;
    leftHipJoint.add(leftUpperLeg);

    const leftKneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), materials.limbsMaterial);
    leftKneeJoint.position.set(0, -0.3, 0); // Relative to upper leg end
    leftKneeJoint.name = "LeftLeg_KneeJoint";
    leftUpperLeg.add(leftKneeJoint);

    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(0, -0.3, 0); // Relative to knee joint
    leftLowerLeg.name = "LeftLeg_Lower";
    leftLowerLeg.castShadow = true;
    leftKneeJoint.add(leftLowerLeg);

    const leftFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    leftFoot.position.set(0, -0.3, 0.05); // Relative to lower leg end, slightly forward
    leftFoot.name = "LeftLeg_Foot";
    leftFoot.castShadow = true;
    leftLowerLeg.add(leftFoot);

    // Right Leg (similar structure)
    const rightHipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), materials.limbsMaterial);
    rightHipJoint.position.set(0.15, 0.6, 0);
    rightHipJoint.name = "RightLeg_HipJoint";
    robotGroup.add(rightHipJoint);

    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(0, -0.3, 0);
    rightUpperLeg.name = "RightLeg_Upper";
    rightUpperLeg.castShadow = true;
    rightHipJoint.add(rightUpperLeg);

    const rightKneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), materials.limbsMaterial);
    rightKneeJoint.position.set(0, -0.3, 0);
    rightKneeJoint.name = "RightLeg_KneeJoint";
    rightUpperLeg.add(rightKneeJoint);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(0, -0.3, 0);
    rightLowerLeg.name = "RightLeg_Lower";
    rightLowerLeg.castShadow = true;
    rightKneeJoint.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(footGeometry, materials.limbsMaterial);
    rightFoot.position.set(0, -0.3, 0.05);
    rightFoot.name = "RightLeg_Foot";
    rightFoot.castShadow = true;
    rightLowerLeg.add(rightFoot);

    // Add the complete robot group to the scene passed as argument
    humanoidScene.add(robotGroup);

    // Return the model and its materials for reference
    return {
        model: robotGroup,
        materials: materials
    };
}