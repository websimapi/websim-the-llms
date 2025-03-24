// New utility file to reduce size of llmCreationInterface.js
import { attributeSystem } from './attributeSystem.js';

// Function to render the attribute grid - moved from llmCreationInterface.js
export function renderAttributeGrid() {
    const gridContainer = document.getElementById('attribute-grid');
    gridContainer.innerHTML = '';
    
    const attributesArray = attributeSystem.getAttributesArray();
    
    attributesArray.forEach(attr => {
        const item = document.createElement('div');
        item.className = 'attribute-item';
        
        const header = document.createElement('div');
        header.className = 'attribute-header';
        
        const name = document.createElement('div');
        name.className = 'attribute-name';
        name.textContent = attr.name;
        
        const controls = document.createElement('div');
        controls.className = 'attribute-controls';
        
        const decBtn = document.createElement('button');
        decBtn.className = 'attribute-button';
        decBtn.textContent = '-';
        decBtn.disabled = attr.value <= 0;
        decBtn.onclick = () => {
            if (attributeSystem.decrementAttribute(attr.name)) {
                renderAttributeGrid();
                updatePointsDisplay();
            }
        };
        
        const value = document.createElement('span');
        value.className = 'attribute-value-text';
        value.textContent = attr.value;
        
        const incBtn = document.createElement('button');
        incBtn.className = 'attribute-button';
        incBtn.textContent = '+';
        incBtn.disabled = attributeSystem.getRemainingPoints() <= 0 || 
                           attr.value >= attributeSystem.maxPointsPerAttribute;
        incBtn.onclick = () => {
            if (attributeSystem.incrementAttribute(attr.name)) {
                renderAttributeGrid();
                updatePointsDisplay();
            }
        };
        
        controls.appendChild(decBtn);
        controls.appendChild(value);
        controls.appendChild(incBtn);
        
        header.appendChild(name);
        header.appendChild(controls);
        
        const valueBar = document.createElement('div');
        valueBar.className = 'attribute-value';
        
        const valueFill = document.createElement('div');
        valueFill.className = 'attribute-fill';
        valueFill.style.width = `${(attr.value / attributeSystem.maxPointsPerAttribute) * 100}%`;
        
        valueBar.appendChild(valueFill);
        
        const description = document.createElement('div');
        description.className = 'attribute-description';
        description.textContent = attr.description;
        
        item.appendChild(header);
        item.appendChild(valueBar);
        item.appendChild(description);
        
        gridContainer.appendChild(item);
    });
}

// Function to update points display - moved from llmCreationInterface.js
export function updatePointsDisplay() {
    const pointsDisplay = document.getElementById('points-remaining');
    const remaining = attributeSystem.getRemainingPoints();
    pointsDisplay.textContent = `${remaining} Points Remaining`;
    
    // Change color based on points remaining
    if (remaining <= 3) {
        pointsDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    } else if (remaining <= 7) {
        pointsDisplay.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
    } else {
        pointsDisplay.style.backgroundColor = 'rgba(60, 179, 113, 0.2)';
    }
}

// Function to reset form - moved from llmCreationInterface.js
export function resetForm() {
    // Reset name with random number
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
    
    // Reset other form values
    document.getElementById('llm-model').selectedIndex = 0;
    document.getElementById('llm-color').value = '#3cb371';
    document.getElementById('llm-style').selectedIndex = 0;
    document.getElementById('llm-custom-prompt').value = '';
    
    // Reset attributes
    attributeSystem.initializeAttributes();
    renderAttributeGrid();
    updatePointsDisplay();
    
    // Signal to llmCreationInterface to reset the model
    const event = new CustomEvent('resetLLMForm');
    document.dispatchEvent(event);
}