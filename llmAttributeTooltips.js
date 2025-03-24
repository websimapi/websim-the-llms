// Enhance attribute tooltips and UI optimization for desktop
export function setupAttributeTooltips() {
    // Apply tooltips to attribute items
    document.querySelectorAll('.attribute-item').forEach(item => {
        const attributeName = item.querySelector('.attribute-name').textContent;
        const attributeDescription = item.querySelector('.attribute-description').textContent;
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'attribute-tooltip';
        tooltip.textContent = attributeDescription;
        
        // Add tooltip to item
        item.appendChild(tooltip);
    });
}

// Adjust UI height to prevent scrolling when possible
export function optimizeUIHeight() {
    const createLLMUI = document.getElementById('create-llm-ui');
    const sidebar = document.querySelector('.create-llm-sidebar');
    
    // Only run on desktop
    if (window.innerWidth <= 768) return;
    
    // Get all settings groups
    const settingsGroups = sidebar.querySelectorAll('.settings-group');
    
    // Check if we need to apply compact mode
    const sidebarHeight = sidebar.scrollHeight;
    const viewportHeight = window.innerHeight;
    
    if (sidebarHeight > viewportHeight) {
        createLLMUI.classList.add('compact-mode');
    } else {
        createLLMUI.classList.remove('compact-mode');
    }
}