// Model type selector functionality
export function setupModelTypeSelector() {
    // Use the existing HTML structure created during preloading
    const selector = document.querySelector('.model-type-selector');
    if (!selector) {
        // Create it if it doesn't exist yet
        createModelTypeSelectorHTML();
    } else {
        // Just make sure it's visible
        selector.classList.remove('loading');
    }
    
    // Get references to the elements
    const selectorDisplay = document.querySelector('.model-type-display');
    const dropdown = document.querySelector('.model-type-dropdown');
    const selectInput = document.getElementById('llm-model');
    
    if (!selectorDisplay || !dropdown || !selectInput) {
        console.error("Model type selector elements not found");
        return;
    }
    
    // Define model types with icons
    const modelTypes = [
        {
            value: 'assistant',
            name: 'Assistant',
            icon: `<svg viewBox="0 0 24 24"><path d="M19 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4l3 3 3-3h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-5.12 10.88L12 17l-1.88-4.12L6 11l4.12-1.88L12 5l1.88 4.12L18 11l-4.12 1.88z"/></svg>`
        },
        {
            value: 'creator',
            name: 'Creator',
            icon: `<svg viewBox="0 0 24 24"><path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0 1 12 22zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 0 0-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5 2.5 0 0 1 2.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z"/><circle cx="6.5" cy="11.5" r="1.5"/><circle cx="9.5" cy="7.5" r="1.5"/><circle cx="14.5" cy="7.5" r="1.5"/><circle cx="17.5" cy="11.5" r="1.5"/></svg>`
        },
        {
            value: 'researcher',
            name: 'Researcher',
            icon: `<svg viewBox="0 0 24 24"><path d="M9.5 16c-0.3 0-0.5-0.2-0.5-0.5v-7c0-0.3 0.2-0.5 0.5-0.5s0.5 0.2 0.5 0.5v7c0 0.3-0.2 0.5-0.5 0.5z"/><path d="M12.5 16c-0.3 0-0.5-0.2-0.5-0.5v-7c0-0.3 0.2-0.5 0.5-0.5s0.5 0.2 0.5 0.5v7c0 0.3-0.2 0.5-0.5 0.5z"/><path d="M15.5 16c-0.3 0-0.5-0.2-0.5-0.5v-7c0-0.3 0.2-0.5 0.5-0.5s0.5 0.2 0.5 0.5v7c0 0.3-0.2 0.5-0.5 0.5z"/><path d="M19 4h-4V3c0-0.6-0.4-1-1-1h-4c-0.6 0-1 0.4-1 1v1H5c-0.6 0-1 0.4-1 1v1h16V5c0-0.6-0.4-1-1-1zM11 3h2v1h-2V3z"/><path d="M5 20c0 1.1 0.9 2 2 2h10c1.1 0 2-0.9 2-2V8H5V20zM8 10h8c0.6 0 1 0.4 1 1s-0.4 1-1 1H8c-0.6 0-1-0.4-1-1s0.4-1 1-1z"/></svg>`
        },
        {
            value: 'companion',
            name: 'Companion',
            icon: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/><circle cx="8.5" cy="10.5" r="1.5"/><circle cx="15.5" cy="10.5" r="1.5"/><path d="M12 16c-1.48 0-2.75-.81-3.45-2h6.9c-.7 1.19-1.97 2-3.45 2z"/></svg>`
        }
    ];
    
    // Initial setup with current selection
    updateModelTypeDisplay(selectInput.value, modelTypes);
    
    // Create dropdown options
    populateDropdown(dropdown, modelTypes, selectInput.value);
    
    // Add click listeners
    selectorDisplay.addEventListener('click', () => {
        selectorDisplay.classList.toggle('active');
        dropdown.classList.toggle('visible');
    });
    
    // Close the dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!selectorDisplay.contains(event.target) && !dropdown.contains(event.target)) {
            selectorDisplay.classList.remove('active');
            dropdown.classList.remove('visible');
        }
    });
    
    // Add event listeners to options
    dropdown.querySelectorAll('.model-type-option').forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            
            // Update the actual select input
            selectInput.value = value;
            
            // Update the display
            updateModelTypeDisplay(value, modelTypes);
            
            // Update selected state in dropdown
            dropdown.querySelectorAll('.model-type-option').forEach(opt => {
                if (opt.getAttribute('data-value') === value) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
            
            // Close dropdown
            selectorDisplay.classList.remove('active');
            dropdown.classList.remove('visible');
            
            // Trigger change event on the select
            const event = new Event('change');
            selectInput.dispatchEvent(event);
        });
    });
    
    // Hide the original select element
    selectInput.style.display = 'none';
}

// Update the display with the selected model type
function updateModelTypeDisplay(value, modelTypes) {
    const display = document.querySelector('.model-type-display');
    if (!display) return;
    
    const modelType = modelTypes.find(type => type.value === value) || modelTypes[0];
    
    const iconContainer = display.querySelector('.model-type-icon');
    
    if (iconContainer) iconContainer.innerHTML = modelType.icon;
}

// Create dropdown options
function populateDropdown(dropdown, modelTypes, selectedValue) {
    dropdown.innerHTML = '';
    
    modelTypes.forEach(type => {
        const option = document.createElement('div');
        option.className = 'model-type-option';
        if (type.value === selectedValue) option.classList.add('selected');
        option.setAttribute('data-value', type.value);
        
        option.innerHTML = `
            <div class="model-type-icon">${type.icon}</div>
            <div class="model-type-name">${type.name}</div>
        `;
        
        dropdown.appendChild(option);
    });
}

// Create the HTML structure for the model type selector
export function createModelTypeSelectorHTML(isPreloading = false) {
    // Only create if it doesn't already exist
    if (document.querySelector('.model-type-selector')) return;
    
    // Get the original select container
    const nameInputContainer = document.getElementById('llm-name')?.parentElement;
    if (!nameInputContainer) return;
    
    // First, adjust the HTML structure for better alignment
    if (!nameInputContainer.classList.contains('name-and-type-container')) {
        nameInputContainer.classList.add('name-and-type-container');
        
        // Extract the existing label
        const label = nameInputContainer.querySelector('label');
        
        // Create a container for the inputs
        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'inputs-container';
        
        // Move the input to the container
        const input = nameInputContainer.querySelector('input');
        if (input) {
            nameInputContainer.removeChild(input);
            inputsContainer.appendChild(input);
        }
        
        // Add the inputs container after the label
        if (label) {
            nameInputContainer.insertBefore(inputsContainer, label.nextSibling);
        } else {
            nameInputContainer.appendChild(inputsContainer);
        }
    }
    
    // Reference to the container for inputs
    const inputsContainer = nameInputContainer.querySelector('.inputs-container');
    if (!inputsContainer) return;
    
    // Create model type selector HTML
    const selectorHTML = `
        <div class="model-type-selector ${isPreloading ? 'loading' : ''}">
            <div class="model-type-display">
                <div class="model-type-icon"></div>
                <div class="model-type-arrow">
                    <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </div>
            </div>
            <div class="model-type-dropdown"></div>
        </div>
    `;
    
    // Insert the new selector at the beginning of the inputs container
    inputsContainer.insertAdjacentHTML('afterbegin', selectorHTML);
    
    // If preloading, wait until the create UI is active before revealing
    if (isPreloading) {
        setTimeout(() => {
            const selector = document.querySelector('.model-type-selector');
            if (selector) selector.classList.remove('loading');
        }, 100);
    }
}