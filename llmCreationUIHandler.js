// New file to handle UI interactions for the Create LLM interface
import { createRobotModel } from './llmModelCreationRenderer.js';
import { createCustomCharacter } from './characterGenerator.js';
import { attributeSystem } from './attributeSystem.js';
import { generateCharacterCode } from './characterGenerator.js';

// Update model preview when color changes
export function updateSelectedMeshColor(selectedMesh, event) {
    const color = event.target.value;
    
    if (selectedMesh && selectedMesh.material) {
        // Update just the selected mesh's color
        selectedMesh.material.color.set(color);
        
        // Also update emissive with a toned down version of the color
        if (selectedMesh.material.emissive) {
            // Store the highlight for selection state
            if (!selectedMesh.userData.originalEmissive) {
                selectedMesh.userData.originalEmissive = new THREE.Color(color).multiplyScalar(0.2);
            } else {
                selectedMesh.userData.originalEmissive.set(new THREE.Color(color).multiplyScalar(0.2));
            }
            
            // Keep the highlight if it's selected
            selectedMesh.material.emissive.set(0x333333);
        }
    } else {
        // If no mesh is selected, update the entire model
        const humanoidScene = window.currentHumanoidScene;
        if (!humanoidScene) return;
        
        // Get current custom character or robot model
        const customChar = window.customCharacter;
        const robotModel = window.robotModel;
        
        // If we have a custom character, don't update the default robot
        if (customChar) return;
        
        if (robotModel && robotModel.parent) {
            // Remove existing robot model
            robotModel.parent.remove(robotModel);
            
            // Create a new robot with updated color
            const result = createRobotModel(humanoidScene, color, 'modern');
            window.robotModel = result.model;
        }
    }
}

// Reset the form to default values
export function resetCreationForm() {
    // Reset name with random number
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
    
    // Reset other form values
    document.getElementById('llm-model').selectedIndex = 0;
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-custom-prompt').value = '';
    
    // Reset attributes
    attributeSystem.initializeAttributes();
    
    // Reset humanoid
    const humanoidScene = window.currentHumanoidScene;
    if (!humanoidScene) return;
    
    const customChar = window.customCharacter;
    if (customChar && customChar.parent) {
        customChar.parent.remove(customChar);
        window.customCharacter = null;
    }
    
    const robotModel = window.robotModel;
    if (!robotModel) {
        // Create default robot if it doesn't exist
        const result = createRobotModel(humanoidScene, '#3cb371', 'modern');
        window.robotModel = result.model;
    } else {
        // Update existing robot
        if (robotModel.parent) {
            robotModel.parent.remove(robotModel);
        }
        const result = createRobotModel(humanoidScene, '#3cb371', 'modern');
        window.robotModel = result.model;
    }
    
    // Update UI
    document.getElementById('generation-status').textContent = '';
    delete document.getElementById('generation-status').dataset.generatedCode;
    document.querySelectorAll('.attribute-fill').forEach(fill => {
        fill.style.width = '0%';
    });
    document.getElementById('points-remaining').textContent = '15 Points Remaining';
}

// Handle character generation button click
export async function handleGenerateCharacter(generatingCharacter) {
    if (generatingCharacter) return false;
    
    const promptInput = document.getElementById('llm-custom-prompt');
    const userPrompt = promptInput.value.trim();
    const statusElement = document.getElementById('generation-status');
    const generateBtn = document.getElementById('generate-character-btn');
    
    if (userPrompt.length < 5) {
        statusElement.textContent = "Please enter a more detailed description";
        return false;
    }
    
    statusElement.textContent = "Generating character...";
    generateBtn.disabled = true;
    
    try {
        const generatedCode = await generateCharacterCode(userPrompt);
        
        // Store the generated code for later use
        statusElement.dataset.generatedCode = generatedCode;
        
        // Get the scene
        const humanoidScene = window.currentHumanoidScene;
        if (!humanoidScene) {
            throw new Error("Humanoid scene not initialized");
        }
        
        // Remove previous custom character if it exists
        if (window.customCharacter && window.customCharacter.parent) {
            window.customCharacter.parent.remove(window.customCharacter);
        }
        
        // Remove default robot if it exists
        if (window.robotModel && window.robotModel.parent) {
            window.robotModel.parent.remove(window.robotModel);
            window.robotModel = null;
        }
        
        // Create the new character
        window.customCharacter = createCustomCharacter(THREE, generatedCode);
        humanoidScene.add(window.customCharacter);
        
        statusElement.textContent = "Character generated successfully!";
        return true;
    } catch (error) {
        console.error("Failed to generate character:", error);
        statusElement.textContent = "Failed to generate character. Try again with a different description.";
        return false;
    } finally {
        generateBtn.disabled = false;
    }
}