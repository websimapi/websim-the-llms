import { createCustomCharacter } from './characterGenerator.js';
import { createStandardMaterials } from './llmCharacterRendererUtils.js';
import { applyStoredModelData } from './llmModelStorage.js';

// Helper functions to create and render LLM characters
export function renderLLMCharacter(THREE, llm) {
    if (llm.customCharacterCode) {
        // Create custom character from stored code
        try {
            const customChar = createCustomCharacter(THREE, llm.customCharacterCode);
            
            // Apply stored model data if available
            if (llm.modelData) {
                applyStoredModelData(customChar, llm);
            }
            
            return customChar;
        } catch (error) {
            console.error("Error creating custom character:", error);
            // Fall back to standard model
            return createStandardModel(THREE, llm);
        }
    } else {
        // Create standard model
        const standardModel = createStandardModel(THREE, llm);
        
        // Apply stored model data if available
        if (llm.modelData) {
            applyStoredModelData(standardModel, llm);
        }
        
        return standardModel;
    }
}

// Standard model creation for LLMs without custom character code
function createStandardModel(THREE, llm) {
    // Create a robot model based on the stored properties
    const group = new THREE.Group();
    
    // Get consistent materials based on LLM properties
    const color = llm.color || '#3cb371';
    const style = llm.style || 'modern';
    const materials = createStandardMaterials(color, style);
    
    // Create head
    const head = new THREE.Group();
    const headMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        materials.headMaterial
    );
    headMain.name = "Head_Main";
    head.add(headMain);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);
    leftEye.name = "Head_LeftEye";
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, materials.eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);
    rightEye.name = "Head_RightEye";
    head.add(rightEye);
    
    // Antenna
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2),
        materials.limbsMaterial
    );
    antenna.position.set(0, 0.3, 0);
    antenna.name = "Head_Antenna";
    head.add(antenna);
    
    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        materials.antennaTipMaterial
    );
    antennaTip.position.set(0, 0.4, 0);
    antennaTip.name = "Head_AntennaTip";
    head.add(antennaTip);
    
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    group.add(head);
    
    // Neck
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1),
        materials.limbsMaterial
    );
    neck.position.set(0, 1.6, 0);
    neck.name = "Body_Neck";
    neck.castShadow = true;
    group.add(neck);
    
    // Create body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        materials.bodyMaterial
    );
    body.position.y = 1.2;
    body.name = "Body_Torso";
    body.castShadow = true;
    group.add(body);
    
    // Chest light
    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 32),
        materials.chestLightMaterial
    );
    chestLight.position.set(0, 1.3, 0.16);
    chestLight.rotation.x = Math.PI / 2;
    chestLight.name = "Body_ChestLight";
    group.add(chestLight);
    
    // Create limbs
    
    // Arms
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.4);
    
    // Left arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    leftUpperArm.position.set(-0.4, 1.3, 0);
    leftUpperArm.rotation.z = -Math.PI / 6;  
    leftUpperArm.name = "LeftArm_Upper";
    leftUpperArm.castShadow = true;
    group.add(leftUpperArm);
    
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    leftLowerArm.position.set(-0.55, 1.0, 0);
    leftLowerArm.rotation.z = -Math.PI / 4;  
    leftLowerArm.name = "LeftArm_Lower";
    leftLowerArm.castShadow = true;
    group.add(leftLowerArm);
    
    const leftHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        materials.headMaterial
    );
    leftHand.position.set(-0.75, 0.8, 0);
    leftHand.name = "LeftArm_Hand";
    leftHand.castShadow = true;
    group.add(leftHand);
    
    // Right arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, materials.limbsMaterial);
    rightUpperArm.position.set(0.4, 1.3, 0);
    rightUpperArm.rotation.z = Math.PI / 6;  
    rightUpperArm.name = "RightArm_Upper";
    rightUpperArm.castShadow = true;
    group.add(rightUpperArm);
    
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, materials.limbsMaterial);
    rightLowerArm.position.set(0.55, 1.0, 0);
    rightLowerArm.rotation.z = Math.PI / 4;  
    rightLowerArm.name = "RightArm_Lower";
    rightLowerArm.castShadow = true;
    group.add(rightLowerArm);
    
    const rightHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        materials.headMaterial
    );
    rightHand.position.set(0.75, 0.8, 0);
    rightHand.name = "RightArm_Hand";
    rightHand.castShadow = true;
    group.add(rightHand);
    
    // Hip
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.3),
        materials.bodyMaterial
    );
    hip.position.set(0, 0.8, 0);
    hip.name = "Body_Hip";
    hip.castShadow = true;
    group.add(hip);
    
    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    
    // Left leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    leftUpperLeg.position.set(-0.15, 0.5, 0);
    leftUpperLeg.name = "LeftLeg_Upper";
    leftUpperLeg.castShadow = true;
    group.add(leftUpperLeg);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    leftLowerLeg.position.set(-0.15, 0.1, 0);
    leftLowerLeg.name = "LeftLeg_Lower";
    leftLowerLeg.castShadow = true;
    group.add(leftLowerLeg);
    
    const leftFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        materials.limbsMaterial
    );
    leftFoot.position.set(-0.15, -0.1, 0.05);
    leftFoot.name = "LeftLeg_Foot";
    leftFoot.castShadow = true;
    group.add(leftFoot);
    
    // Right leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, materials.limbsMaterial);
    rightUpperLeg.position.set(0.15, 0.5, 0);
    rightUpperLeg.name = "RightLeg_Upper";
    rightUpperLeg.castShadow = true;
    group.add(rightUpperLeg);
    
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, materials.limbsMaterial);
    rightLowerLeg.position.set(0.15, 0.1, 0);
    rightLowerLeg.name = "RightLeg_Lower";
    rightLowerLeg.castShadow = true;
    group.add(rightLowerLeg);
    
    const rightFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        materials.limbsMaterial
    );
    rightFoot.position.set(0.15, -0.1, 0.05);
    rightFoot.name = "RightLeg_Foot";
    rightFoot.castShadow = true;
    group.add(rightFoot);
    
    return group;
}