// Storage and retrieval for custom part colors
let currentPartColors = {};

// Store a color for a specific part
export function storePartColor(partId, color) {
    currentPartColors[partId] = color;
}

// Get all stored part colors
export function getStoredPartColors() {
    return {...currentPartColors};
}

// Clear all stored colors
export function clearStoredPartColors() {
    currentPartColors = {};
}

// Set part colors from existing data
export function setStoredPartColors(colors) {
    if (colors && typeof colors === 'object') {
        currentPartColors = {...colors};
    } else {
        clearStoredPartColors();
    }
}