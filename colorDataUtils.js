// Utilities for handling color data consistently across the application

// Normalize color format from any input (hex string with or without #, number, etc.)
// to a consistent hex string with # prefix
export function normalizeColorFormat(color) {
    if (!color) return "#3cb371"; // Default color if none provided
    
    if (typeof color === 'string') {
        // If it's already a hex string with #, return as is
        if (color.startsWith('#')) return color;
        // If it's a hex string without #, add it
        return '#' + color;
    }
    
    // If it's a number (like 0x3cb371), convert to hex string
    if (typeof color === 'number') {
        return '#' + color.toString(16).padStart(6, '0');
    }
    
    // Fallback to default
    return "#3cb371";
}

// Get color from llm data object with proper normalization
export function getLLMColor(llm) {
    return normalizeColorFormat(llm.color);
}

// Convert three.js color to hex string
export function threeColorToHex(threeColor) {
    if (!threeColor) return "#3cb371";
    return '#' + threeColor.getHexString();
}
