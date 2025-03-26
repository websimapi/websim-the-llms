// New file for adding enhancements to the creation interface
import { setupModelTypeSelector } from './llmModelTypeSelector.js';

// Initialize UI enhancements for the LLM creation interface
export function initializeUIEnhancements() {
    // Add model type selector
    setupModelTypeSelector();
    
    // No longer need to add stylesheet, it's preloaded by setupHelpers
    // const stylesheet = document.createElement('link');
    // stylesheet.rel = 'stylesheet';
    // stylesheet.href = 'llmModelTypeSelector.css';
    // document.head.appendChild(stylesheet);
    
    // Remove this as we've restructured the HTML in the model type selector
    // const nameInputContainer = document.getElementById('llm-name').parentElement;
    // if (nameInputContainer) {
    //     nameInputContainer.style.display = 'flex';
    //     nameInputContainer.style.alignItems = 'center';
    //     nameInputContainer.style.gap = '10px';
    // }
}