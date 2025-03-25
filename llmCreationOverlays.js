// Handle the overlaid UI elements in the LLM creation view
const modelTypeIcons = {
    assistant: `<svg viewBox="0 0 24 24"><path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5.12 10.88L12 17l-1.88-4.12L6 11l4.12-1.88L12 5l1.88 4.12L18 11l-4.12 1.88z"/></svg>`,
    creator: `<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm3 9c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-3-8c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 9c0 .56-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm-12-1c.56 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-5-3c-.56 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm9 0c-.56 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`,
    researcher: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M9.5 8c.83 0 1.5.67 1.5 1.5S10.33 11 9.5 11 8 10.33 8 9.5 8.67 8 9.5 8z"/></svg>`,
    companion: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/><circle cx="9" cy="13" r="1.25"/><circle cx="15" cy="13" r="1.25"/></svg>`
};

// Create the overlay elements in the humanoid viewport
export function createNameModelOverlay() {
    const humanoidViewport = document.querySelector('.humanoid-viewport');
    if (!humanoidViewport) {
        console.error('Cannot find humanoid viewport element for overlay');
        return;
    }
    
    // Check if overlay already exists to avoid duplicates
    if (humanoidViewport.querySelector('.creation-overlay-container')) {
        return;
    }
    
    // Get current values from form
    const nameInput = document.getElementById('llm-name');
    const modelSelect = document.getElementById('llm-model');
    const colorInput = document.getElementById('llm-color');
    
    const currentName = nameInput ? nameInput.value : `LLM-${Math.floor(Math.random() * 1000)}`;
    const currentModel = modelSelect ? modelSelect.value : 'assistant';
    const currentColor = colorInput ? colorInput.value : '#3cb371';
    
    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'creation-overlay-container';
    
    // Add model type icon
    const modelTypeIcon = document.createElement('div');
    modelTypeIcon.className = 'model-type-icon';
    modelTypeIcon.innerHTML = modelTypeIcons[currentModel] || modelTypeIcons.assistant;
    modelTypeIcon.addEventListener('click', toggleModelTypeDropdown);
    
    // Add name input
    const nameInputOverlay = document.createElement('input');
    nameInputOverlay.type = 'text';
    nameInputOverlay.className = 'overlay-name-input';
    nameInputOverlay.placeholder = 'Enter LLM name';
    nameInputOverlay.value = currentName;
    
    // Add model type dropdown (initially hidden)
    const modelTypeDropdown = document.createElement('div');
    modelTypeDropdown.className = 'model-type-dropdown';
    
    // Add model options to dropdown
    const modelOptions = [
        { value: 'assistant', label: 'Assistant' },
        { value: 'creator', label: 'Creator' },
        { value: 'researcher', label: 'Researcher' },
        { value: 'companion', label: 'Companion' }
    ];
    
    modelOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = `model-type-option ${option.value === currentModel ? 'selected' : ''}`;
        optionElement.setAttribute('data-value', option.value);
        
        optionElement.innerHTML = `
            ${modelTypeIcons[option.value] || ''}
            <span class="model-type-option-text">${option.label}</span>
        `;
        
        optionElement.addEventListener('click', () => {
            selectModelType(option.value);
            toggleModelTypeDropdown();
        });
        
        modelTypeDropdown.appendChild(optionElement);
    });
    
    // Assemble elements
    overlayContainer.appendChild(modelTypeIcon);
    overlayContainer.appendChild(nameInputOverlay);
    overlayContainer.appendChild(modelTypeDropdown);
    
    // Add to humanoid viewport
    humanoidViewport.appendChild(overlayContainer);
    
    // Create the color brush overlay
    createColorBrushOverlay(humanoidViewport, currentColor);
    
    // Add click outside to close dropdown
    document.addEventListener('click', (e) => {
        if (!overlayContainer.contains(e.target)) {
            modelTypeDropdown.classList.remove('visible');
        }
    });
}

// Create color brush overlay
function createColorBrushOverlay(container, currentColor) {
    // Create color brush container
    const brushContainer = document.createElement('div');
    brushContainer.className = 'color-brush-container';
    
    // Add brush icon with the color tip
    const brushIcon = document.createElement('div');
    brushIcon.className = 'brush-icon';
    brushIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#aaaaaa">
            <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/>
        </svg>
        <div class="brush-tip" style="background-color: ${currentColor}"></div>
    `;
    
    // Add color picker
    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.className = 'color-picker-overlay';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input-overlay';
    colorInput.value = currentColor;
    
    colorPickerContainer.appendChild(colorInput);
    brushContainer.appendChild(brushIcon);
    brushContainer.appendChild(colorPickerContainer);
    
    // Add to container
    container.appendChild(brushContainer);
}

// Toggle model type dropdown visibility
function toggleModelTypeDropdown() {
    const dropdown = document.querySelector('.model-type-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('visible');
    }
}

// Select a model type
function selectModelType(modelType) {
    // Update the form select element
    const modelSelect = document.getElementById('llm-model');
    if (modelSelect) {
        modelSelect.value = modelType;
        
        // Dispatch change event to trigger any listeners
        const event = new Event('change');
        modelSelect.dispatchEvent(event);
    }
    
    // Update icon
    const modelTypeIcon = document.querySelector('.model-type-icon');
    if (modelTypeIcon) {
        modelTypeIcon.innerHTML = modelTypeIcons[modelType] || modelTypeIcons.assistant;
    }
    
    // Update selected state in dropdown
    const options = document.querySelectorAll('.model-type-option');
    options.forEach(option => {
        if (option.getAttribute('data-value') === modelType) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Update the overlay when the form changes
export function updateOverlayFromForm() {
    const nameInput = document.querySelector('.overlay-name-input');
    const modelTypeIcon = document.querySelector('.model-type-icon');
    const brushTip = document.querySelector('.brush-tip');
    const colorInputOverlay = document.querySelector('.color-input-overlay');
    
    if (nameInput) {
        nameInput.value = document.getElementById('llm-name').value;
    }
    
    const currentModel = document.getElementById('llm-model').value;
    if (modelTypeIcon) {
        modelTypeIcon.innerHTML = modelTypeIcons[currentModel] || modelTypeIcons.assistant;
    }
    
    const currentColor = document.getElementById('llm-color').value;
    if (brushTip) {
        brushTip.style.backgroundColor = currentColor;
    }
    if (colorInputOverlay) {
        colorInputOverlay.value = currentColor;
    }
    
    // Update selected option in dropdown
    const options = document.querySelectorAll('.model-type-option');
    options.forEach(option => {
        if (option.getAttribute('data-value') === currentModel) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Makes the overlay input the primary input
// while keeping hidden form inputs for data handling
export function makeOverlayInputsPrimary() {
    // Update form values when overlay inputs change
    const overlayNameInput = document.querySelector('.overlay-name-input');
    const colorInputOverlay = document.querySelector('.color-input-overlay');
    
    if (!overlayNameInput || !colorInputOverlay) {
        console.error('Overlay inputs not found');
        return;
    }
    
    // Make sure we have hidden input fields for form submission
    let nameInput = document.getElementById('llm-name');
    if (!nameInput) {
        nameInput = document.createElement('input');
        nameInput.type = 'hidden';
        nameInput.id = 'llm-name';
        document.querySelector('.create-llm-sidebar').appendChild(nameInput);
    }
        
    // Ensure the name input reflects overlay changes
    overlayNameInput.addEventListener('input', (e) => {
        nameInput.value = e.target.value;
    });
    
    // Similar setup for model type (handled by existing selectModelType function)
    
    // Make sure the main form color input is hidden but synced
    let colorInput = document.getElementById('llm-color');
    if (!colorInput) {
        colorInput = document.createElement('input');
        colorInput.type = 'hidden';
        colorInput.id = 'llm-color';
        document.querySelector('.create-llm-sidebar').appendChild(colorInput);
    }
        
    colorInputOverlay.addEventListener('input', (e) => {
        colorInput.value = e.target.value;
    });
}