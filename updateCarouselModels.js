// A new file to store helper functions for the carousel model updating
import * as THREE from 'three';
import { renderLLMCharacter } from './llmCharacterRenderer.js';

// Update the carousel models based on current index
export function updateCarouselModels(scene, carouselLLMs, currentIndex, llmModels, selectedModelId) {
    // Remove existing models
    llmModels.forEach(model => {
        if (model && model.parent) {
            model.parent.remove(model);
        }
    });
    const newModels = [];
    
    // Determine which LLMs to display (current, previous, next)
    const displayIndices = [];
    displayIndices.push(currentIndex);
    
    if (currentIndex > 0) {
        displayIndices.unshift(currentIndex - 1);
    }
    
    if (currentIndex < carouselLLMs.length - 1) {
        displayIndices.push(currentIndex + 1);
    }
    
    // Create and position models
    displayIndices.forEach((index, i) => {
        const llm = carouselLLMs[index];
        
        const position = calculatePosition(index - currentIndex);
        
        try {
            const model = renderLLMCharacter(THREE, llm);
            
            model.position.set(position.x, position.y, position.z);
            model.rotation.y = position.rotation;
            model.userData = { id: llm.id, index: index };
            
            // Add a selection indicator if this model is selected
            if (llm.id === selectedModelId) {
                addSelectionIndicator(model, scene);
            }
            
            scene.add(model);
            newModels.push(model);
        } catch (error) {
            console.error('Error creating model for LLM:', llm.name, error);
        }
    });
    
    return newModels;
}

// Calculate model position based on offset from center
export function calculatePosition(offset) {
    // Calculate position based on offset from center
    const x = offset * 3; // Horizontal spacing
    const z = Math.abs(offset) * 2; // Push off-center models back
    const y = 0;
    const rotation = -offset * 0.3; // Turn model slightly toward camera
    
    return { x, y, z, rotation };
}

// Add selection indicator to a model
function addSelectionIndicator(model, scene) {
    // Create a ring around the model
    const ringGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3cb371,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Flat on the ground
    ring.position.y = -0.99; // Fixed position just above ground level
    ring.userData.isSelectionRing = true;
    ring.name = "selectionRing";
    
    // Store the model ID with the ring for identification
    ring.userData.modelId = model.userData.id;
    
    // Set position to match the model
    ring.position.x = model.position.x;
    ring.position.z = model.position.z;
    
    // Add to scene
    scene.add(ring);
    
    // Add highlight effects to the model
    const highlight = new THREE.PointLight(0x3cb371, 1, 3);
    highlight.position.set(0, 1, 0);
    highlight.userData.isSelectionHighlight = true;
    highlight.name = "selectionHighlight";
    model.add(highlight);
    
    const bottomLight = new THREE.PointLight(0x3cb371, 0.5, 2);
    bottomLight.position.set(0, -0.5, 0);
    bottomLight.userData.isSelectionHighlight = true;
    bottomLight.name = "bottomHighlight";
    model.add(bottomLight);
    
    // Store references to selection indicators
    model.userData.selectionIndicators = [ring, highlight, bottomLight];
    model.userData.selectionRing = ring;
}