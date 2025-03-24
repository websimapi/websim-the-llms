// New file to handle UI updates in creation interface
export function updateHumanoidPreviewStyle() {
    if (!window.robotModel) return;
    
    // If we have a custom character, don't update the default robot
    if (window.customCharacter) return;
    
    // Get new color value
    const color = document.getElementById('llm-color').value;
    
    // Remove existing robot model
    if (window.robotModel.parent) {
        window.robotModel.parent.remove(window.robotModel);
    }
    
    // Create a new robot with updated materials - use default style
    const style = 'modern'; // Default style
    
    // Import and use the createRobotModel function
    import('./llmModelCreationRenderer.js').then(module => {
        const result = module.createRobotModel(window.currentHumanoidScene, color, style);
        window.robotModel = result.model;
        
        // Update stored material references if they're being used elsewhere
        if (window.headMaterial) window.headMaterial = result.materials.headMaterial;
        if (window.bodyMaterial) window.bodyMaterial = result.materials.bodyMaterial;
        if (window.limbsMaterial) window.limbsMaterial = result.materials.limbsMaterial;
    });
}

export function resetCreationForm() {
    // Reset name with random number
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
    
    // Reset other form values
    document.getElementById('llm-model').selectedIndex = 0;
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-custom-prompt').value = '';
    
    // Reset attributes
    import('./attributeSystem.js').then(module => {
        module.attributeSystem.initializeAttributes();
        
        // Get renderAttributeGrid and updatePointsDisplay functions from the window
        if (typeof window.renderAttributeGrid === 'function') {
            window.renderAttributeGrid();
        }
        
        if (typeof window.updatePointsDisplay === 'function') {
            window.updatePointsDisplay();
        }
    });
    
    // Reset humanoid
    if (window.customCharacter && window.customCharacter.parent) {
        window.customCharacter.parent.remove(window.customCharacter);
        window.customCharacter = null;
    }
    
    if (!window.robotModel) {
        if (typeof window.createDefaultRobot === 'function') {
            window.createDefaultRobot();
        }
    } else {
        updateHumanoidPreviewStyle();
    }
}