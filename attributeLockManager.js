// Attribute lock management for existing LLMs

// Determine if we're in edit mode
export function isEditMode() {
    const createUI = document.getElementById('create-llm-ui');
    return createUI && createUI.getAttribute('data-edit-mode') === 'true';
}

// Render the attributes with locked status
export function renderLockedAttributes() {
    // Get attribute grid container
    const gridContainer = document.getElementById('attribute-grid');
    if (!gridContainer) return false;
    
    // Add lock status and button to each attribute item
    const attributeItems = gridContainer.querySelectorAll('.attribute-item');
    
    if (isEditMode()) {
        // Create unlock button at the top of the attribute group
        const attributeGroup = document.querySelector('.settings-group:nth-child(3)');
        if (attributeGroup) {
            // Check if we already have the unlock button
            if (!document.getElementById('unlock-attributes-btn')) {
                const titleElement = attributeGroup.querySelector('.settings-group-title');
                
                // Create unlock button
                const unlockButton = document.createElement('button');
                unlockButton.id = 'unlock-attributes-btn';
                unlockButton.textContent = 'Unlock';
                unlockButton.className = 'unlock-attributes-btn';
                unlockButton.style.marginLeft = '10px';
                unlockButton.style.padding = '2px 8px';
                unlockButton.style.fontSize = '0.8rem';
                unlockButton.style.backgroundColor = '#555';
                unlockButton.style.color = 'white';
                unlockButton.style.border = 'none';
                unlockButton.style.borderRadius = '3px';
                unlockButton.style.cursor = 'pointer';
                
                // Add hover effect
                unlockButton.onmouseenter = () => {
                    unlockButton.style.backgroundColor = '#3cb371';
                };
                unlockButton.onmouseleave = () => {
                    unlockButton.style.backgroundColor = '#555';
                };
                
                // Add click handler
                unlockButton.addEventListener('click', () => {
                    unlockAllAttributes();
                    // Toggle button text
                    if (unlockButton.textContent === 'Unlock') {
                        unlockButton.textContent = 'Lock';
                        unlockButton.style.backgroundColor = '#ff4444';
                    } else {
                        unlockButton.textContent = 'Unlock';
                        unlockButton.style.backgroundColor = '#555';
                    }
                });
                
                // Add button to title element
                titleElement.appendChild(unlockButton);
            }
        }
        
        // Apply locked state to attribute controls
        attributeItems.forEach(item => {
            const controls = item.querySelector('.attribute-controls');
            const buttons = controls.querySelectorAll('.attribute-button');
            
            // Disable buttons initially in edit mode
            buttons.forEach(btn => {
                btn.disabled = true;
                
                // Apply visual locked state
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        });
        
        return true;
    }
    
    return false;
}

// Unlock all attributes
export function unlockAllAttributes() {
    const attributeItems = document.querySelectorAll('.attribute-item');
    const isLocked = attributeItems[0]?.querySelector('.attribute-button')?.disabled;
    
    attributeItems.forEach(item => {
        const controls = item.querySelector('.attribute-controls');
        const buttons = controls.querySelectorAll('.attribute-button');
        const decrementBtn = buttons[0];
        const incrementBtn = buttons[1];
        
        // Toggle button state
        buttons.forEach(btn => {
            btn.disabled = !isLocked;
            btn.style.opacity = isLocked ? '1' : '0.5';
            btn.style.cursor = isLocked ? 'pointer' : 'not-allowed';
        });
        
        // Re-evaluate which buttons should be disabled based on attribute values
        if (isLocked) {
            // Get attribute name from the item
            const nameElement = item.querySelector('.attribute-name');
            const attrName = nameElement.textContent;
            
            // Get attribute value
            const valueElement = controls.querySelector('.attribute-value-text');
            const attrValue = parseInt(valueElement.textContent);
            
            // Import attributeSystem to access the constraints
            import('./attributeSystem.js').then(module => {
                const { attributeSystem } = module;
                
                // Set decrement button disabled state
                decrementBtn.disabled = attrValue <= 0;
                
                // Set increment button disabled state
                incrementBtn.disabled = attributeSystem.getRemainingPoints() <= 0 || 
                                       attrValue >= attributeSystem.maxPointsPerAttribute;
            });
        }
    });
}