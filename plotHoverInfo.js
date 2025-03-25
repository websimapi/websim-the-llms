import * as THREE from 'three';
import { cityData } from './cityData.js';
import { safeSetEmissive } from './threeJSGlobals.js';

let raycaster, mouse, camera, scene, renderer;
let infoPanel, activePlotId;
let plots = []; // Store references to all plot groups for more efficient lookups

// Initialize hover functionality
export function initPlotHoverInfo(mainCamera, mainScene, mainRenderer) {
    // Store references
    camera = mainCamera;
    scene = mainScene;
    renderer = mainRenderer;
    
    // Create raycaster for hover detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create info panel HTML element
    createInfoPanel();
    
    // Find and store all plot objects in the scene
    collectPlots();
    
    // Add event listeners
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', hideInfoPanel);
    canvas.addEventListener('touchstart', onTouchStart); // Add touch support for mobile
    canvas.addEventListener('touchend', hideInfoPanel);
    
    // Start checking for plot hovers
    checkPlotHovers();
}

// Create the info panel HTML element
function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.className = 'plot-info-panel';
    infoPanel.style.display = 'none';
    document.body.appendChild(infoPanel);
}

// Find and store all plot objects in the scene
function collectPlots() {
    plots = [];
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot') {
            plots.push(obj);
        }
    });
}

// Handle mouse movement
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update info panel position to follow cursor
    infoPanel.style.left = `${event.clientX + 15}px`;
    infoPanel.style.top = `${event.clientY + 15}px`;
}

// Handle touch events for mobile
function onTouchStart(event) {
    if (event.touches.length === 0) return;
    
    const touch = event.touches[0];
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Position the panel a bit above the touch point to avoid finger occlusion
    infoPanel.style.left = `${touch.clientX}px`;
    infoPanel.style.top = `${touch.clientY - 120}px`; // Position above finger
    
    // Check for plot at touch position
    checkForPlotAtPointer(true); // true = is touch event
}

// Hide the info panel
function hideInfoPanel() {
    infoPanel.style.display = 'none';
    
    // Reset any highlighted plots
    if (activePlotId) {
        const activePlot = findPlotObject(activePlotId);
        if (activePlot) {
            resetPlotHighlight(activePlot);
        }
        activePlotId = null;
    }
}

// Show the info panel with plot data
function showInfoPanel(plot) {
    // Find the plot data by ID
    const plotData = cityData.lots.find(lot => lot.id === plot.userData.id);
    
    if (!plotData) return;
    
    // Update content
    infoPanel.innerHTML = `
        <div class="plot-info-header">${plotData.name}</div>
        <div class="plot-info-content">
            <div class="plot-info-row">
                <span class="plot-info-label">Size:</span>
                <span class="plot-info-value">${plotData.width}m × ${plotData.height}m</span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Type:</span>
                <span class="plot-info-value">${capitalizeFirstLetter(plotData.type)}</span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Price:</span>
                <span class="plot-info-value">$${plotData.price}</span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Status:</span>
                <span class="plot-info-value ${plotData.available ? 'available' : 'unavailable'}">
                    ${plotData.available ? 'Available' : 'Occupied'}
                </span>
            </div>
            <div class="plot-info-description">${plotData.description}</div>
        </div>
    `;
    
    // Show the panel
    infoPanel.style.display = 'block';
}

// Continuous check for plot hovers
function checkPlotHovers() {
    requestAnimationFrame(checkPlotHovers);
    
    if (!scene || !camera) return;
    
    // Only check on mousemove, not every frame for performance
    if (infoPanel.style.display === 'none' && !activePlotId) {
        return;
    }
    
    checkForPlotAtPointer();
}

// Check for plot at current pointer position
function checkForPlotAtPointer(isTouch = false) {
    // Update the picking ray
    raycaster.setFromCamera(mouse, camera);
    
    // First, do a broad test against plot group bounding boxes for efficiency
    const intersects = raycaster.intersectObjects(plots, true);
    
    if (intersects.length > 0) {
        // Determine which plot was hit (may be a child object)
        let plotObject = null;
        let plotId = null;
        
        // First try to get the userData directly from the intersected object
        if (intersects[0].object.userData && intersects[0].object.userData.type === 'lot') {
            plotObject = intersects[0].object;
            plotId = plotObject.userData.id;
        } else {
            // If the intersected object doesn't have the userData, traverse up the parent chain
            let currentObj = intersects[0].object;
            while (currentObj && !plotId) {
                if (currentObj.userData && currentObj.userData.type === 'lot') {
                    plotObject = currentObj;
                    plotId = currentObj.userData.id;
                    break;
                }
                currentObj = currentObj.parent;
            }
        }
        
        if (plotId) {
            // If we're hovering over a different plot, reset the previous one
            if (activePlotId && activePlotId !== plotId) {
                const previousPlot = findPlotObject(activePlotId);
                if (previousPlot) {
                    resetPlotHighlight(previousPlot);
                }
            }
            
            // If it's a new plot or a touch event, update the display
            if (plotId !== activePlotId || isTouch) {
                // Highlight the current plot
                highlightPlot(plotObject);
                
                // Show info panel
                showInfoPanel(plotObject);
                
                // Store current active plot ID
                activePlotId = plotId;
            }
            
            return; // Exit early
        }
    } else {
        // If no intersections, hide panel
        if (infoPanel.style.display !== 'none') {
            hideInfoPanel();
        }
    }
}

// Find a plot object by ID
function findPlotObject(id) {
    return plots.find(plot => plot.userData && plot.userData.id === id);
}

// Highlight a plot
function highlightPlot(plot) {
    // Find construction tape material
    plot.traverse(child => {
        if (child.isMesh) {
            // Store original material for reset
            if (!child.userData.originalMaterial) {
                child.userData.originalMaterial = child.material.clone();
            }
            
            // Highlight based on mesh type
            if (child.name && child.name.includes('tape')) {
                // Safely set emissive properties
                safeSetEmissive(child.material, 0xffff00);
            } else if (child.name && child.name.includes('cone')) {
                // Safely set emissive properties
                safeSetEmissive(child.material, 0xff5500, 0.5);
            } else if (child.name && child.name.includes('pole')) {
                // Safely set emissive properties
                safeSetEmissive(child.material, 0x8B4513, 0.2);
            }
        }
    });
}

// Reset plot highlight
function resetPlotHighlight(plot) {
    plot.traverse(child => {
        if (child.isMesh && child.userData.originalMaterial) {
            // Reset to original material
            if (child.material) {
                // Copy only the properties that exist on the target material
                if (child.material.color && child.userData.originalMaterial.color) {
                    child.material.color.copy(child.userData.originalMaterial.color);
                }
                if (child.material.emissive && child.userData.originalMaterial.emissive) {
                    child.material.emissive.copy(child.userData.originalMaterial.emissive);
                }
                if (child.material.emissiveIntensity !== undefined && 
                    child.userData.originalMaterial.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = child.userData.originalMaterial.emissiveIntensity;
                }
            }
        }
    });
}

// Helper to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}