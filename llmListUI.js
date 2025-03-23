import { llmDataManager } from './llmDataManager.js';

export function setupLLMListUI() {
    const llmListUI = document.getElementById('llm-list-ui');
    const closeListButton = document.querySelector('.llm-list-close');
    const llmListContainer = document.getElementById('llm-list-container');
    
    // Close button handler
    closeListButton.addEventListener('click', () => {
        llmListUI.classList.remove('active');
    });
    
    // Render all LLMs in the list
    renderLLMList();
    
    // Add new LLM button action
    const newLLMButton = document.getElementById('new-llm-button');
    newLLMButton.addEventListener('click', () => {
        llmListUI.classList.remove('active');
        document.getElementById('create-llm-ui').classList.add('active');
    });
}

export function renderLLMList() {
    const llmListContainer = document.getElementById('llm-list-container');
    llmListContainer.innerHTML = '';
    
    const llms = llmDataManager.getAllLLMs();
    
    if (llms.length === 0) {
        // If no LLMs, show an empty state message
        const emptyState = document.createElement('div');
        emptyState.className = 'llm-empty-state';
        emptyState.innerHTML = `
            <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
                <path d="M12,2C9.8,2,8,3.8,8,6c0,1.1,0.4,2.1,1.2,2.8C7.3,9.5,6,11.4,6,13.5V16c0,1.1,0.9,2,2,2h1v3c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1v-3h1c1.1,0,2-0.9,2-2v-2.5c0-2.1-1.3-4-3.2-4.7C17.6,8.1,18,7.1,18,6C18,3.8,16.2,2,14,2H12z" fill="currentColor"/>
            </svg>
            <p>No LLMs created yet!</p>
            <p>Click the "Create New LLM" button to get started.</p>
        `;
        llmListContainer.appendChild(emptyState);
        return;
    }
    
    // Create a card for each LLM
    llms.forEach(llm => {
        const llmCard = document.createElement('div');
        llmCard.className = 'llm-card';
        llmCard.dataset.id = llm.id;
        
        // Format creation date
        const createdDate = new Date(llm.createdAt);
        const formattedDate = createdDate.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Create the card content
        llmCard.innerHTML = `
            <div class="llm-card-header">
                <h3 class="llm-card-name">${llm.name}</h3>
                <span class="llm-card-model">${llm.modelType}</span>
            </div>
            <div class="llm-card-attributes">
                ${getTopAttributes(llm.attributes)}
            </div>
            <div class="llm-card-footer">
                <span class="llm-card-date">Created: ${formattedDate}</span>
                <div class="llm-card-actions">
                    <button class="llm-card-edit" data-id="${llm.id}">Edit</button>
                    <button class="llm-card-delete" data-id="${llm.id}">Delete</button>
                </div>
            </div>
        `;
        
        llmListContainer.appendChild(llmCard);
        
        // Add event listeners for the action buttons
        llmCard.querySelector('.llm-card-edit').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            editLLM(id);
            e.stopPropagation();
        });
        
        llmCard.querySelector('.llm-card-delete').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            deleteLLM(id);
            e.stopPropagation();
        });
        
        // Make the whole card clickable to select the LLM
        llmCard.addEventListener('click', () => {
            selectLLM(llm.id);
        });
    });
}

function getTopAttributes(attributes) {
    // Get the top 3 attributes to display in the card
    const sorted = Object.entries(attributes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    return sorted.map(([name, value]) => `
        <div class="llm-card-attribute">
            <span class="attribute-name">${name}</span>
            <div class="attribute-bar">
                <div class="attribute-fill" style="width: ${(value / 20) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

function editLLM(id) {
    // Open the creation UI with this LLM's data pre-filled
    const llm = llmDataManager.getLLMById(id);
    if (llm) {
        document.getElementById('llm-list-ui').classList.remove('active');
        const createUI = document.getElementById('create-llm-ui');
        createUI.classList.add('active');
        
        // Pre-fill the form with this LLM's data
        document.getElementById('llm-name').value = llm.name;
        document.getElementById('llm-model').value = llm.modelType;
        document.getElementById('llm-color').value = llm.color;
        document.getElementById('llm-style').value = llm.style;
        document.getElementById('llm-custom-prompt').value = llm.customPrompt || '';
        
        // Set the current editing LLM ID
        document.getElementById('create-llm-ui').dataset.editId = id;
    }
}

function deleteLLM(id) {
    if (confirm('Are you sure you want to delete this LLM?')) {
        llmDataManager.deleteLLM(id);
        renderLLMList();
    }
}

function selectLLM(id) {
    // Handle selecting an LLM for gameplay
    console.log(`Selected LLM: ${id}`);
    document.getElementById('llm-list-ui').classList.remove('active');
    // Future functionality to interact with the selected LLM
}