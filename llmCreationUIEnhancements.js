// New file with UI enhancement functions for the LLM creation interface
export function enhanceCreationUIInteraction() {
    // Update color picker to reflect selection
    updateColorPickerReflection();
    
    // Add hover effects for mesh selection
    addMeshHoverEffects();
    
    // Add helpful tooltips
    addCreationInterfaceTooltips();
}

function updateColorPickerReflection() {
    // Get the color picker
    const colorPicker = document.getElementById('llm-color');
    const colorPickerLabel = document.querySelector('label[for="llm-color"]');
    const colorPickerContainer = colorPicker.parentElement;
    
    // Create a visual indicator beside the color picker
    const selectedPartIndicator = document.createElement('div');
    selectedPartIndicator.id = 'selected-part-indicator';
    selectedPartIndicator.innerHTML = 'No part selected';
    selectedPartIndicator.style.marginLeft = '10px';
    selectedPartIndicator.style.padding = '5px 10px';
    selectedPartIndicator.style.backgroundColor = '#333';
    selectedPartIndicator.style.borderRadius = '4px';
    selectedPartIndicator.style.display = 'inline-block';
    
    // Insert the indicator after the color picker
    colorPicker.parentNode.insertBefore(selectedPartIndicator, colorPicker.nextSibling);
    
    // Create a wrapper for the color picker with label
    const colorDisplay = document.createElement('div');
    colorDisplay.id = 'color-display';
    colorDisplay.style.width = '30px';
    colorDisplay.style.height = '30px';
    colorDisplay.style.backgroundColor = colorPicker.value;
    colorDisplay.style.border = '2px solid #555';
    colorDisplay.style.borderRadius = '50%';
    colorDisplay.style.display = 'inline-block';
    colorDisplay.style.verticalAlign = 'middle';
    colorDisplay.style.marginRight = '10px';
    colorDisplay.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
    
    // Insert color display before the color picker
    colorPicker.parentNode.insertBefore(colorDisplay, colorPicker);
    
    // Update the color display when the color picker changes
    colorPicker.addEventListener('input', () => {
        colorDisplay.style.backgroundColor = colorPicker.value;
    });
}

function addMeshHoverEffects() {
    const viewportElement = document.querySelector('.humanoid-viewport');
    if (!viewportElement) return;
    
    // Add a cursor style to indicate interactive elements
    viewportElement.style.cursor = 'pointer';
    
    // Add info text at bottom of viewport
    const viewportInfo = document.createElement('div');
    viewportInfo.id = 'viewport-info';
    viewportInfo.style.position = 'absolute';
    viewportInfo.style.bottom = '10px';
    viewportInfo.style.left = '0';
    viewportInfo.style.width = '100%';
    viewportInfo.style.textAlign = 'center';
    viewportInfo.style.color = '#fff';
    viewportInfo.style.padding = '5px';
    viewportInfo.style.background = 'rgba(0,0,0,0.5)';
    viewportInfo.textContent = 'Click on any part to select it and change its color';
    
    viewportElement.appendChild(viewportInfo);
}

function addCreationInterfaceTooltips() {
    // Add tooltips to important elements
    const tooltips = [
        { id: 'generate-character-btn', text: 'Generate a custom 3D character based on your description' },
        { id: 'llm-custom-prompt', text: 'Describe your character in detail for better results' },
        { id: 'llm-style', text: 'Change the overall appearance style of your character' }
    ];
    
    tooltips.forEach(tooltip => {
        const element = document.getElementById(tooltip.id);
        if (!element) return;
        
        element.title = tooltip.text;
    });
}