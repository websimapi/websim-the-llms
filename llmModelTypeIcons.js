// New file for handling model type icon badges
export function setupModelTypeBadges() {
  // Get necessary DOM elements
  const settingsGroup = document.querySelector('.settings-group:first-child');
  if (!settingsGroup) return;
  
  // Find the name input item
  const nameInputItem = settingsGroup.querySelector('.setting-item:first-child');
  if (!nameInputItem) return;
  
  // Find the model type select item
  const modelTypeItem = settingsGroup.querySelector('.setting-item:nth-child(2)');
  if (!modelTypeItem) return;
  
  // Create the compact layout container
  const compactLayout = document.createElement('div');
  compactLayout.className = 'basic-info-compact';
  
  // Create column for badges
  const badgesColumn = document.createElement('div');
  badgesColumn.className = 'model-badges-column';
  
  // Create badges container
  const badgesContainer = document.createElement('div');
  badgesContainer.className = 'model-type-badges';
  
  // Add model type badges
  badgesContainer.innerHTML = `
    <div class="model-badge" data-model="assistant">
      <div class="model-badge-tooltip">Assistant</div>
      <svg viewBox="0 0 24 24">
        <path d="M19,2H5C3.89,2 3,2.89 3,4V18C3,19.11 3.89,20 5,20H9L12,23L15,20H19C20.11,20 21,19.11 21,18V4C21,2.89 20.11,2 19,2M13,13H11V11H13V13M13,9H11V5H13V9Z"/>
      </svg>
    </div>
    <div class="model-badge" data-model="creator">
      <div class="model-badge-tooltip">Creator</div>
      <svg viewBox="0 0 24 24">
        <path d="M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M12,13C7.58,13 4,11.21 4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13M12,18C7.58,18 4,16.21 4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18Z"/>
      </svg>
    </div>
    <div class="model-badge" data-model="researcher">
      <div class="model-badge-tooltip">Researcher</div>
      <svg viewBox="0 0 24 24">
        <path d="M9.5,3C7.56,3 5.85,3.92 4.79,5.43L2,5V7H3.5V9.5H2V11.5H3.5V14H2V16H4.8C5.85,17.44 7.56,18.33 9.5,18.33C12.54,18.33 15,15.87 15,12.83V8.5C15,5.46 12.54,3 9.5,3M9.5,16.33C7,16.33 5,14.32 5,11.83V9.5C5,7 7,5 9.5,5C12,5 14,7 14,9.5V11.83C14,14.33 12,16.33 9.5,16.33M22,5V7H20.5V9.5H22V11.5H20.5V14H22V16H19.2C18.15,17.44 16.44,18.33 14.5,18.33C11.46,18.33 9,15.87 9,12.83V8.5C9,5.46 11.46,3 14.5,3C16.44,3 18.15,3.92 19.2,5.43L22,5Z"/>
      </svg>
    </div>
    <div class="model-badge" data-model="companion">
      <div class="model-badge-tooltip">Companion</div>
      <svg viewBox="0 0 24 24">
        <path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M12,13C7.58,13 4,11.21 4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13M12,18C7.58,18 4,16.21 4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18Z"/>
      </svg>
    </div>
  `;
  
  // Create column for name input
  const nameColumn = document.createElement('div');
  nameColumn.className = 'name-input-column';
  
  // Move the name input to the nameColumn
  nameColumn.appendChild(nameInputItem.cloneNode(true));
  
  // Add the columns to the compact layout
  badgesColumn.appendChild(badgesContainer);
  compactLayout.appendChild(badgesColumn);
  compactLayout.appendChild(nameColumn);
  
  // Replace the original name input item with our compact layout
  nameInputItem.parentNode.replaceChild(compactLayout, nameInputItem);
  
  // Hide the original model type select
  modelTypeItem.style.display = 'none';
  
  // Add event listeners to the badges
  const badges = badgesContainer.querySelectorAll('.model-badge');
  const modelSelect = document.getElementById('llm-model');
  
  // Set initial selection based on current select value
  if (modelSelect) {
    const currentModel = modelSelect.value;
    badges.forEach(badge => {
      if (badge.dataset.model === currentModel) {
        badge.classList.add('selected');
      }
    });
  }
  
  // Add click handlers to badges
  badges.forEach(badge => {
    badge.addEventListener('click', () => {
      // Remove selected class from all badges
      badges.forEach(b => b.classList.remove('selected'));
      
      // Add selected class to clicked badge
      badge.classList.add('selected');
      
      // Update the hidden select value
      if (modelSelect) {
        modelSelect.value = badge.dataset.model;
        
        // Trigger change event to ensure any listeners are notified
        const event = new Event('change', { bubbles: true });
        modelSelect.dispatchEvent(event);
      }
    });
  });
}