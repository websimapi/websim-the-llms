import { createCustomCharacter } from './characterGenerator.js';
import { characterStyleManager } from './characterStyleManager.js';

// Helper functions to create and render LLM characters
export function renderLLMCharacter(THREE, llm) {
    if (llm.customCharacterCode) {
        // Create custom character from stored code
        try {
            const customChar = createCustomCharacter(THREE, llm.customCharacterCode);
            // Apply consistent styling to custom character
            return characterStyleManager.applyConsistentStyling(THREE, customChar, llm);
        } catch (error) {
            console.error("Error creating custom character:", error);
            // Fall back to standard model
            return createStandardModel(THREE, llm);
        }
    } else {
        // Create standard model
        return createStandardModel(THREE, llm);
    }
}

// Standard model creation for LLMs without custom character code
function createStandardModel(THREE, llm) {
    // Create a robot model based on the stored properties
    const group = new THREE.Group();
    
    const color = new THREE.Color(llm.color || 0x3cb371);
    
    // Create head
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.3),
        metalness: 0.7,
        roughness: 0.3
    });
    
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        headMaterial
    );
    head.position.y = 1.8;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);
    leftEye.name = 'left-eye';
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);
    rightEye.name = 'right-eye';
    head.add(rightEye);
    
    // Antenna
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2),
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.2
        })
    );
    antenna.position.set(0, 0.3, 0);
    antenna.name = 'antenna';
    head.add(antenna);
    
    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    antennaTip.position.set(0, 0.4, 0);
    antennaTip.name = 'antenna-tip';
    head.add(antennaTip);
    
    // Neck
    const neckMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1),
        neckMaterial
    );
    neck.position.set(0, 1.6, 0);
    neck.castShadow = true;
    neck.name = 'neck';
    group.add(neck);
    
    // Create body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.8),
        emissive: color.clone().multiplyScalar(0.2),
        metalness: 0.5,
        roughness: 0.5
    });
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        bodyMaterial
    );
    body.position.y = 1.2;
    body.castShadow = true;
    body.name = 'body';
    group.add(body);
    
    // Chest light
    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 32),
        new THREE.MeshBasicMaterial({ 
            color: color.clone().multiplyScalar(1.5) 
        })
    );
    chestLight.position.set(0, 1.3, 0.16);
    chestLight.rotation.x = Math.PI / 2;
    chestLight.name = 'chest-light';
    group.add(chestLight);
    
    // Create limbs
    const limbsMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        emissive: color.clone().multiplyScalar(0.1),
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Arms
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.4);
    
    // Left arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, limbsMaterial);
    leftUpperArm.position.set(-0.4, 1.3, 0);
    leftUpperArm.rotation.z = -Math.PI / 6;  // Fixed rotation direction
    leftUpperArm.castShadow = true;
    leftUpperArm.name = 'left-upper-arm';
    group.add(leftUpperArm);
    
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, limbsMaterial);
    leftLowerArm.position.set(-0.55, 1.0, 0);
    leftLowerArm.rotation.z = -Math.PI / 4;  // Fixed rotation direction
    leftLowerArm.castShadow = true;
    leftLowerArm.name = 'left-lower-arm';
    group.add(leftLowerArm);
    
    const leftHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        headMaterial
    );
    leftHand.position.set(-0.75, 0.8, 0);
    leftHand.castShadow = true;
    leftHand.name = 'left-hand';
    group.add(leftHand);
    
    // Right arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, limbsMaterial);
    rightUpperArm.position.set(0.4, 1.3, 0);
    rightUpperArm.rotation.z = Math.PI / 6;  // Fixed rotation direction
    rightUpperArm.castShadow = true;
    rightUpperArm.name = 'right-upper-arm';
    group.add(rightUpperArm);
    
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, limbsMaterial);
    rightLowerArm.position.set(0.55, 1.0, 0);
    rightLowerArm.rotation.z = Math.PI / 4;  // Fixed rotation direction
    rightLowerArm.castShadow = true;
    rightLowerArm.name = 'right-lower-arm';
    group.add(rightLowerArm);
    
    const rightHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        headMaterial
    );
    rightHand.position.set(0.75, 0.8, 0);
    rightHand.castShadow = true;
    rightHand.name = 'right-hand';
    group.add(rightHand);
    
    // Hip
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.3),
        bodyMaterial
    );
    hip.position.set(0, 0.8, 0);
    hip.castShadow = true;
    hip.name = 'hip';
    group.add(hip);
    
    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    
    // Left leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    leftUpperLeg.position.set(-0.15, 0.5, 0);
    leftUpperLeg.castShadow = true;
    leftUpperLeg.name = 'left-upper-leg';
    group.add(leftUpperLeg);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, limbsMaterial);
    leftLowerLeg.position.set(-0.15, 0.1, 0);
    leftLowerLeg.castShadow = true;
    leftLowerLeg.name = 'left-lower-leg';
    group.add(leftLowerLeg);
    
    const leftFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        limbsMaterial
    );
    leftFoot.position.set(-0.15, -0.1, 0.05);
    leftFoot.castShadow = true;
    leftFoot.name = 'left-foot';
    group.add(leftFoot);
    
    // Right leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    rightUpperLeg.position.set(0.15, 0.5, 0);
    rightUpperLeg.castShadow = true;
    rightUpperLeg.name = 'right-upper-leg';
    group.add(rightUpperLeg);
    
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, limbsMaterial);
    rightLowerLeg.position.set(0.15, 0.1, 0);
    rightLowerLeg.castShadow = true;
    rightLowerLeg.name = 'right-lower-leg';
    group.add(rightLowerLeg);
    
    const rightFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        limbsMaterial
    );
    rightFoot.position.set(0.15, -0.1, 0.05);
    rightFoot.castShadow = true;
    rightFoot.name = 'right-foot';
    group.add(rightFoot);
    
    // Apply consistent styling and fix rotations
    return characterStyleManager.applyConsistentStyling(THREE, group, llm);
}