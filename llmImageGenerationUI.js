// Adds image generation UI to the LLM creation interface
export function addImageGenerationUI(createLLMUI) {
    // Create the image generation container
    const imageGenContainer = document.createElement('div');
    imageGenContainer.className = 'settings-group image-generation-group';
    imageGenContainer.innerHTML = `
        <div class="settings-group-title">Character Portrait</div>
        <div class="setting-item">
            <div class="character-portrait-container">
                <div class="character-portrait-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#555">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <p>No portrait generated yet</p>
                </div>
                <img id="character-portrait-img" style="display: none; width: 100%; border-radius: 5px;">
            </div>
            <div class="image-generation-status" id="image-generation-status"></div>
            <button id="generate-portrait-btn" class="create-llm-button">Generate Character Portrait</button>
        </div>
    `;
    
    // Find where to insert this UI component
    const appearanceGroup = document.querySelector('.settings-group:nth-child(4)');
    if (appearanceGroup) {
        appearanceGroup.parentNode.insertBefore(imageGenContainer, appearanceGroup.nextSibling);
    } else {
        // Fallback - add at the end of sidebar
        const sidebar = document.querySelector('.create-llm-sidebar');
        if (sidebar) {
            sidebar.insertBefore(imageGenContainer, document.querySelector('.create-llm-actions'));
        }
    }
    
    // Add event listener for the generate button
    const generateBtn = document.getElementById('generate-portrait-btn');
    generateBtn.addEventListener('click', handleGeneratePortrait);
}

// Event handler for portrait generation
async function handleGeneratePortrait() {
    const generateBtn = document.getElementById('generate-portrait-btn');
    const statusElement = document.getElementById('image-generation-status');
    const portraitImage = document.getElementById('character-portrait-img');
    const portraitPlaceholder = document.querySelector('.character-portrait-placeholder');
    
    // Get the current description from the prompt field
    const description = document.getElementById('llm-custom-prompt').value.trim();
    
    if (!description) {
        statusElement.textContent = "Please provide a character description first";
        statusElement.style.color = "#ff5555";
        return;
    }
    
    // Update UI to show loading state
    generateBtn.disabled = true;
    statusElement.textContent = "Generating portrait...";
    statusElement.style.color = "#3cb371";
    
    try {
        // Import the image generator module
        const { generateLLMImage } = await import('./llmImageGenerator.js');
        
        // Generate the image
        const imageUrl = await generateLLMImage(description);
        
        if (imageUrl) {
            // Update the UI with the generated image
            portraitImage.src = imageUrl;
            portraitImage.style.display = "block";
            portraitPlaceholder.style.display = "none";
            
            // Store the image URL for saving with the LLM data
            statusElement.dataset.generatedImageUrl = imageUrl;
            statusElement.textContent = "Portrait generated successfully!";
            
            // Store the image URL on the form for collection later
            document.getElementById('create-llm-ui').dataset.portraitUrl = imageUrl;
        } else {
            statusElement.textContent = "Failed to generate portrait. Please try again.";
            statusElement.style.color = "#ff5555";
        }
    } catch (error) {
        console.error("Portrait generation error:", error);
        statusElement.textContent = "Error generating portrait: " + error.message;
        statusElement.style.color = "#ff5555";
    } finally {
        generateBtn.disabled = false;
    }
}