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
}