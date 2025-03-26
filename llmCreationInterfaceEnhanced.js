// New file for adding enhancements to the creation interface
import { setupModelTypeSelector } from './llmModelTypeSelector.js';

// Initialize UI enhancements for the LLM creation interface
export function initializeUIEnhancements() {
    // Add model type selector
    setupModelTypeSelector();
    
    // Add stylesheet
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'llmModelTypeSelector.css';
    document.head.appendChild(stylesheet);
    
    // Adjust the layout of the name input field container
    const nameInputContainer = document.getElementById('llm-name').parentElement;
    if (nameInputContainer) {
        nameInputContainer.style.display = 'flex';
        nameInputContainer.style.alignItems = 'center';
        nameInputContainer.style.gap = '10px';
    }
}