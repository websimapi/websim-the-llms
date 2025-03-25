import * as THREE from 'three';
import { cityData } from './cityData.js';

let hoverInfoElement;
let currentHoveredPlot = null;
let raycaster;
let mouse;

// Initialize the plot hover UI system
export function initPlotHoverUI(camera, renderer, scene) {
    // Create hover info element
    createHoverInfoElement();
    
    // Initialize raycaster for detecting hover
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Add event listeners
    const rendererDom = renderer.domElement;
    rendererDom.addEventListener('mousemove', onMouseMove);
    
    // Store camera and scene for raycasting
    plotHoverUI.camera = camera;
    plotHoverUI.renderer = renderer;
    plotHoverUI.scene = scene;
}

// Create the hover info UI element
function createHoverInfoElement() {
    hoverInfoElement = document.createElement('div');
    hoverInfoElement.className = 'plot-hover-info';
    hoverInfoElement.innerHTML = `
        <div class="plot-hover-header">
            <h3 class="plot-hover-title">Plot Name</h3>
            <span class="plot-hover-id">ID: 0</span>
        </div>
        <div class="plot-hover-details">
            <div class="plot-hover-detail">
                <span class="detail-label">Size:</span>
                <span class="detail-value size-value">0m × 0m</span>
            </div>
            <div class="plot-hover-detail">
                <span class="detail-label">Type:</span>
                <span class="detail-value type-value">Unknown</span>
            </div>
            <div class="plot-hover-detail">
                <span class="detail-label">Price:</span>
                <span class="detail-value price-value">$0</span>
            </div>
            <div class="plot-hover-detail">
                <span class="detail-label">Status:</span>
                <span class="detail-value status-value">Unknown</span>
            </div>
        </div>
        <div class="plot-hover-description">No description available</div>
        <div class="plot-hover-occupant hidden">
            <div class="occupant-header">Current Resident</div>
            <div class="occupant-name">None</div>
        </div>
    `;
    
    // Initially hidden
    hoverInfoElement.style.display = 'none';
    
    // Add to body
    document.body.appendChild(hoverInfoElement);
}

// Handle mouse movement to detect plot hovering
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const canvas = plotHoverUI.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster with the mouse position and camera
    raycaster.setFromCamera(mouse, plotHoverUI.camera);
    
    // Find all objects intersecting the ray
    const intersects = raycaster.intersectObjects(plotHoverUI.scene.children, true);
    
    // Check if we're hovering over a plot
    let isHoveringPlot = false;
    
    for (let i = 0; i < intersects.length; i++) {
        // Traverse up the object hierarchy to find parent with plot data
        let currentObj = intersects[i].object;
        while (currentObj && (!currentObj.userData || !currentObj.userData.type || currentObj.userData.type !== 'lot')) {
            currentObj = currentObj.parent;
        }
        
        // If we found a plot, show its info
        if (currentObj && currentObj.userData && currentObj.userData.type === 'lot') {
            const plotId = currentObj.userData.id;
            if (plotId !== currentHoveredPlot) {
                currentHoveredPlot = plotId;
                updateHoverInfo(plotId);
            }
            
            // Position the hover info near the mouse
            positionHoverInfo(event.clientX, event.clientY);
            isHoveringPlot = true;
            break;
        }
    }
    
    // Hide the info if not hovering a plot
    if (!isHoveringPlot) {
        hideHoverInfo();
    }
}

// Update the hover info with plot data
function updateHoverInfo(plotId) {
    // Get plot data
    const plotData = cityData.lots.find(lot => lot.id === plotId);
    if (!plotData) return;
    
    // Update UI elements
    hoverInfoElement.querySelector('.plot-hover-title').textContent = plotData.name;
    hoverInfoElement.querySelector('.plot-hover-id').textContent = `ID: ${plotData.id}`;
    hoverInfoElement.querySelector('.size-value').textContent = `${plotData.width}m × ${plotData.height}m`;
    hoverInfoElement.querySelector('.type-value').textContent = capitalizeFirstLetter(plotData.type || 'Unknown');
    hoverInfoElement.querySelector('.price-value').textContent = `$${plotData.price}`;
    hoverInfoElement.querySelector('.status-value').textContent = plotData.available ? 'Available' : 'Occupied';
    hoverInfoElement.querySelector('.plot-hover-description').textContent = plotData.description || 'No description available';
    
    // Check if the plot has an occupant
    const occupantSection = hoverInfoElement.querySelector('.plot-hover-occupant');
    const occupantName = hoverInfoElement.querySelector('.occupant-name');
    
    if (plotData.occupant) {
        occupantSection.classList.remove('hidden');
        occupantName.textContent = plotData.occupant.name || 'Unknown';
    } else {
        occupantSection.classList.add('hidden');
        occupantName.textContent = 'None';
    }
    
    // Show the info
    hoverInfoElement.style.display = 'block';
}

// Position the hover info element near the mouse
function positionHoverInfo(x, y) {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get info element dimensions
    const infoWidth = hoverInfoElement.offsetWidth;
    const infoHeight = hoverInfoElement.offsetHeight;
    
    // Default position: to the right of cursor
    let posX = x + 20;
    let posY = y - infoHeight / 2;
    
    // Check if info would go off-screen to the right
    if (posX + infoWidth > viewportWidth) {
        posX = x - infoWidth - 20; // Position to the left of cursor
    }
    
    // Check if info would go off-screen at the top or bottom
    if (posY < 10) {
        posY = 10;
    } else if (posY + infoHeight > viewportHeight - 10) {
        posY = viewportHeight - infoHeight - 10;
    }
    
    // Apply the position
    hoverInfoElement.style.left = `${posX}px`;
    hoverInfoElement.style.top = `${posY}px`;
}

// Hide the hover info
function hideHoverInfo() {
    hoverInfoElement.style.display = 'none';
    currentHoveredPlot = null;
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Export the plotHoverUI object for global access
export const plotHoverUI = {
    init: initPlotHoverUI,
    scene: null,
    camera: null,
    renderer: null
};