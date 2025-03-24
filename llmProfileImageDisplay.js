// New file for displaying profile images in various UI locations
import { llmDataManager } from './llmDataManager.js';

// Add profile image display to the appearance section of the Create LLM UI
export function setupProfileImageInAppearance() {
    // Get the appearance section
    const appearanceSection = document.querySelector('.settings-group:nth-child(4)');
    if (!appearanceSection) return;
    
    // Check if profile image display already exists
    if (appearanceSection.querySelector('.profile-image-display')) return;
    
    // Create profile image display element
    const profileImageElement = document.createElement('div');
    profileImageElement.className = 'profile-image-display';
    profileImageElement.innerHTML = `
        <div class="profile-image-header">Profile Image</div>
        <div class="profile-image-container">
            <div class="profile-image-placeholder">No image yet. Use the camera button to create one.</div>
            <img class="profile-image" src="" alt="Profile" style="display: none;">
        </div>
    `;
    
    // Add to appearance section
    appearanceSection.appendChild(profileImageElement);
    
    // Check if we're in edit mode and have an image URL
    const editId = document.getElementById('create-llm-ui').getAttribute('data-edit-id');
    if (editId) {
        const llm = llmDataManager.getLLMById(editId);
        if (llm && llm.profileImageUrl) {
            updateProfileImageDisplay(llm.profileImageUrl);
        }
    }
    
    // Listen for profile image changes
    document.addEventListener('profileImageSaved', (e) => {
        if (e.detail && e.detail.url) {
            updateProfileImageDisplay(e.detail.url);
        }
    });
}

// Update the profile image display in the appearance section
export function updateProfileImageDisplay(imageUrl) {
    if (!imageUrl) return;
    
    const placeholder = document.querySelector('.profile-image-placeholder');
    const imageElement = document.querySelector('.profile-image');
    
    if (placeholder && imageElement) {
        placeholder.style.display = 'none';
        imageElement.src = imageUrl;
        imageElement.style.display = 'block';
    }
}

// Add profile images to the LLM list in the collection view
export function addProfileImagesToLLMList() {
    // Find all list items
    const llmItems = document.querySelectorAll('.llm-list-item');
    
    llmItems.forEach(item => {
        const id = item.getAttribute('data-id');
        if (!id) return;
        
        const llm = llmDataManager.getLLMById(id);
        if (!llm || !llm.profileImageUrl) return;
        
        // Check if image already exists
        if (item.querySelector('.llm-list-image')) return;
        
        // Create image element
        const infoElement = item.querySelector('.llm-info');
        if (!infoElement) return;
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'llm-list-image-container';
        
        const img = document.createElement('img');
        img.src = llm.profileImageUrl;
        img.alt = llm.name;
        img.className = 'llm-list-image';
        
        imgContainer.appendChild(img);
        
        // Insert before the info section
        item.insertBefore(imgContainer, infoElement);
        
        // Adjust the layout to accommodate the image
        item.classList.add('with-image');
    });
}