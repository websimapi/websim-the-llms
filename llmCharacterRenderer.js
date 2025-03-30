import { createCustomCharacter } from './characterGenerator.js';
import { createRobotModel } from './llmModelCreationRenderer.js';
import { applyStoredModelData } from './llmModelStorage.js';
import { prepareModelForIndividualColoring } from './llmMeshColorManager.js';

// Helper functions to create and render LLM characters
export function renderLLMCharacter(THREE, llm) {
    let model;
    if (llm.customCharacterCode) {
        // Create custom character from stored code
        try {
            model = createCustomCharacter(THREE, llm.customCharacterCode);
        } catch (error) {
            console.error("Error creating custom character:", error);
            // Fall back to standard model - using the detailed one now
            model = createStandardModel(THREE, llm);
        }
    } else {
        // Create standard model - using the detailed one now
        model = createStandardModel(THREE, llm);
    }

    // Prepare model for coloring/manipulation BEFORE applying stored data
    // This ensures meshes have unique materials if needed by applyStoredModelData
    prepareModelForIndividualColoring(model);

    // Apply stored model data if available AFTER model creation and preparation
    if (llm.modelData) {
        applyStoredModelData(model, llm);
    }

    // Add brain icon above head for LLMs placed in plots
    if (llm.placedInPlot) {
        addBrainIconToLLM(THREE, model);
    }

    return model;
}

// Standard model creation for LLMs without custom character code
function createStandardModel(THREE, llm) {
    // Create a robot model based on the stored properties
    const tempScene = new THREE.Scene();
    const color = llm.color || '#3cb371';
    const style = llm.style || 'modern';

    // Call the detailed robot model creation function
    const { model, materials } = createRobotModel(null, color, style);

    // We just need the model group itself
    return model;
}

// Function to add a brain icon above the LLM's head
function addBrainIconToLLM(THREE, model) {
    // Create canvas for the brain icon
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw brain icon - simplified brain shape
    ctx.fillStyle = '#3cb371'; // Green for healthy
    ctx.strokeStyle = '#2a8c5a';
    ctx.lineWidth = 2;
    
    // Draw brain outline
    ctx.beginPath();
    // Main brain shape
    ctx.ellipse(32, 32, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw brain details
    ctx.strokeStyle = '#2a8c5a';
    ctx.beginPath();
    // Center line
    ctx.moveTo(32, 12);
    ctx.lineTo(32, 52);
    // Left hemisphere curves
    ctx.moveTo(32, 17);
    ctx.bezierCurveTo(22, 17, 15, 22, 15, 32);
    ctx.moveTo(32, 32);
    ctx.bezierCurveTo(22, 32, 15, 42, 15, 47);
    // Right hemisphere curves
    ctx.moveTo(32, 17);
    ctx.bezierCurveTo(42, 17, 49, 22, 49, 32);
    ctx.moveTo(32, 32);
    ctx.bezierCurveTo(42, 32, 49, 42, 49, 47);
    ctx.stroke();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create a sprite using the texture
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 1);
    
    // Calculate position above head
    let headPosition = new THREE.Vector3(0, 2.2, 0); // Default position
    
    // Try to find the head for better positioning
    model.traverse(child => {
        if (child.isMesh && child.name && 
            (child.name.includes('Head') || child.name.toLowerCase().includes('head'))) {
            // If we find a head part, calculate its highest point
            child.geometry.computeBoundingBox();
            const box = child.geometry.boundingBox;
            const headTop = box.max.y;
            
            // Get world position of the head part
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            
            // Set the icon position to be above the head
            headPosition = new THREE.Vector3(
                0, // Keep x centered
                worldPos.y + headTop + 0.3, // Place above head with a small offset
                0  // Keep z centered
            );
            
            // Only use the first head part found
            return;
        }
    });
    
    // Position the sprite
    sprite.position.copy(headPosition);
    sprite.name = 'brain-status-icon';
    
    // Add to model
    model.add(sprite);
}