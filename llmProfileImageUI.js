import { captureModelSnapshot, generateProfileImage } from './llmProfileImageGenerator.js';

let lastGeneratedImageUrl = null;

// Add the camera button to the LLM creation interface
export function setupProfileImageCapture() {
    const humanoidViewport = document.querySelector('.humanoid-viewport');
    if (!humanoidViewport) return;
    
    // Create camera button
    const cameraButton = document.createElement('button');
    cameraButton.id = 'capture-profile-image';
    cameraButton.className = 'camera-button';
    cameraButton.title = 'Capture profile image';
    cameraButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" fill="currentColor"/>
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor"/>
        </svg>
    `;
    
    // Create image preview container
    const previewContainer = document.createElement('div');
    previewContainer.id = 'profile-image-preview-container';
    previewContainer.className = 'profile-image-preview-container hidden';
    
    previewContainer.innerHTML = `
        <div class="preview-header">
            <span>Profile Image</span>
            <button class="close-preview">&times;</button>
        </div>
        <div class="preview-content">
            <img id="profile-image-preview" alt="Generated profile image">
            <div class="preview-loading">
                <div class="profile-loading-spinner"></div>
                <div class="profile-loading-message">Generating image...</div>
            </div>
        </div>
        <div class="preview-actions">
            <button id="regenerate-profile-image" class="preview-button">Regenerate</button>
            <button id="save-profile-image" class="preview-button primary">Save Image</button>
        </div>
    `;
    
    // Add to viewport
    humanoidViewport.appendChild(cameraButton);
    humanoidViewport.appendChild(previewContainer);
    
    // Initialize the profile image display container
    initProfileImageDisplay();
    
    // Add click handler for camera button
    cameraButton.addEventListener('click', handleCaptureButtonClick);
    
    // Add event handlers for preview panel
    setupPreviewPanelHandlers(previewContainer);
}

// Initialize profile image display container in Basic Information section
function initProfileImageDisplay() {
    const displayContainer = document.getElementById('profile-image-display');
    if (!displayContainer) return;
    
    displayContainer.innerHTML = `
        <div class="profile-image-container">
            <img id="profile-display-image" class="profile-image" alt="LLM Profile Image">
            <div class="profile-image-loading" style="display: none;">
                <div class="loading-animation"></div>
            </div>
            <button class="remove-image-btn" title="Remove image">&times;</button>
        </div>
    `;
    
    // Add event listener to remove button
    const removeBtn = displayContainer.querySelector('.remove-image-btn');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeProfileImage();
    });
}

// Remove profile image
function removeProfileImage() {
    const displayContainer = document.getElementById('profile-image-display');
    displayContainer.classList.remove('has-image');
    
    // Clear the stored image URL
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        delete statusElement.dataset.profileImageUrl;
    }
    
    lastGeneratedImageUrl = null;
}

// Handle camera button click
async function handleCaptureButtonClick() {
    // Show loading state on button
    const button = document.getElementById('capture-profile-image');
    button.classList.add('capturing');
    
    // Show loading state in Basic Information section
    const profileDisplay = document.getElementById('profile-image-display');
    const loadingElement = profileDisplay.querySelector('.profile-image-loading');
    profileDisplay.classList.add('has-image');
    loadingElement.style.display = 'flex';
    
    // Get the description from the textarea
    const description = document.getElementById('llm-custom-prompt').value.trim() || 
                       "A 3D character model";
    
    try {
        // Access the Three.js scene, camera and renderer from the global scope
        const scene = window.currentHumanoidScene;
        const camera = window.humanoidCamera;
        const renderer = window.humanoidRenderer;
        
        if (!scene || !camera || !renderer) {
            throw new Error("3D scene not available");
        }
        
        // Capture a snapshot of the model
        const imageDataUrl = await captureModelSnapshot(scene, camera, renderer);
        
        // Show preview panel with loading state
        const previewContainer = document.getElementById('profile-image-preview-container');
        const previewImage = document.getElementById('profile-image-preview');
        const previewLoadingElement = document.querySelector('.preview-loading');
        
        previewContainer.classList.remove('hidden');
        previewImage.style.display = 'none';
        previewLoadingElement.style.display = 'flex';
        
        // Generate profile image
        const result = await generateProfileImage(imageDataUrl, description);
        
        // Update the UI based on result
        if (result.success) {
            // Update preview
            previewImage.src = result.url;
            previewImage.style.display = 'block';
            lastGeneratedImageUrl = result.url;
            
            // Update display in Basic Information section
            const displayImage = document.getElementById('profile-display-image');
            displayImage.src = result.url;
            profileDisplay.classList.add('has-image');
            
            // Store the image URL on the form for later saving
            const statusElement = document.getElementById('generation-status');
            if (statusElement) {
                statusElement.dataset.profileImageUrl = result.url;
            }
        } else {
            // Handle error
            showGenerationError(result.error);
        }
    } catch (error) {
        console.error("Error capturing model:", error);
        showGenerationError(error.message);
    } finally {
        // Hide loading states
        button.classList.remove('capturing');
        document.querySelector('.preview-loading').style.display = 'none';
        profileDisplay.querySelector('.profile-image-loading').style.display = 'none';
    }
}

// Set up event handlers for the preview panel
function setupPreviewPanelHandlers(container) {
    // Close button
    const closeButton = container.querySelector('.close-preview');
    closeButton.addEventListener('click', () => {
        container.classList.add('hidden');
    });
    
    // Regenerate button
    const regenerateButton = document.getElementById('regenerate-profile-image');
    regenerateButton.addEventListener('click', handleCaptureButtonClick);
    
    // Save button updates the form data but doesn't close the panel
    const saveButton = document.getElementById('save-profile-image');
    saveButton.addEventListener('click', () => {
        // Simply store the current image URL in the form data
        // It will be saved with the LLM when the Create/Save button is clicked
        container.classList.add('saved');
        setTimeout(() => container.classList.remove('saved'), 1000);
        
        // Update display in Basic Information section
        const profileDisplay = document.getElementById('profile-image-display');
        const displayImage = document.getElementById('profile-display-image');
        
        if (lastGeneratedImageUrl) {
            displayImage.src = lastGeneratedImageUrl;
            profileDisplay.classList.add('has-image');
        }
    });
}

// Show error in the preview panel
function showGenerationError(message) {
    const previewImage = document.getElementById('profile-image-preview');
    previewImage.style.display = 'none';
    
    const loadingElement = document.querySelector('.preview-loading');
    loadingElement.style.display = 'flex';
    loadingElement.innerHTML = `
        <div class="profile-error-message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ff4444"/>
            </svg>
            Error: ${message || "Failed to generate image"}
        </div>
    `;
    
    // Clear loading in Basic Information section
    const profileDisplay = document.getElementById('profile-image-display');
    profileDisplay.querySelector('.profile-image-loading').style.display = 'none';
    profileDisplay.classList.remove('has-image');
}