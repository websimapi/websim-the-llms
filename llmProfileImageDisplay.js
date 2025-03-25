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

// Add profile images to LLM list items in the collection view
export function addProfileImagesToLLMList() {
    try {
        const llmListItems = document.querySelectorAll('.llm-list-item');
        
        llmListItems.forEach(item => {
            const id = item.getAttribute('data-id');
            if (!id) return;
            
            const llm = llmDataManager.getLLMById(id);
            if (!llm || !llm.profileImageUrl) return;
            
            // Check if this item already has an image container
            if (item.querySelector('.llm-list-image-container')) return;
            
            // Add 'with-image' class to the item for proper grid layout
            item.classList.add('with-image');
            
            // Create image container and image element
            const imageContainer = document.createElement('div');
            imageContainer.className = 'llm-list-image-container';
            
            const image = document.createElement('img');
            image.className = 'llm-list-image';
            image.src = llm.profileImageUrl;
            image.alt = llm.name;
            
            imageContainer.appendChild(image);
            
            // Insert at the beginning of the item
            item.insertBefore(imageContainer, item.firstChild);
        });
    } catch (error) {
        console.error('Error adding profile images to LLM list:', error);
    }
}