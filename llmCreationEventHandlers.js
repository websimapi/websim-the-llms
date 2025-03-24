// New file to handle event listeners and further reduce size of llmCreationInterface.js
import { generateCharacterCode, createCustomCharacter } from './characterGenerator.js';
import { updateHumanoidPreview } from './llmCreationInterface.js';

// Character generation handler - moved from llmCreationInterface.js
export async function handleGenerateCharacter() {
    if (window.generatingCharacter) return;
    
    const promptInput = document.getElementById('llm-custom-prompt');
    const userPrompt = promptInput.value.trim();
    const statusElement = document.getElementById('generation-status');
    const generateBtn = document.getElementById('generate-character-btn');
    
    if (userPrompt.length < 5) {
        statusElement.textContent = "Please enter a more detailed description";
        return;
    }
    
    window.generatingCharacter = true;
    statusElement.textContent = "Generating character...";
    generateBtn.disabled = true;
    
    try {
        const generatedCode = await generateCharacterCode(userPrompt);
        
        // Store the generated code for later use
        statusElement.dataset.generatedCode = generatedCode;
        
        // Dispatch event to update the model
        const event = new CustomEvent('characterGenerated', { 
            detail: { code: generatedCode }
        });
        document.dispatchEvent(event);
        
        statusElement.textContent = "Character generated successfully!";
    } catch (error) {
        console.error("Failed to generate character:", error);
        statusElement.textContent = "Failed to generate character. Try again with a different description.";
    } finally {
        window.generatingCharacter = false;
        generateBtn.disabled = false;
    }
}

// Mesh selection handler - moved from llmCreationInterface.js
export function handleMeshSelection(event) {
    const viewport = document.querySelector('.humanoid-viewport');
    const rect = viewport.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouse = {
        x: ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1
    };
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, window.humanoidCamera);
    
    // Get objects to test for intersection
    const meshes = [];
    if (window.robotModel) {
        window.robotModel.traverse(child => {
            if (child.isMesh) meshes.push(child);
        });
    }
    if (window.customCharacter) {
        window.customCharacter.traverse(child => {
            if (child.isMesh) meshes.push(child);
        });
    }
    
    // Find intersections
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
        // Unhighlight previous selection
        if (window.selectedMesh && window.selectedMesh.userData.originalEmissive) {
            window.selectedMesh.material.emissive.set(window.selectedMesh.userData.originalEmissive);
            delete window.selectedMesh.userData.originalEmissive;
        }
        
        // Select the new mesh
        window.selectedMesh = intersects[0].object;
        
        // Store original emissive color and highlight the selection
        if (!window.selectedMesh.userData.originalEmissive && window.selectedMesh.material.emissive) {
            window.selectedMesh.userData.originalEmissive = window.selectedMesh.material.emissive.clone();
            window.selectedMesh.material.emissive.set(0x333333);
        }
        
        // Update color picker to match the selected mesh's color
        if (window.selectedMesh.material.color) {
            const hexColor = '#' + window.selectedMesh.material.color.getHexString();
            document.getElementById('llm-color').value = hexColor;
        }
    } else {
        // Unhighlight if clicked elsewhere
        if (window.selectedMesh && window.selectedMesh.userData.originalEmissive) {
            window.selectedMesh.material.emissive.set(window.selectedMesh.userData.originalEmissive);
            delete window.selectedMesh.userData.originalEmissive;
        }
        window.selectedMesh = null;
    }
}

// Update selected mesh color handler - moved from llmCreationInterface.js
export function updateSelectedMeshColor() {
    const color = document.getElementById('llm-color').value;
    
    if (window.selectedMesh && window.selectedMesh.material) {
        // Update just the selected mesh's color
        window.selectedMesh.material.color.set(color);
        
        // Also update emissive with a toned down version of the color
        if (window.selectedMesh.material.emissive) {
            // Store the highlight for selection state
            if (!window.selectedMesh.userData.originalEmissive) {
                window.selectedMesh.userData.originalEmissive = new THREE.Color(color).multiplyScalar(0.2);
            } else {
                window.selectedMesh.userData.originalEmissive.set(new THREE.Color(color).multiplyScalar(0.2));
            }
            
            // Keep the highlight if it's selected
            window.selectedMesh.material.emissive.set(0x333333);
        }
    } else {
        // If no mesh is selected, fall back to the original behavior
        updateHumanoidPreview();
    }
}