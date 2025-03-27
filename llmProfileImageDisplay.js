// New file for displaying profile images in various UI locations
import { llmDataManager } from './llmDataManager.js';

// Add profile image display to the basic info section of the Create LLM UI
// Modified to accept llmToEdit for direct image loading during setup
export function setupProfileImageDisplay(llmToEdit = null) {
    // Find the name input to locate the target section
    const nameInput = document.getElementById('llm-name');
    if (!nameInput) return;
    const nameSettingItem = nameInput.closest('.setting-item');
    if (!nameSettingItem) return;
    const basicInfoGroup = nameSettingItem.closest('.settings-group');
    if (!basicInfoGroup) return;

    let profileImageElement;
    // Check if profile image display already exists (within the new layout wrapper)
    const existingLayout = basicInfoGroup.querySelector('.basic-info-layout');
    if (existingLayout) {
        profileImageElement = existingLayout.querySelector('.profile-image-display');
    } else {
        // Create the layout wrapper
        const layoutWrapper = document.createElement('div');
        layoutWrapper.className = 'basic-info-layout';

        // Create profile image display element
        profileImageElement = document.createElement('div');
        profileImageElement.className = 'profile-image-display';
        profileImageElement.innerHTML = `
            <div class="profile-image-container">
                <div class="profile-image-placeholder">No image</div>
                <img class="profile-image" src="" alt="Profile" style="display: none;">
            </div>
        `;

        // Append image display and name item to the wrapper
        layoutWrapper.appendChild(profileImageElement);
        layoutWrapper.appendChild(nameSettingItem); // Move the existing name item into the wrapper

        // Insert the wrapper before where the name item originally was (or just after title)
        const titleElement = basicInfoGroup.querySelector('.settings-group-title');
        if (titleElement) {
             basicInfoGroup.insertBefore(layoutWrapper, titleElement.nextSibling);
        } else {
             basicInfoGroup.insertBefore(layoutWrapper, basicInfoGroup.firstChild); // Fallback
        }
    }

    // Use llmToEdit directly if provided, otherwise assume creating new
    const imageUrl = llmToEdit?.profileImageUrl;
    updateProfileImageDisplay(imageUrl);


    // Listen for profile image changes (ensure listener isn't duplicated)
    document.removeEventListener('profileImageSaved', handleProfileImageSaved); // Remove previous listener if any
    document.addEventListener('profileImageSaved', handleProfileImageSaved);
}

// Handler for the custom event
function handleProfileImageSaved(e) {
    if (e.detail && e.detail.url) {
        updateProfileImageDisplay(e.detail.url);
    }
}

// Update the profile image display in the appearance section
export function updateProfileImageDisplay(imageUrl) {
    // Find elements within the basic info layout
    const layout = document.querySelector('.basic-info-layout');
    if (!layout) return;

    const placeholder = layout.querySelector('.profile-image-placeholder');
    const imageElement = layout.querySelector('.profile-image');

    if (placeholder && imageElement) {
        if (imageUrl) {
            placeholder.style.display = 'none';
            imageElement.src = imageUrl;
            imageElement.style.display = 'block';
        } else {
            // Show placeholder if no image URL
            placeholder.style.display = 'flex'; // Use flex to center text
            imageElement.src = '';
            imageElement.style.display = 'none';
        }
    } else {
        // Log error if elements are not found
        console.error("Could not find profile image display elements within .basic-info-layout");
    }
}

// Add profile images to LLM list items in the collection view
export function addProfileImagesToLLMList() {
    const llmListItems = document.querySelectorAll('.llm-list-item');

    llmListItems.forEach(item => {
        const id = item.getAttribute('data-id');
        if (!id) return;

        const llm = llmDataManager.getLLMById(id);

        // Remove existing image container if present
        const existingImageContainer = item.querySelector('.llm-list-image-container');
        if (existingImageContainer) {
            item.removeChild(existingImageContainer);
            item.classList.remove('with-image'); // Remove class if image is removed
        }

        if (!llm || !llm.profileImageUrl) return; // Exit if no image URL

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

        // Get the llm-info element to insert before
        const llmInfo = item.querySelector('.llm-info');
        if (llmInfo) {
            // Insert at the beginning of the item (before llm-info)
            item.insertBefore(imageContainer, llmInfo);
        } else {
            // Fallback - insert at the beginning of the item
            item.insertBefore(imageContainer, item.firstChild);
        }
    });
}