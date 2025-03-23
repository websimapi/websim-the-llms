import { llmStorage } from './llmStorage.js';

let currentLLMList = [];
let listContainer = null;

export function setupLLMListInterface() {
    const llmListUI = document.getElementById('llm-list-ui');
    
    if (!llmListUI) {
        console.error('LLM List UI element not found');
        return;
    }
    
    // Setup close button
    const closeBtn = llmListUI.querySelector('.llm-list-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            llmListUI.classList.remove('active');
        });
    }
    
    // Get list container
    listContainer = document.getElementById('llm-list-container');
    
    // Load LLMs and render list
    loadLLMList();
    
    // Setup create new LLM button
    const createNewBtn = document.getElementById('create-new-llm-btn');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            // Hide list UI and show creation UI
            llmListUI.classList.remove('active');
            document.getElementById('create-llm-ui').classList.add('active');
        });
    }
}

function loadLLMList() {
    currentLLMList = llmStorage.getAllLLMs();
    renderLLMList();
}

function renderLLMList() {
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (currentLLMList.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-llm-message';
        emptyMessage.textContent = 'No LLMs created yet. Click "Create New LLM" to get started.';
        listContainer.appendChild(emptyMessage);
        return;
    }
    
    currentLLMList.forEach(llm => {
        const llmCard = createLLMCard(llm);
        listContainer.appendChild(llmCard);
    });
}

function createLLMCard(llm) {
    const card = document.createElement('div');
    card.className = 'llm-card';
    card.dataset.id = llm.id;
    
    // Create card avatar
    const avatar = document.createElement('div');
    avatar.className = 'llm-card-avatar';
    avatar.style.backgroundColor = llm.color || '#3cb371';
    
    // Show custom avatar if available
    if (llm.customCharacterCode) {
        avatar.innerHTML = `<div class="llm-avatar-placeholder">${llm.name.charAt(0)}</div>`;
    } else {
        avatar.innerHTML = `<div class="llm-avatar-placeholder">${llm.name.charAt(0)}</div>`;
    }
    
    // Create card info
    const info = document.createElement('div');
    info.className = 'llm-card-info';
    
    const name = document.createElement('div');
    name.className = 'llm-card-name';
    name.textContent = llm.name;
    
    const model = document.createElement('div');
    model.className = 'llm-card-model';
    model.textContent = `Model: ${llm.model || 'Standard'}`;
    
    const date = document.createElement('div');
    date.className = 'llm-card-date';
    date.textContent = `Created: ${new Date(llm.createdDate).toLocaleDateString()}`;
    
    info.appendChild(name);
    info.appendChild(model);
    info.appendChild(date);
    
    // Create action buttons
    const actions = document.createElement('div');
    actions.className = 'llm-card-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'llm-card-btn edit';
    editBtn.innerHTML = '<span>Edit</span>';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editLLM(llm.id);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'llm-card-btn delete';
    deleteBtn.innerHTML = '<span>Delete</span>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteLLM(llm.id);
    });
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    // Add click event to the whole card to select the LLM
    card.addEventListener('click', () => {
        selectLLM(llm.id);
    });
    
    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(actions);
    
    return card;
}

function selectLLM(id) {
    console.log(`LLM ${id} selected`);
    // Implementation for selecting an LLM to place in the city
    document.getElementById('llm-list-ui').classList.remove('active');
    
    // Here you would add code to pass the selected LLM to the city placement system
}

function editLLM(id) {
    console.log(`Editing LLM ${id}`);
    const llm = llmStorage.getLLM(id);
    if (llm) {
        // Hide list UI
        document.getElementById('llm-list-ui').classList.remove('active');
        
        // Show creation UI with pre-filled data
        const createUI = document.getElementById('create-llm-ui');
        createUI.classList.add('active');
        
        // Pre-fill form with LLM data
        document.getElementById('llm-name').value = llm.name;
        document.getElementById('llm-model').value = llm.model;
        document.getElementById('llm-color').value = llm.color;
        document.getElementById('llm-style').value = llm.style;
        document.getElementById('llm-custom-prompt').value = llm.customPrompt || '';
        
        // Set edit mode
        createUI.dataset.editMode = 'true';
        createUI.dataset.editId = id;
    }
}

function deleteLLM(id) {
    if (confirm('Are you sure you want to delete this LLM?')) {
        llmStorage.deleteLLM(id);
        loadLLMList();
    }
}