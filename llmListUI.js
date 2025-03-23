import { llmStorage } from './llmStorage.js';

export function setupLLMListUI() {
    const llmListUI = document.getElementById('llm-list-ui');
    const closeListBtn = document.querySelector('.llm-list-close');
    const llmListContainer = document.getElementById('llm-list-container');
    
    // Close button event handler
    closeListBtn.addEventListener('click', () => {
        llmListUI.classList.remove('active');
    });
    
    // Render the list of LLMs
    renderLLMList();
    
    // Make the UI visible
    llmListUI.classList.add('active');
}

function renderLLMList() {
    const llmListContainer = document.getElementById('llm-list-container');
    const llms = llmStorage.getAllLLMs();
    
    // Clear current list
    llmListContainer.innerHTML = '';
    
    if (llms.length === 0) {
        llmListContainer.innerHTML = '<div class="llm-empty-state">No LLMs created yet. Create your first LLM!</div>';
        return;
    }
    
    // Create list items for each LLM
    llms.forEach(llm => {
        const listItem = document.createElement('div');
        listItem.className = 'llm-list-item';
        listItem.dataset.id = llm.id;
        
        const colorDot = document.createElement('div');
        colorDot.className = 'llm-color-indicator';
        colorDot.style.backgroundColor = llm.appearance.color || '#3cb371';
        
        const infoContainer = document.createElement('div');
        infoContainer.className = 'llm-info';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'llm-name';
        nameElement.textContent = llm.name;
        
        const typeElement = document.createElement('div');
        typeElement.className = 'llm-type';
        typeElement.textContent = llm.model;
        
        const statsElement = document.createElement('div');
        statsElement.className = 'llm-stats';
        
        // Get top 3 attributes
        const attributes = Object.entries(llm.attributes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        attributes.forEach(([attr, value]) => {
            const statItem = document.createElement('span');
            statItem.className = 'llm-stat-item';
            statItem.textContent = `${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${value}`;
            statsElement.appendChild(statItem);
        });
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'llm-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'llm-action-btn view';
        viewBtn.innerHTML = '<span class="material-icons">visibility</span>';
        viewBtn.title = 'View';
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewLLM(llm.id);
        });
        
        const editBtn = document.createElement('button');
        editBtn.className = 'llm-action-btn edit';
        editBtn.innerHTML = '<span class="material-icons">edit</span>';
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editLLM(llm.id);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'llm-action-btn delete';
        deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLLM(llm.id);
        });
        
        // Append all elements
        actionsContainer.appendChild(viewBtn);
        actionsContainer.appendChild(editBtn);
        actionsContainer.appendChild(deleteBtn);
        
        infoContainer.appendChild(nameElement);
        infoContainer.appendChild(typeElement);
        infoContainer.appendChild(statsElement);
        
        listItem.appendChild(colorDot);
        listItem.appendChild(infoContainer);
        listItem.appendChild(actionsContainer);
        
        // Add click handler for the whole item
        listItem.addEventListener('click', () => {
            viewLLM(llm.id);
        });
        
        llmListContainer.appendChild(listItem);
    });
}

function viewLLM(id) {
    console.log('View LLM:', id);
    // Implementation for viewing LLM details
}

function editLLM(id) {
    console.log('Edit LLM:', id);
    // Get LLM data
    const llmData = llmStorage.getLLMById(id);
    
    // Hide list UI
    document.getElementById('llm-list-ui').classList.remove('active');
    
    // Show creation UI with data pre-filled
    const createLLMUI = document.getElementById('create-llm-ui');
    createLLMUI.classList.add('active');
    
    // Will need to implement loading data into the creation UI
    // This should be implemented in llmCreationInterface.js
}

function deleteLLM(id) {
    if (confirm('Are you sure you want to delete this LLM?')) {
        llmStorage.deleteLLM(id);
        renderLLMList();
    }
}