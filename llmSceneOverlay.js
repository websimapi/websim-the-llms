// Handle scene overlay UI elements for Create LLM interface
export function setupSceneOverlays() {
    // Create the model info overlay container
    const modelInfo = document.createElement('div');
    modelInfo.className = 'scene-overlay model-info-overlay';
    
    // Add name input
    const nameField = document.createElement('div');
    nameField.className = 'model-info-field';
    
    const nameLabel = document.createElement('label');
    nameLabel.className = 'field-label';
    nameLabel.textContent = 'Name';
    nameLabel.setAttribute('for', 'scene-llm-name');
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'scene-llm-name';
    nameInput.className = 'field-value';
    nameInput.placeholder = 'Enter LLM name';
    
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInput);
    
    // Add model type select
    const modelField = document.createElement('div');
    modelField.className = 'model-info-field';
    
    const modelLabel = document.createElement('label');
    modelLabel.className = 'field-label';
    modelLabel.textContent = 'Model Type';
    modelLabel.setAttribute('for', 'scene-llm-model');
    
    const modelSelect = document.createElement('select');
    modelSelect.id = 'scene-llm-model';
    modelSelect.className = 'field-value model-select';
    
    // Add model options
    const modelOptions = [
        { value: 'assistant', text: 'Assistant' },
        { value: 'creator', text: 'Creator' },
        { value: 'researcher', text: 'Researcher' },
        { value: 'companion', text: 'Companion' }
    ];
    
    modelOptions.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        modelSelect.appendChild(optionEl);
    });
    
    modelField.appendChild(modelLabel);
    modelField.appendChild(modelSelect);
    
    // Add fields to container
    modelInfo.appendChild(nameField);
    modelInfo.appendChild(modelField);
    
    // Add to viewport
    const humanoidViewport = document.querySelector('.humanoid-viewport');
    if (humanoidViewport) {
        humanoidViewport.appendChild(modelInfo);
    }
    
    // Set up synchronization with original form fields
    syncFormFields();
}

// Synchronize the scene overlay fields with the original form fields
function syncFormFields() {
    const sceneNameInput = document.getElementById('scene-llm-name');
    const sceneModelSelect = document.getElementById('scene-llm-model');
    const sidebarNameInput = document.getElementById('llm-name');
    const sidebarModelSelect = document.getElementById('llm-model');
    
    if (!sceneNameInput || !sceneModelSelect || !sidebarNameInput || !sidebarModelSelect) {
        return;
    }
    
    // Initial values - from sidebar to scene
    sceneNameInput.value = sidebarNameInput.value;
    sceneModelSelect.value = sidebarModelSelect.value;
    
    // Update sidebar when scene values change
    sceneNameInput.addEventListener('input', () => {
        sidebarNameInput.value = sceneNameInput.value;
    });
    
    sceneModelSelect.addEventListener('change', () => {
        sidebarModelSelect.value = sceneModelSelect.value;
    });
    
    // Update scene when sidebar values change (for programmatic changes)
    sidebarNameInput.addEventListener('input', () => {
        sceneNameInput.value = sidebarNameInput.value;
    });
    
    sidebarModelSelect.addEventListener('change', () => {
        sceneModelSelect.value = sidebarModelSelect.value;
    });
}

// Load scene overlay data when editing an LLM
export function loadSceneOverlayData(llmData) {
    if (!llmData) return;
    
    const sceneNameInput = document.getElementById('scene-llm-name');
    const sceneModelSelect = document.getElementById('scene-llm-model');
    
    if (sceneNameInput && llmData.name) {
        sceneNameInput.value = llmData.name;
    }
    
    if (sceneModelSelect && llmData.model) {
        sceneModelSelect.value = llmData.model;
    }
}
