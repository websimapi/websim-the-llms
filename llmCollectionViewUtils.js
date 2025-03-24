import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { characterStyleManager } from './characterStyleManager.js';

// Handles model creation for the collection view
export function createCollectionModels(llms, llmDataManager, createCustomCharacter) {
    const models = [];
    const positions = [];
    const scene = new THREE.Scene();
    
    // Setup floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Create models for each LLM
    llms.forEach((llm, index) => {
        // Position models in a semi-circle
        const numPositions = Math.max(10, llms.length);
        const angle = (Math.PI) * (index / (numPositions - 1)) - Math.PI/2;
        const radius = 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        let llmModel;
        
        if (llm.customCharacterCode) {
            // Create custom character from stored code
            try {
                llmModel = createCustomCharacter(THREE, llm.customCharacterCode);
                // Apply consistent styling
                llmModel = characterStyleManager.applyConsistentStyling(THREE, llmModel, llm);
            } catch (error) {
                console.error("Error creating custom character:", error);
                // Create fallback model
                llmModel = createStandardModel(THREE, llm);
            }
        } else {
            // Create standard model based on stored properties
            llmModel = createStandardModel(THREE, llm);
        }
        
        // Position the model
        llmModel.position.set(x, 0, z);
        llmModel.rotation.y = -angle;
        llmModel.userData = { id: llm.id };
        
        scene.add(llmModel);
        models.push(llmModel);
        positions.push({ x, y: 0, z });
    });
    
    return { models, positions, scene };
}

// Create a standard model for an LLM
function createStandardModel(THREE, llm) {
    // Create a simple robot model based on the LLM properties
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
    
    // Add simple arms 
    const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.07, 0.5),
        limbsMaterial
    );
    leftArm.position.set(-0.4, 1.3, 0);
    leftArm.rotation.z = -Math.PI / 6;  // Corrected rotation direction
    leftArm.name = 'left-upper-arm';
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.07, 0.5),
        limbsMaterial
    );
    rightArm.position.set(0.4, 1.3, 0);
    rightArm.rotation.z = Math.PI / 6;  // Corrected rotation direction
    rightArm.name = 'right-upper-arm';
    group.add(rightArm);
    
    // Hip
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.3),
        bodyMaterial
    );
    hip.position.set(0, 0.8, 0);
    hip.name = 'hip';
    group.add(hip);
    
    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4);
    
    // Left leg
    const leftLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    leftLeg.position.set(-0.15, 0.5, 0);
    leftLeg.name = 'left-upper-leg';
    group.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    rightLeg.position.set(0.15, 0.5, 0);
    rightLeg.name = 'right-upper-leg';
    group.add(rightLeg);
    
    // Apply consistent styling
    return characterStyleManager.applyConsistentStyling(THREE, group, llm);
}