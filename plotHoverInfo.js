import * as THREE from 'three';
import { cityData } from './cityData.js';
import { safeSetEmissive } from './threeJSGlobals.js';

let raycaster, mouse, camera, scene, renderer;
let infoPanel, activePlotId;

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
    
    // Add event listeners
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', hideInfoPanel);
    
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
    
    // Update the picking ray
    raycaster.setFromCamera(mouse, camera);
    
    // Find all plot objects in the scene
    const plotObjects = [];
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot') {
            plotObjects.push(obj);
        }
    });
    
    // Find intersections with plots
    const intersects = raycaster.intersectObjects(plotObjects, true);
    
    if (intersects.length > 0) {
        // Find the actual plot parent object (not the construction tape or cones)
        let plot = intersects[0].object;
        while (plot && (!plot.userData || plot.userData.type !== 'lot')) {
            plot = plot.parent;
        }
        
        if (plot && plot.userData && plot.userData.id) {
            // If we're hovering over a different plot, reset the previous one
            if (activePlotId && activePlotId !== plot.userData.id) {
                const previousPlot = findPlotObject(activePlotId);
                if (previousPlot) {
                    resetPlotHighlight(previousPlot);
                }
            }
            
            // Highlight the current plot
            highlightPlot(plot);
            
            // Show info panel
            showInfoPanel(plot);
            
            // Store current active plot ID
            activePlotId = plot.userData.id;
            
            return; // Exit early
        }
    }
    
    // If no intersections, hide panel
    if (infoPanel.style.display !== 'none') {
        hideInfoPanel();
    }
}

// Find a plot object by ID
function findPlotObject(id) {
    let foundPlot = null;
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot' && obj.userData.id === id) {
            foundPlot = obj;
        }
    });
    return foundPlot;
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