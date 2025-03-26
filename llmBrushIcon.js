// Handles the color picker brush icon functionality
import * as THREE from 'three';
import { applyColorToMesh } from './llmMeshColorManager.js';

let brushIconContainer;
let hiddenColorInput;
let brushTipElement;
let currentColor = '#3cb371'; // Default color

export function setupBrushIcon() {
    brushIconContainer = document.getElementById('brush-icon-container');
    if (!brushIconContainer) return;

    // Inject SVG and hidden input
    brushIconContainer.innerHTML = `
        <svg class="brush-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Brush Handle -->
            <path d="M 70 0 L 70 50 Q 70 60 60 60 L 40 60 Q 30 60 30 50 L 30 0 Z" fill="#8B4513"/>
            <!-- Metal Ferrule -->
            <rect x="25" y="55" width="50" height="15" fill="#C0C0C0" rx="2"/>
            <!-- Brush Bristles Base -->
            <path d="M 25 70 L 75 70 L 75 80 Q 50 90 25 80 Z" fill="#E0E0E0"/>
            <!-- Brush Tip (Colorable) -->
            <path id="brush-tip" d="M 25 80 Q 50 105 75 80 L 75 85 Q 50 110 25 85 Z" fill="${currentColor}"/>
        </svg>
        <input type="color" id="hidden-color-input" value="${currentColor}">
    `;

    hiddenColorInput = document.getElementById('hidden-color-input');
    brushTipElement = document.getElementById('brush-tip');

    // Event listener for the container to trigger the hidden color input
    brushIconContainer.addEventListener('click', () => {
        hiddenColorInput.click();
    });

    // Event listener for the hidden color input changing
    hiddenColorInput.addEventListener('input', (event) => {
        const newColor = event.target.value;
        setCurrentColor(newColor); // Update brush and apply to selected mesh
    });
}

// Updates the brush tip color visually and applies to selected mesh
export function setCurrentColor(color) {
    if (!color) return;
    currentColor = color;

    if (hiddenColorInput) {
        hiddenColorInput.value = color;
    }
    if (brushTipElement) {
        brushTipElement.style.fill = color;
    }

    // Apply color to the currently selected mesh (if any)
    const mesh = window.selectedMesh;
    if (mesh) {
        applyColorToMesh(mesh, color);
    }
}

// Gets the current color
export function getCurrentColor() {
    return currentColor;
}